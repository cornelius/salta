# ADR 004: the copy's own history is a mode, not the reconstruction

**Status**: accepted, amended 2026-08-07 (see Amendment)
**Date**: 2026-08-07

## Context

The photographs under `assets/` are of one physical object, and not everything they show is the 1899 edition. Two things in them happened to this copy afterwards: someone ruled a rectangle onto the board in red and blue crayon, enclosing the middle sixty-four squares to make a chess board of them, and two lost pieces were replaced with discs cut from card by hand.

The replacements are not blanks: their devices are drawn on in a crayon close to the colour the piece should have been, in the right count and arrangement, which is what makes them playable. That is on the discs but not readable in the photograph of them, and is here on the owner's account.

Both are part of what the object now is, and until now the project drew neither. The board's rectangle was named in `assets/README.md` and explicitly left out. That is a defensible reading -- it is not what Gentzensohn sold -- but it throws away evidence about the object the project exists to reconstruct, and the note saying so is the only place it survived.

## Decision

The reconstruction draws the edition as it was issued. What a later owner did to this copy is drawn only when asked for, by a switch in the panel, remembered between visits like the language.

Its colours are derived like every other colour here, by `dev/tools/measure-pigment.py` from the photographs, and its two additions are described in `src/render/theme.ts` as `OwnerMarks`, separately from the palettes, so that the palette the rules facsimile draws in cannot acquire them.

Which two pieces the card discs replace is an inference and is recorded as one. What is drawn on them would answer it, but not in the photograph there is. Counting the twenty-eight printed faces in `assets/photos/pieces-all.jpg` against the thirty a set needs leaves green's one-sun and green's three-sun, and that count is the whole of the argument.

Their crayon has no reading either, for the same reason, so it is not given a measured value: the devices are drawn in the piece's own measured pigment, laid thin. The judgement is the coverage, and it is named in `src/render/piece.ts` as one.

## Rationale

The two kinds of claim are different and should not be made in one picture. "The board is a hundred squares in two tints" is a claim about Salta; "this board has a chess frame ruled on it in crayon" is a claim about one object's later life. Drawn together and unlabelled, the second reads as the first, and someone reconstructing a set from this project would rule the rectangle on too.

Left out entirely, it is lost. A mode keeps both readable, from the same drawing code, with the difference stated in the interface rather than in a comment.

The inference about the pieces is written down because the code cannot show its own reasoning. `REPLACED` in `src/render/piece.ts` is two strings; nothing in it says they were arrived at by elimination or that a better memory than the photographs could overturn them.

## Consequences

The mode changes how the set looks and nothing about how it plays. A replacement carries the same device and count as the piece it stands in for, so it can be read and moved like any other; that is what its maker was after.

A third owner's mark, if one turns up, extends `OwnerMarks` rather than starting a new mechanism. A better photograph of the two discs would replace an inference with a reading, and both `REPLACED` and the crayon's coverage are single constants for that reason.

## Amendment, 2026-08-07: the owner has read the discs

The record above reasons from the photograph alone, because that was all there was. The owner has since read the two cards in the hand and confirms both findings: they are green's one-sun and green's three-sun, and their devices are drawn as outlines rather than filled in. The count of printed faces and the owner's reading agree, which is as good as this gets without a macro photograph of the pair.

This does not change the decision. It changes what `REPLACED` rests on, and that is worth having on the record, because a constant that has been checked against the object and one that has only been inferred from a photograph invite different treatment when the next piece of evidence turns up.
