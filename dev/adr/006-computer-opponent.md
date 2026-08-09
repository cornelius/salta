# ADR 006: a computer opponent that plays by the rules

**Status**: accepted, amended 2026-08-09 (see Amendment)
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

## Amendment, 2026-08-09: the endgame taught the evaluation to see blocking

The margin as first shipped counted steps over an empty board, and play promptly found the position that breaks it: a side wrongly packed into its home rows reads as nearly finished while no finishing move exists, every move that would open the jam costs distance now for a gain beyond the horizon, and the computer shuffled forth and back in front of its own wall.

Three changes, each answering a measured failure of the previous one. The distance is now measured around the side's own parked pieces: a path over a piece standing on its own target is charged the two moves that piece needs to step aside and back, and a target square a sibling squats on is charged the same, so backing a blocker out pays the moment it happens rather than several plies too late. Once every piece is past every enemy -- jumps are forward-only, so from then on the sides cannot touch -- the game is two independent races and minimax wastes its depth on replies that no longer matter; from there the search plans the side's own consecutive moves instead, held to a corridor a little above the starting burden, because a packing line never climbs far. And the game's positions are remembered: standing where the game has already stood is charged progressively at the root, which drains the plateaus a memoryless evaluation would circle on -- the original wedge revisited one position twenty-six times.

The evaluation is therefore no longer exactly the printed margin. It is the printed margin measured around blockages the plain count cannot see, which is the smallest departure found that makes a wedged endgame finish; `src/ai/jam.test.ts` holds a wedge that under the original evaluation shuffled forever, and holds it at the fixture size that keeps the suite quick.

The field was checked afterwards rather than before. The distance margin is the standard evaluation in the Chinese-Checkers literature, and its weakness is known there in the same terms: a single-agent abstraction that ignores the interaction between the players. The literature's remedy is a precomputed endgame database used as a lookup heuristic -- reported at 1.88 trillion positions, around half a terabyte, for the ten-piece game ([Sturtevant, UCT Enhancements in Chinese Checkers Using an Endgame Database](https://webdocs.cs.ualberta.ca/~nathanst/papers/UCT-endgame.pdf); [Challenges and Progress on Using Large Lossy Endgame Databases in Chinese Checkers](https://link.springer.com/chapter/10.1007/978-3-319-39402-2_1)) -- which would not fit here; the corridor search is a lightweight online substitute in the same role. Checking first would have confirmed the frame in minutes without changing the design.
