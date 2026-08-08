# Salta

Salta is a board game for two, published in 1899 by Ernst Gentzensohn in Stettin.
Each player has fifteen pieces marked with suns, moons and stars, drawn up three
rows deep on a board of a hundred squares, and has to march the whole formation
across to the far side and re-form it there in the same order it set out in. It
moves like draughts and nothing is ever captured: a piece that finds an opponent
diagonally in front of it must jump over it, and both pieces stay on the board.

It was briefly a craze. Between 1900 and the First World War it won a gold medal
in Paris, drew tournaments at Monte Carlo, and was played by Sarah Bernhardt and
by Emanuel Lasker; then it vanished. `docs/history.md` has that story and what is
known about this particular set.

This is a playable reconstruction of one particular copy of that game, built from
photographs of the set: the board, the thirty pieces, and the printed rules sheet
that came in the box.

**Play it: <https://cornelius.github.io/salta/>**
**The rules as they were printed: <https://cornelius.github.io/salta/rules/>**
The same page carries the transcription and the English translation; the switch at
its top chooses, and `#de` and `#en` link straight to them.

Two players share one screen and take turns, or one player takes on the computer
at a choice of three strengths and either colour, always playing up the board.
Click a piece, then click where it should go.

## What is in here

| Path | Contents |
|---|---|
| `src/core` | The rules: geometry, formations, moves, scoring |
| `src/ai` | The computer opponent |
| `src/render` | The board, the pieces and the three devices, drawn as SVG |
| `src/ui` | The playing interface |
| `src/i18n` | English and German |
| `rules/` | The 1899 rules sheet as printed, and the readable versions beside it |
| `docs/` | The rules transcribed and translated, and where the game came from |
| `assets/` | The photographs everything was derived from |
| `dev/adr/` | Why the project looks the way it does |

## Running it

```
mise install && pnpm install
make dev
```

`make test` runs the suite, `make lint` checks formatting and types, `make build`
produces the deployable site. `make` on its own lists the targets.

## Fidelity

The reconstruction is deliberate rather than approximate.

The two pigments and the board's two square tints are measured off the
photographs, not chosen. `make colours` re-derives them, and
`dev/tools/measure-pigment.py` documents the method along with the two places
where a number is a judgement rather than a reading.

The rules were read off the sheet, and two tests hold the reading to it: one
checks the opening position row by row against the printed Anfangsstellung, the
other checks that the printed Schlußstellung scores the ten points its caption
claims. The figures on the rules page are drawn by the same code that draws the
playable board, in one ink instead of two, so they cannot fall out of step.

What the board shows by default is the edition as it was sold. This copy has been
lived with since: a later owner ruled a chess board onto the middle sixty-four
squares in red and blue crayon, and two lost pieces were replaced with discs cut
from card, their devices drawn on in crayon. **Grandma's copy** in the panel
draws the set that way instead. `dev/adr/004-the-copy-in-hand.md` says why that is
a switch rather than the picture, and how the two replaced pieces were identified.

The compulsory jump is reproduced as the sheet describes it rather than as a
program would enforce it. A player may overlook a jump; it stands unless the
opponent calls **Salta!**, which takes the move back and forces the jump. The
computer plays by the rules on both counts: it overlooks nothing, and it always
calls.

## Licence

The software, the artwork drawn for it, the transcription and the translation are
under the Apache License 2.0; see `LICENSE` and `NOTICE`. The game itself, its
1899 rules, and the artwork of the edition reconstructed here are in the public
domain. UnifrakturMaguntia, used by the rules facsimile, is under the SIL Open
Font License 1.1.
