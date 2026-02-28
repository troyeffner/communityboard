# Definition of Done

"Ship" means all of the following are true:

- Working tree is `git clean` or all intended changes are explicitly staged.
- Lint passes (`warnings acceptable`).
- Unit tests pass.
- Playwright passes, or snapshots are explicitly updated as part of the change.
- Build passes.
- Runtime smoke endpoints return HTTP `200`.
- Commit message uses an area prefix: `MKT`, `STRAT`, `UI`, or `INFRA`.
- Push is completed.
