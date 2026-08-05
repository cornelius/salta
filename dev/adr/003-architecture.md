# ADR 003: four layers, and the rules know nothing about any of the others

**Status**: accepted
**Date**: 2026-08-05

## Context

The rules of Salta are the part of this project that is genuinely hard to get
right, and the only part that can be wrong in a way nobody notices. They come
from a German sheet printed in 1899 which is precise in places and silent in
others, and the two board diagrams on it are the only external check that any of
it was read correctly.

Two things the project wants later push in the same direction. A computer
opponent needs to try thousands of positions per second with no interface
attached. A desktop version needs the same game under a different shell. Both are
cheap if the rules are a pure function of a position, and expensive if the rules
have grown into the click handlers.

## Alternatives considered

**One module.** At this size it would work and would be shorter. It would also
make every rule reachable only by clicking, which is the thing to avoid: the
tests that matter here are the ones that put a position in and assert a count
out, and they must not need a DOM.

**Mutable game object with methods.** Familiar and compact. But an undo is then a
bespoke operation on the object, and this game needs one: the "Salta" call takes
back a move that has already been played. Keeping positions immutable makes that
retraction the same operation as any other -- keep the earlier value, use it -- rather
than an inverse-move routine that has to be right in its own separate way.

**Rendering inside the game state.** Tempting because a piece knows what it looks
like. It would put colours and geometry where the rules live and make the printed
figures in the rules facsimile impossible to draw from the same code, since they
are the same geometry in different ink.

## Decision

Four layers, each depending only on those above it:

- **`src/core`** -- the rules. Board geometry, the opening and target formations,
  move and jump generation, the game state machine, and the distance function the
  scoring counts in. Plain data and pure functions. Knows nothing of the DOM, of
  colours, or of language.
- **`src/render`** -- the artwork. Turns a position into SVG markup. Pure
  functions from geometry to strings. Knows the core, and knows nothing of events
  or state.
- **`src/ui`** -- the controller. Owns the DOM, the current game state, and the
  selection. The only layer that mutates anything.
- **`src/i18n`** -- the words. Message catalogues keyed by string, one per locale.

Positions are immutable: playing a move returns a new one. A game state is a
plain value, and every transition (`play`, `callSalta`, `waiveSalta`) is a
function from one to the next.

Rendering is parameterised by a palette rather than hard-coding colours, so the
board in the game and the engraved figures on the rules facsimile come out of one
drawing routine in two inks.

## Rationale

The layering exists to protect one property: **the rules can be tested without a
browser**, which is what makes it possible to check them against the printed
sheet. Two tests do exactly that -- one asserts the opening position row by row
against the Anfangsstellung diagram, the other asserts that the Schlußstellung
diagram prices out at the ten points its caption claims. Those two are the reason
to believe the rest of the rules were read correctly, and neither could exist if
the rules needed a DOM.

Immutability is not a stylistic preference here; it is what makes the Salta call
simple. The rule requires an already-played move to be taken back when the
opponent calls it, and with values that is just the previous position, held for
as long as the window is open.

One drawing routine and two palettes is what keeps the facsimile honest. If the
piece artwork changes, the figures on the rules sheet change with it, and there
is no second copy to forget.

## Consequences

The core is the natural place for a computer opponent to attach: it needs
`legalMoves` and `movesRemaining` and nothing else. No interface work is implied
by adding one.

Copying a Map of thirty entries on every move is wasted work at machine speed. If
a search engine is written, it will want an in-place make/unmake path, and adding
one is a change confined to the core.

The interface deliberately offers moves the rules forbid. A compulsory jump can
be passed over, because the printed rule is that the *opponent* catches it by
calling "Salta", not that the board prevents it. `legalMoves` is the strict set;
`offerableMoves` is the wider set the interface presents. Anything reasoning about
the game -- a computer opponent above all -- must use the strict one.

The i18n catalogues are typed off the English one, so a key missing from German
fails the type check rather than showing an English string at runtime.
