# Contributing to Event-Driven Orchestrator

## Development Setup

```bash
git clone https://github.com/hvilleg-dev/event-driven-orchestrator.git
cd event-driven-orchestrator
npm install
npm run dev
```

## Making Changes

1. Create feature branch: `git checkout -b feature/saga-persistence`
2. Add tests for architectural decisions
3. Ensure tests pass: `npm test`
4. Document trade-offs in ARCHITECTURE.md
5. Commit with conventional messages: `git commit -m "feat(saga): add persistence layer"`
6. Push and create PR

## Architecture Review

PRs touching core patterns require:
- [ ] Updated ARCHITECTURE.md with new ADRs
- [ ] Tests for edge cases
- [ ] Performance benchmarks if applicable
- [ ] Review from maintainers on architectural decisions
