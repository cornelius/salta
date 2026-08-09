# Architecture

Five layers. Each depends only on the ones above it, and the rules depend on
nothing. Why it is arranged this way: ADR 003 [architecture].

| Layer | Directory | Owns | May import |
|---|---|---|---|
| Rules | `src/core` | Board geometry, formations, legal moves, game state, scoring | nothing outside itself |
| Opponent | `src/ai` | Choosing the computer's move | `src/core` |
| Artwork | `src/render` | SVG for the board, the pieces, and the three devices | `src/core` |
| Interface | `src/ui` | The DOM, the current game, the current selection | all of the above |
| Words | `src/i18n` | Message catalogues, one per locale | nothing outside itself |

`src/core` holds no DOM reference, no colour, and no English. `src/render`
produces markup and never listens for an event. `src/ui` is the only place
anything mutates.

## The rules layer

| File | Owns |
|---|---|
| `types.ts` | `Player`, `Device`, `Rank`, `Piece`, `Square`, `Move` |
| `board.ts` | The 10x10 grid, which squares are playable, which way each side advances |
| `setup.ts` | `Position`, the opening formation, and where every piece has to end up |
| `rules.ts` | Move and jump generation, and applying a move |
| `distance.ts` | Shortest diagonal step counts, and the moves a side still owes |
| `game.ts` | Turns, the Salta call, the tournament limit, the outcome |

A `Position` is a `Map<Square, Piece>` and is never mutated: `applyMove` returns a
new one. A `GameState` is a plain value and every transition returns the next
one, which is what makes the Salta retraction a matter of keeping the earlier
value rather than inverting a move.

Squares are a single integer, `row * 10 + col`, with row 0 at the top of the
board as drawn and column 0 at the left. Green sits at the bottom and advances
toward row 0.

### Two sets of moves, and which to use

`legalMoves` is what the rules permit: when a jump exists anywhere, it is the only
thing allowed. `offerableMoves` is wider and includes plain moves that a
compulsory jump forbids, because the interface has to let a player overlook a
jump for the opponent to catch it. **Anything reasoning about the game rather than
presenting it -- a computer opponent above all -- uses `legalMoves`.**

## The opponent layer

`opponent.ts` is the whole of it: `chooseMove`, which searches `legalMoves` and
scores what each side still owes -- `movesRemaining`, measured around the side's
own parked pieces, because a wrongly packed home reads as nearly finished on an
empty board while no finishing move exists (ADR 006 [computer opponent],
amendment). While the sides can still meet, the search is alpha-beta minimax and
the three strengths are three depths; once every piece is past every enemy the
game is two separate races, and the search plans consecutive own moves instead.
The interface hands it every position the game has stood in, and standing there
again is charged, so trodden ground drains rather than circles. It plays
strictly by the rules on both sides of rule 3: it never overlooks a jump, and
the interface has it call "Salta" on every jump the human overlooks. Randomness
for tie-breaking is injected, so games at the board vary and games under test
replay.

## The artwork layer

`symbols.ts` draws the three devices in a 100x100 box. `piece.ts` composes a disc
and lays its devices out. `board.ts` draws the hundred squares and the frame, and
`diagramMarkup` there draws a whole position standing on them in one go -- the
figures in the rules facsimile, the target in the panel, the preview page. The
game does not use it: there a piece is an element that keeps its identity from
move to move, so that a move can be a slide rather than a redraw. Nothing here
holds state.

Colours are not written into the drawing code. Every function takes a `Palette`
from `theme.ts`, of which there are two: `SET_PALETTE` renders the set as it looks
in the hand, `PRINT_PALETTE` renders the same geometry in one ink on paper for
the figures in the rules facsimile. One drawing routine, two inks, so the
facsimile cannot drift from the board.

The colours themselves were measured off the photographs rather than picked;
`dev/tools/measure-pigment.py` derives them and documents where each number is a
reading and where it is a judgement.

`theme.ts` also carries `OwnerMarks`, which is not a palette and not part of the
edition: the crayon rectangle a later owner ruled onto this copy, and the card the
two replacement pieces were cut from. `boardMarkup` draws the rectangle when
handed the marks and `replacementMarkup` draws a disc, so the two colours reach
the drawing code without either palette knowing about them (ADR 004 [the copy in
hand]).

## The interface layer

`ui/app.ts` mounts everything into one element and keeps three things: the game
state, the selected square, and the current locale. A click resolves to a square
through a `data-square` attribute, which both the board's squares and the pieces
carry.

The board's frame and squares are drawn once. Piece elements are created once
each and keyed by piece identity, so a move is a change of transform and CSS can
slide it. Changing the locale re-renders the shell.

The panel also carries a small figure of the finished board, which is where the
order of the formation and the direction of play can be read off rather than
remembered. It is drawn once per shell, and again when the display mode changes.

Against the computer the same loop runs, with the computer's turn inserted behind
a short pause so its move reads as a turn taken; the board ignores clicks while
the computer owes one. The human always plays up the board: a human on red sees
the view turned half around, which is a remapping of piece squares alone -- the
printing is symmetric under the turn (ADR 006 [computer opponent]).

Two layout rules the panel obeys, so the board never moves under the player's
cursor: the Salta prompt keeps its space whether or not it has anything to say,
and the count columns are sized in figure widths so a growing number cannot widen
them.

## The pages

`index.html` is the game. `rules/index.html` is the facsimile of the 1899 rules
sheet, which draws its two figures from `src/render` in the print palette. Both
are Vite inputs; see `vite.config.ts`.

The rules page also carries the two readable versions, and `rules/reader.ts`
switches between the three. They are not written into the page: a plugin in
`vite.config.ts` turns `docs/rules.de.md` and `docs/rules.en.md` into HTML at
build time, so the published text and the file in `docs/` cannot differ
(ADR 005 [readable-rules-on-the-page]).
