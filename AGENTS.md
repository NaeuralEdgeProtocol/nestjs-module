# AGENTS.md

## Mission

Build and maintain `@hyfy/nestjs-module` as a reliable, minimal, and well-documented NestJS adapter for `@hyfy/jsclient`.

## Architecture Snapshot

- `src/naeural.module.ts`: module registration (`register`/`registerAsync`), client creation, lifecycle hooks.
- `src/services/metadata.explorer.service.ts`: decorator metadata discovery across providers/controllers.
- `src/services/naeural.service.ts`: runtime subscription wiring and client property injection.
- `src/decorators/*`: public decorator API.
- `src/index.ts`: public export surface.
- `src/naeural.constants.ts`: metadata keys and injection tokens.

## Non-Negotiable Invariants

1. Keep ESM compatibility (`"type": "module"`, NodeNext, `.js` import suffixes in TS source).
2. Preserve `DEFAULT_CLIENT_NAME` (`naeural:client`) unless explicitly introducing a breaking release.
3. Add new metadata keys only via `src/naeural.constants.ts`.
4. Any new mapping/decorator must update all relevant layers:
   - decorator definition
   - metadata exploration
   - runtime subscription logic
   - documentation and examples
5. Application shutdown must remain safe and idempotent.

## Development Loop (Iterative Refinement)

1. Clarify objective, constraints, and risk before editing.
2. Read the exact files involved; avoid speculative changes.
3. Plan the smallest safe diff that satisfies behavior and API requirements.
4. Implement incrementally with clear boundaries.
5. Validate with lint/build/tests (or add focused checks when missing).
6. Self-review for correctness, regressions, and API stability.
7. Refine weak spots discovered during self-review.
8. Capture learnings in docs/tests so errors do not repeat.

## Self-Improvement Introspection Protocol

After each meaningful change, run this checklist:

- Correctness: Did the change preserve expected runtime behavior?
- Compatibility: Did public exports, decorators, and tokens remain stable?
- Failure modes: How does it behave on malformed metadata or shutdown errors?
- Observability: Are logs useful and not noisy?
- Simplicity: Can the same behavior be achieved with less complexity?
- Documentation: Is user-facing behavior reflected in `README.md`?

Then record a short retrospective note in the PR/commit description:

- which assumption was wrong or risky
- what signal should have caught it earlier
- what guardrail was added (test, lint rule, type tightening, docs)

## Quality Gates

Run when possible:

```bash
npm run lint
npx tsc -p tsconfig.build.json
```

For behavior changes:

- add/update tests for metadata discovery and parameter mapping order
- include at least one negative-path scenario
- if tests cannot run, explicitly state what is unverified

## Coding Standards

- Default to ASCII text unless existing files require otherwise.
- Keep comments brief and only for non-obvious logic.
- Prefer explicit types on public interfaces and exported APIs.
- Keep decorators thin; place logic in services.
- Do not silently expand side effects in bootstrap/shutdown code.

## Documentation Standards

- Update `README.md` whenever behavior, API, or usage changes.
- Keep examples aligned with actual exports and lifecycle behavior.
- Document constraints and known gaps clearly.

## Release Checklist

1. Confirm `src/index.ts` exports match intended public API.
2. Update docs for user-visible changes.
3. Validate lint/build status.
4. Confirm version bump strategy matches semver impact.
