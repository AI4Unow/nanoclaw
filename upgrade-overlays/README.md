# Local Custom Overlay (Upgrade-Safe Workflow)

This repo tracks upstream `origin/main` from `qwibitai/nanoclaw` and applies local customizations as a replayable patch.

## Files

- `upgrade-overlays/0001-local-custom.patch`: full local customization overlay
- `scripts/apply-local-overlay.sh`: applies overlay with `git apply --3way`

## Upgrade procedure

1. `git fetch origin --prune`
2. `git checkout main`
3. `git reset --hard origin/main`
4. `./scripts/apply-local-overlay.sh`
5. `npm install`
6. `npm run build`
7. `sudo systemctl restart nanoclaw`

## Notes

- `--3way` allows patch replay even when upstream changed nearby context.
- If patch rejects occur, resolve conflicts in the reported files, then regenerate the overlay patch:
  - `git diff --binary origin/main > upgrade-overlays/0001-local-custom.patch`
  - append untracked-file diffs (if any) as needed.
