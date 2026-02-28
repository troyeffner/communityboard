# Versioning Policy

## Canon Versioning
- Strategy canon is versioned incrementally (`0.1`, `0.2`, `0.3`, ...).
- Any edit to `docs/strategy/*` requires bumping both `Version` and `Last Updated`.
- `Locked` means no edits without an explicit version bump.

## Canon Consistency
- JSON exports must align with the markdown canon.
- If markdown canon changes, regenerate or update related JSON exports in the same change set.
- If JSON export and markdown disagree, markdown canon is authoritative until exports are synced.
