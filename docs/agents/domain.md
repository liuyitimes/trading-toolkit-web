# Domain Docs

How engineering skills should consume this repository's domain documentation.

## Before exploring

Read relevant content from:

- `CONTEXT.md` at the repository root
- `docs/adr/`

If these files do not exist, proceed without treating that as an error. Create or update them only when domain terminology or an architectural decision is actually resolved.

## Layout

This is a single-context repository:

```text
/
|- CONTEXT.md
|- docs/adr/
`- src/
```

## Use the glossary's vocabulary

When naming a domain concept in an issue, proposal, hypothesis, or test, use the term defined in `CONTEXT.md`. If a needed concept is not present, reconsider whether existing terminology applies or record the gap for domain modeling.

## Flag ADR conflicts

When a proposed change contradicts an existing ADR, surface the conflict explicitly instead of silently overriding it.
