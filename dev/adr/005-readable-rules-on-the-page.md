# ADR 005: the readable rules are the files in docs/, set on the page

**Status**: accepted
**Date**: 2026-08-07

## Context

The rules exist here three times over: as a facsimile of the 1899 sheet, in Fraktur and in the German of the day; as a transcription of that sheet in `docs/rules.de.md`; and as a translation in `docs/rules.en.md`. The facsimile is the point of the page, and it is also the version fewest people can read.

Until now the page linked the other two to their files on GitHub. A reader who could not manage the Fraktur was sent out of the site to a Markdown blob, in a repository, on a service the project does not otherwise depend on.

## Decision

The rules page shows all three, and a switch at the top chooses between them. The two readable versions are the files in `docs/`, converted to HTML at build time by a plugin in `vite.config.ts`; nothing about Markdown reaches the browser, and there is no second copy of the text to keep in step. Each has an address of its own -- `/rules/#de`, `/rules/#en` -- so a readable version can be the thing you send someone.

The note each file opens with is dropped in the conversion. It tells someone reading the repository which file is which and where the photographs are, and its links are paths; the switch says the same thing in the place where it is useful.

## Rationale

The alternative that keeps the dependency count at zero is to set both texts as HTML in the page. That is a second copy of a transcription whose whole value is that it is faithful, and the copy nobody would think to check. Between a duplicated text and one build-time dependency, the duplicate is the more expensive mistake.

ADR 002 [technology-choice] argues against a dependency surface, on the grounds that this should still build in ten years from a plain checkout. A Markdown-to-HTML converter is a modest thing to ask of that: it runs at build time only, its output is checked by looking at the page, and if it ever became unavailable, the same forty lines of plugin could call something else, or the two texts could be pasted in as the fallback this decision rejects. The test is whether the browser is asked to carry it, and it is not.

## Consequences

`docs/rules.de.md` and `docs/rules.en.md` are now published, not just repository files. Their Markdown has to render as well as it reads: the two board figures are tables, and the page styles them as such.
