# ADR 007: the game is kept in the browser between visits

**Status**: accepted
**Date**: 2026-08-09

## Context

A game of Salta is long, and the rules are a page away from the board. Going to read them, reloading, or closing the tab must not sweep the pieces off the table. There is no server to remember anything (ADR 002 [technology choice]), so whatever is kept, the browser keeps.

## Decision

After every turn the whole game -- position, whose move it is, the counts, a pending Salta window, the outcome, the tournament setting -- is written to `localStorage` as JSON in a versioned shape, and read back when the page opens. `src/ui/saved.ts` owns both directions.

Nothing read back is trusted. Every field is checked, and a game that fails any check is dropped rather than repaired; a shape with an older version number is dropped rather than migrated.

## Rationale

The write sits in the one place every change to the game passes through, the render path, so no way of changing the game needs instrumenting separately. `localStorage` is synchronous and survives the tab, and a full game state is a few kilobytes, far under any quota that matters.

Stored data outlives the code that wrote it, which is why reading is all checks: the alternative to dropping a bad game is opening on a position the board cannot draw. Dropping costs one casual game. Migration code would run almost never, which is exactly the code that rots unnoticed.

## Alternatives considered

**The address bar.** A position in the URL would make a game shareable, but the state is more than a position -- the Salta window carries the whole position the overlooked move was played from -- and writing the address on every turn churns history for a share feature nobody asked for.

**`sessionStorage`.** Dies with the tab, and closing the tab is one of the exits the game should survive.

**IndexedDB.** Asynchronous machinery built for databases; for one small value it would make opening the page wait on a transaction for nothing.

## Consequences

The stored shape is a contract with future code. A change to it means bumping the version, and every game standing in an older shape ends there; that is the deliberate price of having no migrations.

The computer's memory of repeated positions (ADR 006 [computer opponent]) is not stored. A resumed game starts that count afresh, so after a reload the recurrence charge can only be weaker than it was, never wrong.

Standing preferences -- language, opponent, colour, the copy-in-hand mode -- are stored under their own keys and are not part of the game: they survive it, and a dropped game does not reset them.
