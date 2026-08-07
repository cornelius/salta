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
| `photos/pieces-all.jpg` | All thirty pieces | Which faces survive, and the two card replacements |
| `photos/pieces-detail-a.jpg` | Several pieces, close | Device layouts per rank |
| `photos/pieces-detail-b.jpg` | Several pieces, close | Device layouts per rank |
| `photos/pieces-macro-sun-moon.jpg` | A five-sun and a four-moon piece | Sun and moon shapes, the green pigment |
| `photos/pieces-macro-star-sun.jpg` | A three-star and a one-sun piece | Star shape, the red pigment |

EXIF metadata has been stripped from all of them.

## What a later owner did to this copy

Two of the photographs show things that are not the 1899 edition but the copy's
own later life, and the rendering treats both the same way: they are left off the
reconstruction and drawn by the mode that shows the set as it now is (ADR 004
[the copy in hand]).

`photos/board.jpg` shows a rectangle ruled onto the board by hand in two crayons,
red and blue run side by side, enclosing the middle 8x8 squares -- a chess or
draughts board marked out inside the 10x10 one.

`photos/pieces-all.jpg` shows thirty pieces, of which twenty-eight carry a printed
face and two are discs cut from card by hand, with their devices drawn on in a
crayon close to the colour the piece should have been. The drawing is on the
discs; it is not legible in this photograph, which is shot from too far off and
in flat light, so the count on each one cannot be read off it. Counting the
printed faces against the thirty a set needs leaves green's one-sun and green's
three-sun. That is what the photograph gives, and the owner confirms it against
the discs themselves.

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
