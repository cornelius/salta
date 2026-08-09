# ADR 002: a static browser page, TypeScript, no UI framework

**Status**: accepted
**Date**: 2026-08-05

## Context

Salta is a two-player game with no hidden information, no clock, and no server
role of any kind: two people sitting at one screen take turns with one mouse. The
entire game state is thirty pieces on a hundred squares, and a turn changes one
of them.

Three things shape the choice beyond that. The artwork is line work traced from
photographs, and has to scale from a phone to a desktop without going soft. The
result should be reachable by a link, so that playing it costs nothing beyond
opening one. And two directions are wanted later but not now: a computer
opponent, and a version that runs as a desktop application.

There is also a quieter requirement. This is a keepsake, not a product. It should
still build and run in ten years from a plain checkout, which argues against
anything with a large or fashionable dependency surface.

## Alternatives considered

**A UI framework (React, Svelte, Lit).** Their value is managing change across a
large component tree. Here the entire view is one SVG element and a status panel,
and the state is a Map of thirty entries; there is no tree to manage. The cost is
real: a framework is the dependency most likely to have a breaking major version
between now and the next time anyone opens this repo, and it puts a build step
between the source and what the browser runs even for the simplest change.

**A canvas or WebGL renderer.** Correct for a game that animates continuously.
This one changes on a click. Canvas would also mean drawing the artwork twice
over -- once for the board and once for the printed rules figures -- and would give
up crisp scaling, hit testing, and accessible labels, all of which SVG has for
free.

**A native or desktop-first application (Tauri, Electron, a Qt build).** It
matches the "desktop version" wish directly, but it makes the common case -- send
someone a link -- the hard one, and it front-loads a platform decision the project
does not need to take yet. A desktop shell around a web view remains available
later at low cost, precisely because the game logic will not have to move.

**Plain JavaScript instead of TypeScript.** Tempting for a small codebase. But
the domain is full of small typed distinctions that are easy to confuse -- square
indices against row/column pairs, a player against a piece, a rank against a
count -- and those are exactly what a type checker catches for free. Types are also
the cheapest documentation of a data model reconstructed from a photograph.

## Decision

A static web page: TypeScript compiled by Vite, artwork drawn as inline SVG from
code, no UI framework, no runtime dependencies. Tests run in Vitest, with
happy-dom for the parts that touch the DOM. Formatting and linting go through
Biome, dependencies through pnpm, and the Node version is pinned with mise.
Deployment is a build of static files published to GitHub Pages.

## Rationale

Everything the game needs, the browser already does. SVG gives resolution
independence, hit testing, and accessible labels without a library; CSS gives the
one animation there is; the DOM gives the event handling. What is left is small
enough that a framework would be more code than it removes.

TypeScript earns its build step on a data model that came out of a photograph.
Vite is the smallest current thing that serves that build step and does nothing
else. Vitest shares Vite's configuration, so there is one toolchain, not two.

The two future directions both stay open, and neither influences the choice today
because both are downstream of one property: the rules are a pure module with no
knowledge of the DOM (ADR 003 [architecture]). A computer opponent is a function
from a position to a move, which needs no interface at all. A desktop build is a
shell around the same page.

## Consequences

No dependency in this project's runtime path is one that can break the game.
Anything installed is a build-time or test-time tool, replaceable without
touching a line of game code.

Rendering re-generates SVG markup as strings rather than diffing a virtual tree.
That is fine at this size and would not be at ten times it. The piece layer is
the exception and keeps one element per piece across a move, so a move can be a
slide rather than a redraw.

Serving from GitHub Pages puts the site under a path rather than at a domain
root, so the production build carries a base path. Any absolute URL written by
hand will break there; asset references go through the bundler.
