## Agent skills

### Specification workflow

The repository-level `openspec/` directory is the source of truth for current supported behavior. Before changing Web behavior, read the relevant baseline specification and follow the root `AGENTS.md` OpenSpec workflow.

### Issue tracker

Issues and specs live as local Markdown files in `.scratch/`. See `docs/agents/issue-tracker.md`. Use `.scratch/` for issue decomposition and triage; do not treat it as a replacement for an OpenSpec baseline or change artifact.

### Triage labels

Use the default canonical triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

This repository uses a single-context domain-doc layout. See `docs/agents/domain.md`.

### Delivery reporting

For every development task, provide stage updates and a final report that states the work completed, outcomes, and elapsed time.

### UI semantics

Use `ExchangeBadge` for every mainland market marker. Strategy labels use red for positive opportunities, yellow for neutral states, and green for risks or negative states.
