# ADR 001: how decisions are recorded here

**Status**: accepted
**Date**: 2026-08-05

## Context

What the code does is in the code; why it does it that way usually is not. Some decisions read the source material where more than one reading was possible -- which side sits at the bottom, how an ambiguous rule is implemented. Others, like the choice of technology or the shape of the architecture, have no source material at all. Either way, the reasoning behind a decision is lost the moment it is out of anyone's head, unless it is written down.

## Decision

Decisions live in `dev/adr/`, one per file, numbered and slugged
(`002-technology-choice.md`). Each record carries a status line, a date, and the
sections Context, Decision, Rationale, and where they earn their place,
Alternatives considered and Consequences.

A decision earns a record when **the artefact cannot tell you**: a rule the code
has to obey and could not have guessed at. Where files sit does not qualify -- the
tree says that, and a record of it goes stale as soon as anything moves.

Prose refers to a record as `ADR 003 [architecture]`, number and slug together,
so a reference is scannable.

## Consequences

A record is immutable once accepted. When a decision changes, a new record
supersedes it and the old one keeps its text with a pointer at the top; the
archive exists to answer "why was it ever that way", and only that pointer
distinguishes a dead decision from a live one.

**Amendments.** A narrow change may be recorded inside the ADR it amends -- a dated pointer in the `**Status**` line plus a dated section carrying the change -- rather than as a separate record. The amended text stays where it is, so the record still answers "why was it ever that way". Supersession always gets its own file.

Live rules do not belong here. An ADR records why a decision was taken; what the
code does now is in the code, and how to work in the repo is in `AGENTS.md`.
