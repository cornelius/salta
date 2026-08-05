# ADR 001: how decisions are recorded here

**Status**: accepted
**Date**: 2026-08-05

## Context

This project reconstructs a physical object from photographs. A lot of what the
code does is not derivable from the code: why the green side sits at the bottom,
why a colour is that exact hex, why jumps can be skipped when the rules call them
compulsory. Those answers are only in the photographs and in a German rules sheet
from 1899, and without a record they are lost the moment the reasoning is out of
anyone's head.

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

**Single-author mode.** While this project has one author and no external
consumers, a narrow amendment may be recorded inside the ADR it amends -- a dated
pointer in the `**Status**` line plus a dated section carrying the change -- rather
than as a separate record. The superseded text stays where it is; only the
amendment's location is relaxed. Supersession always gets its own file. This mode
ends at the first outside contributor, because from then on someone is relying on
these records as written.

Live rules do not belong here. An ADR records why a decision was taken; what the
code does now is in the code, and how to work in the repo is in `AGENTS.md`.
