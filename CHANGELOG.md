# Changelog

All notable changes to this project are documented in this file.

## [1.0.3] - 2026-03-05

### Updated

- Upgraded runtime dependency `@hyfy/jsclient` from `^3.1.21` to `^4.0.2` (latest npm release at check time).

### Critical Findings

- Upstream stability fix identified in `@hyfy/jsclient@4.0.2`:
  - release notes and commit `70bad1a` describe a guard for worker commands before thread initialization, preventing uncaught null-dereference worker crashes.
- Local dependency audit initially reported a critical advisory in the lockfile path:
  - `GHSA-vjh7-7g9h-fjfh` via `elliptic@6.5.7` (`<=6.6.0` affected).
  - lockfile resolution was updated to `elliptic@6.6.1`, and `npm audit --omit=dev` now reports `critical: 0`.

### Notes

- Remaining advisories are non-critical (low/moderate) and should be tracked separately.

### References

- npm package metadata: https://www.npmjs.com/package/@hyfy/jsclient
- npm dist-tags API: https://registry.npmjs.org/-/package/@hyfy/jsclient/dist-tags
- release `4.0.2`: https://github.com/NaeuralEdgeProtocol/js-client/releases/tag/4.0.2
- commit `70bad1a`: https://github.com/NaeuralEdgeProtocol/js-client/commit/70bad1a345e920e335701678cdd0ca524d1c5508
- advisory `GHSA-vjh7-7g9h-fjfh`: https://github.com/advisories/GHSA-vjh7-7g9h-fjfh
