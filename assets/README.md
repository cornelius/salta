# Source material

Photographs of a privately owned copy of the 1899 Salta set, and the font used by
the rules facsimile. Everything the code knows about the game that is not in the
1899 text was derived from these images: they are the specification, and a claim
about the set is settled by looking at them.

## Photographs

| File | Shows | Used for |
|---|---|---|
| `photos/rules-front.jpg` | Front of the rules sheet | The transcription, both board diagrams |
| `photos/rules-front-alt.jpg` | Same, second exposure | Reading passages the first shot blurred |
| `photos/rules-back.jpg` | Back of the rules sheet | The move rules, the tournament rule |
| `photos/rules-front-flat.jpg` | Front, sheet laid flat | The sheet's proportions and paper tone |
| `photos/rules-back-flat.jpg` | Back, sheet laid flat | The border ornament, the imprint |
| `photos/board.jpg` | The folding board | Square count, square colours, the frame |
| `photos/box-lid.jpg` | The box lid | Provenance |
| `photos/pieces-all.jpg` | All thirty pieces | Confirming the set is complete |
| `photos/pieces-detail-a.jpg` | Several pieces, close | Device layouts per rank |
| `photos/pieces-detail-b.jpg` | Several pieces, close | Device layouts per rank |
| `photos/pieces-macro-sun-moon.jpg` | A five-sun and a four-moon piece | Sun and moon shapes, the green pigment |
| `photos/pieces-macro-star-sun.jpg` | A three-star and a one-sun piece | Star shape, the red pigment |

EXIF metadata has been stripped from all of them.

The board photograph shows a rectangle inked onto the board by hand, enclosing
the middle 8x8 squares. That is a later addition by an owner -- it marks out a
chess or draughts board inside the 10x10 one -- and is deliberately not
reproduced in the rendering.

## What was derived, and how to redo it

`dev/tools/measure-pigment.py` reads the colours out of these photographs and
documents its method. Replacing a photograph means re-running it; the sample
coordinates in it are pixel positions in these specific images and will need
updating too.

The device shapes in `src/render/symbols.ts` were traced from the two macro
photographs. Where the original repeats a figure -- the sun's corona, the star's
points -- the geometry is computed from a count rather than transcribed, so the
numbers stay legible as numbers.

## Font

`fonts/unifraktur-maguntia.woff2` is UnifrakturMaguntia, used only by the rules
facsimile. It is licensed under the SIL Open Font License 1.1, a copy of which is
in `fonts/UnifrakturMaguntia-OFL.txt`. It is not the face the 1899 sheet was set
in; it is the closest freely licensed Fraktur available.
