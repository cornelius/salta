# ADR 006: a computer opponent that plays by the rules

**Status**: accepted
**Date**: 2026-08-08

## Context

The game so far is two people at one screen. Room for a computer opponent was left on purpose: ADR 003 keeps the rules pure so that one could attach to `legalMoves` and `movesRemaining` and nothing else, and the interface deliberately offers moves the rules forbid so that rule 3 -- the overlooked jump and the "Salta" call -- stays reachable between two humans.

Rule 3 is also where an opponent has character. The sheet phrases both halves as duties: the jump must be taken, and the opponent must call. Schubert's book (`docs/schubert-salta-1899.pdf`, p. 9) settles what happens when nobody calls -- the move stands once the opponent plays on -- which opens a tactical reading: decline a jump and hope it goes unnoticed, or waive a call whose forced jump would help the offender more than the played move.

## Decision

The opponent is `src/ai`, a layer beside the rules that imports `src/core` and nothing else. The interface asks it for a move and plays that move through the same path a click takes, so the computer's move animates like anyone else's.

It plays strictly by the rules, on both sides of rule 3: it chooses from `legalMoves`, so it never overlooks a jump, and when the human overlooks one it always calls. The tactical reading stays available between two humans, where the sheet leaves it.

The evaluation is the margin of `movesRemaining`, the number the game itself scores at the finish and at the tournament limit. The three strengths are three depths of one alpha-beta search over that margin: one ply, three, five. One ply is pure greed -- always the biggest immediate gain, blind to what it offers -- which is exactly the player Schubert's "Springenlassen" tactics are written to punish. Ties are broken by an injectable source of randomness, so games vary at the board and replay exactly under test.

The human always plays up the board. Choosing red turns the view half around in the interface alone, by remapping piece squares (`99 - sq`); the printing needs nothing, being symmetric under the turn -- the maker's mark is printed once the right way up from each seat. The core never learns the board has two seats.

## Rationale

An invented evaluation -- mobility, formation terms, hand-tuned weights -- was the alternative, and it would have made the opponent's judgement something other than the game's own. The printed points are the measure the rules already commit to, and the three arts the sheet names -- advancing, deflecting the enemy by making them jump, taking ground -- all surface from lookahead over that margin without being named in code.

Depth five costs about a quarter of a second in the worst position measured, which sits comfortably inside the pause the interface takes anyway so that the computer's move reads as a turn; no worker, no interruption machinery.

## Consequences

The strengths order themselves: in the suite, three plies beats one from either colour. Anyone wanting a stronger opponent raises a depth or teaches the search to keep in-place state, which ADR 003 already anticipates as a change confined to the core.

The Salta buttons never appear in a solo game -- the window belongs to the computer and it always calls -- so the interface voices the call instead, after the same pause, and the taken-back move slides home the way it came.
