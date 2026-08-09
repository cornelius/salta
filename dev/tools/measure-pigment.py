#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy"]
# ///
"""Measure the pigment colours of the set from the photographs in assets/photos/.

This is where the numbers in src/render/theme.ts come from. Run it against better
photographs and the values it prints replace the ones in that file.

Every sample below is a pixel position in the photographs as they stand in
assets/photos/, so a fresh set of photographs means new coordinates as well as
new values.

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
    """
    Keep only an annulus of the circle, as inner and outer share of the radius.
    The cut edge of a disc is a different tone from its face.
    """
    ring: tuple[float, float] | None = None
    """
    Follow a drawn line along the box instead of taking the box whole: "h" walks
    it column by column, "v" row by row. See `pixels_of` for why.
    """
    ridge: str | None = None
    """Which line a ridge follows: the warmer of the two, or the cooler."""
    warm: bool = True
    """Keep only the most saturated (1 - quantile) share. 0.0 keeps everything."""
    saturation_quantile: float = 0.90
    """
    Paper patch to balance this one sample against, overriding the photo's. For a
    photo lit unevenly enough that a patch across the frame is the wrong white.
    """
    reference: Box | None = None


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
        reference=(792, 792, 167, 125),
        samples=(
            Sample("red pigment", circle=(1244, 454, 227)),
            Sample("red pigment (worn disc, for comparison)", circle=(519, 448, 208)),
        ),
    ),
    Photo(
        filename="pieces-macro-sun-moon.jpg",
        reference=(792, 667, 167, 167),
        samples=(
            # Reads pinker than the device colour in theme.ts, because the red
            # pigment around it bleeds into the card. The value in theme.ts takes
            # the lightness from here and drops the bleed.
            Sample("bare card", box=(600, 292, 29, 29), saturation_quantile=0.0),
            Sample("green pigment", circle=(1200, 417, 208)),
        ),
    ),
    Photo(
        # Photographed in indoor shade with nothing neutral in frame -- the board
        # fills it and the rest is an oak floor. Hence the fixed lift.
        filename="board.jpg",
        exposure=1.55,
        samples=(
            Sample("board light square", box=(112, 737, 93, 103), saturation_quantile=0.0),
            Sample("board dark square", box=(252, 737, 103, 103), saturation_quantile=0.0),
            # The rectangle a later owner ruled onto the board runs as two
            # crayon lines side by side, red outside and blue inside. Both are
            # translucent: each reads light where it crosses a light square and
            # dark where it crosses a dark one, and a run of line crosses both.
            # The values below are therefore a line's own colour only in the
            # sense of an average over what it was drawn across.
            Sample(
                "owner's line, outer (top edge)",
                box=(345, 207, 1026, 15),
                ridge="h",
                saturation_quantile=0.5,
            ),
            Sample(
                "owner's line, inner (top edge)",
                box=(345, 220, 1026, 15),
                ridge="h",
                warm=False,
                saturation_quantile=0.5,
            ),
            Sample(
                "owner's line, outer (left edge)",
                box=(224, 616, 15, 420),
                ridge="v",
                saturation_quantile=0.5,
            ),
            Sample(
                "owner's line, inner (left edge)",
                box=(237, 616, 17, 420),
                ridge="v",
                warm=False,
                saturation_quantile=0.5,
            ),
        ),
    ),
    Photo(
        # The thirty pieces laid out on tissue paper. Two of them are blank discs
        # cut from card by hand, standing in for pieces that were lost; which two
        # they replace is settled by which faces are missing from the rest, not
        # by anything on the discs. The tissue is lit unevenly across the frame,
        # so each disc is balanced against the paper lying beside it.
        filename="pieces-all.jpg",
        reference=(1208, 771, 125, 83),
        samples=(
            Sample(
                "replacement disc, face",
                circle=(1044, 492, 36),
                ring=(0.0, 0.8),
                saturation_quantile=0.0,
                reference=(992, 542, 50, 50),
            ),
            Sample(
                "replacement disc, cut edge",
                circle=(1044, 492, 36),
                ring=(0.88, 1.0),
                saturation_quantile=0.0,
                reference=(992, 542, 50, 50),
            ),
            # Lighter than the paper the balance is anchored to, so it clips and
            # its reading is a floor rather than a colour. The pair were cut from
            # two different cards; the renderer draws both in the first one's.
            Sample(
                "replacement disc, face (the other one, clips)",
                circle=(676, 740, 31),
                ring=(0.0, 0.8),
                saturation_quantile=0.0,
                reference=(729, 708, 58, 58),
            ),
        ),
    ),
)


def srgb_to_linear(a: np.ndarray) -> np.ndarray:
    return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(a: np.ndarray) -> np.ndarray:
    return np.where(a <= 0.0031308, a * 12.92, 1.055 * a ** (1 / 2.4) - 0.055)


def as_hex(srgb: np.ndarray) -> str:
    return "#" + "".join(f"{int(round(c * 255)):02x}" for c in np.clip(srgb, 0, 1))


def linear(path: Path) -> np.ndarray:
    return srgb_to_linear(np.asarray(Image.open(path).convert("RGB"), dtype=np.float64) / 255.0)


def balanced(image: np.ndarray, photo: Photo, sample: Sample) -> np.ndarray:
    """The photo in linear light, lifted out of its own exposure and cast."""
    reference = sample.reference if sample.reference is not None else photo.reference
    if reference is not None:
        x, y, w, h = reference
        patch = np.median(image[y : y + h, x : x + w].reshape(-1, 3), axis=0)
        return image * (srgb_to_linear(PAPER_TARGET) / patch)
    if photo.exposure is not None:
        return image * photo.exposure
    raise ValueError(f"{photo.filename} gives neither a reference patch nor an exposure")


def ridge_pixels(image: np.ndarray, sample: Sample) -> np.ndarray:
    """
    The pixels of one hand-ruled line. A line is a few pixels wide and wanders by
    a few more along its length, because it was drawn against a straightedge held
    by hand, so a fixed box either loses it or takes in the card beside it. This
    walks the box across the line instead, keeping at each step the pixel where
    the wanted crayon is strongest and its two neighbours. Which crayon is wanted
    is decided by red against blue, the two being drawn side by side.
    """
    if sample.box is None:
        raise ValueError(f"sample {sample.label} gives a ridge but no box to follow it in")
    x, y, w, h = sample.box
    box = image[y : y + h, x : x + w]
    crossings = np.moveaxis(box, 1, 0) if sample.ridge == "h" else box
    kept = []
    for crossing in crossings:
        score = crossing[:, 0] - crossing[:, 2] if sample.warm else crossing[:, 2] - crossing[:, 0]
        peak = int(np.argmax(score))
        kept.append(crossing[max(0, peak - 1) : peak + 2])
    return np.concatenate(kept)


def pixels_of(image: np.ndarray, sample: Sample) -> np.ndarray:
    if sample.ridge is not None:
        return ridge_pixels(image, sample)
    if sample.circle is not None:
        cx, cy, r = sample.circle
        yy, xx = np.mgrid[0 : image.shape[0], 0 : image.shape[1]]
        # Pull the radius in by default, so the bare card of the bevelled rim
        # stays out; a ring says explicitly which part of the disc is wanted.
        inner, outer = sample.ring if sample.ring is not None else (0.0, 0.88)
        distance = (xx - cx) ** 2 + (yy - cy) ** 2
        return image[(distance >= (r * inner) ** 2) & (distance <= (r * outer) ** 2)]
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
        image = linear(path)
        print(photo.filename)
        for sample in photo.samples:
            print(f"    {sample.label:48} {measure(balanced(image, photo, sample), sample)}")
        print()


if __name__ == "__main__":
    main()
