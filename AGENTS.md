# Working in this repository

Salta, the 1899 board game, reconstructed from photographs of an original set and
playable in the browser. Two players share one screen and take turns.

## Commands

```
mise install && pnpm install    # from a fresh clone
make dev                        # dev server on http://localhost:5173
make test                       # vitest, whole suite
make lint                       # biome check + tsc --noEmit
make build                      # typecheck, then production build into dist/
make preview                    # serve the production build
```

`make lint` and `make test` must both pass before a commit.

## Docs map

| File | Answers |
|---|---|
| `README.md` | What this is and how to play it |
| `ARCHITECTURE.md` | Where code goes, what each layer owns, what may import what |
| `dev/adr/` | Why the project looks the way it does |
| `docs/rules.de.md` | The 1899 rules, transcribed |
| `docs/rules.en.md`, `docs/rules.nb.md` | The same, translated |
| `docs/history.md` | Where the game came from, and what is known about this set |
| `assets/README.md` | What each photograph shows and what was derived from it |

## The source is a physical object

The photographs under `assets/` are the specification. Anything about the game
that is not in the code came from them, and a claim about the set, the board, or
the rules is checked against them rather than reasoned out.

Two consequences that are easy to get wrong:

- **Colours are measured, not chosen.** `src/render/theme.ts` carries values
  derived by `dev/tools/measure-pigment.py`, which documents its method and marks
  where a number is a reading and where it is a judgement. Do not adjust a colour
  by eye without re-running it and saying why.
- **The rules are checked against the printed diagrams.** Two tests in
  `src/core/` assert the opening position row by row against the sheet's first
  figure, and that its second figure scores the ten points its caption claims.
  They are the reason to believe the rest of the rules were read correctly. If one
  fails, the code is wrong, not the test.

## Conventions

- **Never draw with a colour literal.** Everything in `src/render` takes a
  `Palette`, and `theme.ts` is the only file there that names a colour. Page
  chrome is a separate matter and lives in the stylesheets.
- **`src/core` imports nothing outside itself.** No DOM, no colours, no
  user-facing strings. This is what keeps the rules testable, and it is all the
  computer opponent in `src/ai` is allowed to reason over.
- **User-facing text goes through `src/i18n`.** English is the source catalogue;
  German is typed against it, so a missing key is a type error. Code itself --
  identifiers, comments, CSS classes -- is English, including in the German rules
  facsimile.
- **`legalMoves` for reasoning, `offerableMoves` for the interface.** They differ
  deliberately; ARCHITECTURE.md says why.
- Prose lines are not wrapped at 80 columns, and one paragraph is one line.

## Tests

Unit tests sit beside the code they cover, as `*.test.ts`. The core is tested as
pure functions. `src/ui/app.test.ts` drives the real interface under happy-dom by
dispatching clicks, and covers selection, the Salta call, and the language
switch.

Visual work is checked by screenshotting the dev server with headless Chrome and
looking at the result, not by reasoning about the CSS. `dev/preview.html` renders
every piece and the opening position for exactly that.
