#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
"""Measure the pigment colours of the set from the photographs in assets/photos/.

This is where the numbers in src/render/theme.ts come from. Run it against better
photographs and the values it prints replace the ones in that file.

Method, and why each step is there:

* The photographs are ordinary phone snaps, not colour-managed captures. Every
  one of them is under-exposed and carries a cast from whatever light it was
  taken in, so raw pixel values mean little on their own.
* A photo with a known-neutral patch in frame -- the tissue paper the pieces lie
  on -- is white-balanced against it in *linear* light. Scaling in gamma-encoded
  sRGB would distort the hue.
* The board photo has no such patch, so it gets a fixed exposure lift instead,
  chosen by painting candidate swatches onto the photograph and comparing them
  edge to edge against the squares around them. That is why theme.ts carries
  board colours a shade lighter than the medians below: the board is a folded
  sheet and lies unevenly, so a median over one square inherits the shading of
  wherever that square happened to fall.
* Within a disc, only the most saturated tenth of the pixels is kept. A
  125-year-old piece is worn through to the card in patches, and an average over
  the whole face drifts toward the card colour rather than the pigment. The
  saturated tenth is the pigment where it survives.

Usage:
    dev/tools/measure-pigment.py                # every sample, against assets/photos/
    dev/tools/measure-pigment.py --photos DIR   # against another directory
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image

# Aged, unbleached paper. The anchor the photos are balanced against; it is a
# judgement about the material, not a measurement, and it sets the overall
# lightness every colour below inherits.
PAPER_TARGET = np.array([0xE8, 0xE4, 0xDC]) / 255.0

Box = tuple[int, int, int, int]


@dataclass(frozen=True)
class Sample:
    label: str
    """Circle to average over, as centre x, centre y, radius in pixels."""
    circle: tuple[int, int, int] | None = None
    box: Box | None = None
    """Keep only the most saturated (1 - quantile) share. 0.0 keeps everything."""
    saturation_quantile: float = 0.90


@dataclass(frozen=True)
class Photo:
    filename: str
    samples: tuple[Sample, ...]
    """Patch of paper to balance against, as x, y, width, height."""
    reference: Box | None = None
    """
    Fixed exposure gain in linear light, for a photo with no reference patch in
    frame. Weaker evidence than a reference: the number was picked by painting
    candidate swatches onto the photograph and comparing them edge to edge.
    """
    exposure: float | None = None


PHOTOS: tuple[Photo, ...] = (
    Photo(
        filename="pieces-macro-star-sun.jpg",
        reference=(1900, 1900, 400, 300),
        samples=(
            Sample("red pigment", circle=(2985, 1090, 545)),
            Sample("red pigment (worn disc, for comparison)", circle=(1245, 1075, 500)),
        ),
    ),
    Photo(
        filename="pieces-macro-sun-moon.jpg",
        reference=(1900, 1600, 400, 400),
        samples=(
            # Reads pinker than the device colour in theme.ts, because the red
            # pigment around it bleeds into the card. The value in theme.ts takes
            # the lightness from here and drops the bleed.
            Sample("bare card", box=(1440, 700, 70, 70), saturation_quantile=0.0),
            Sample("green pigment", circle=(2880, 1000, 500)),
        ),
    ),
    Photo(
        # Photographed in indoor shade with nothing neutral in frame -- the board
        # fills it and the rest is an oak floor. Hence the fixed lift.
        filename="board.jpg",
        exposure=1.55,
        samples=(
            Sample("board light square", box=(1350, 1030, 100, 110), saturation_quantile=0.0),
            Sample("board dark square", box=(1500, 1030, 110, 110), saturation_quantile=0.0),
        ),
    ),
)


def srgb_to_linear(a: np.ndarray) -> np.ndarray:
    return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(a: np.ndarray) -> np.ndarray:
    return np.where(a <= 0.0031308, a * 12.92, 1.055 * a ** (1 / 2.4) - 0.055)


def as_hex(srgb: np.ndarray) -> str:
    return "#" + "".join(f"{int(round(c * 255)):02x}" for c in np.clip(srgb, 0, 1))


def balanced(path: Path, photo: Photo) -> np.ndarray:
    """The photo in linear light, lifted out of its own exposure and cast."""
    a = srgb_to_linear(np.asarray(Image.open(path).convert("RGB"), dtype=np.float64) / 255.0)
    if photo.reference is not None:
        x, y, w, h = photo.reference
        patch = np.median(a[y : y + h, x : x + w].reshape(-1, 3), axis=0)
        return a * (srgb_to_linear(PAPER_TARGET) / patch)
    if photo.exposure is not None:
        return a * photo.exposure
    raise ValueError(f"{photo.filename} gives neither a reference patch nor an exposure")


def pixels_of(image: np.ndarray, sample: Sample) -> np.ndarray:
    if sample.circle is not None:
        cx, cy, r = sample.circle
        yy, xx = np.mgrid[0 : image.shape[0], 0 : image.shape[1]]
        # Pull the radius in, so the bare card of the bevelled rim stays out.
        inside = (xx - cx) ** 2 + (yy - cy) ** 2 <= (r * 0.88) ** 2
        return image[inside]
    if sample.box is not None:
        x, y, w, h = sample.box
        return image[y : y + h, x : x + w].reshape(-1, 3)
    raise ValueError(f"sample {sample.label} defines neither a circle nor a box")


def measure(image: np.ndarray, sample: Sample) -> str:
    srgb = np.clip(linear_to_srgb(np.clip(pixels_of(image, sample), 0, 1)), 0, 1)
    if sample.saturation_quantile > 0:
        mx, mn = srgb.max(axis=1), srgb.min(axis=1)
        saturation = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-9), 0.0)
        srgb = srgb[saturation >= np.quantile(saturation, sample.saturation_quantile)]
    return as_hex(np.median(srgb, axis=0))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--photos",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "assets" / "photos",
        help="directory holding the photographs (default: assets/photos)",
    )
    args = parser.parse_args()

    for photo in PHOTOS:
        path = args.photos / photo.filename
        if not path.exists():
            print(f"{photo.filename}: not found under {args.photos}")
            continue
        image = balanced(path, photo)
        print(photo.filename)
        for sample in photo.samples:
            print(f"    {sample.label:44} {measure(image, sample)}")
        print()


if __name__ == "__main__":
    main()
