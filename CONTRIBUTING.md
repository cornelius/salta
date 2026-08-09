# Contributing

Contributions are welcome: found defects, corrections to the transcription or the translations, better history, better play. This is a spare-time project, so I read everything with interest but cannot promise if or when I will get to it; a quiet stretch means nothing has gone wrong.

Two things are worth knowing before proposing a change. The project reconstructs one physical copy of the game, and the photographs under `assets/` are its specification: a claim about the set, the board, or the rules is settled by looking at them, not by what another edition or a description elsewhere says. And the layering is deliberate: `ARCHITECTURE.md` says where code goes and what may import what, and the decisions under `dev/adr/` say why.

`make lint` and `make test` must both pass before a change is proposed. `AGENTS.md` carries the rest of the working conventions.
