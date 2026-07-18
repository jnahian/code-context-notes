---
name: release
description: Ship a new version of the Code Context Notes VS Code extension end to end — prepare and verify the changelog, dry-run the build, publish to both marketplaces (VS Code Marketplace + Open VSX), and cut the GitHub release with the VSIX attached. Use whenever the user says "release", "ship vX.Y.Z", "cut a release", "publish the extension", "do a release", or asks to tag/publish a new version. Drives the full release; confirm the version and stop at each gate.
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# Release

End-to-end release for the Code Context Notes extension. Codifies the process in
`docs/RELEASE_TEMPLATE.md` plus the operational lessons that aren't obvious from the
scripts. Four phases, run in order, with a stop-and-confirm at each gate — a release
is irreversible once published, so never blast through all four silently.

Before starting, establish the target version `X.Y.Z` (ask if not given) and confirm
all work for it is merged to `main`.

## Phase 1 — Prepare the changelog

Goal: `main` is synced, the version is bumped everywhere, and the changelog is written
in the house style.

1. `git checkout main && git pull` — release from `main`, not a feature branch.
2. Bump the version in **`package.json`** and sync **`package-lock.json`** (run `npm install` or edit both — the `version` field appears twice in the lock: top-level and `packages.""`).
3. Write `docs/changelogs/vX.Y.Z.md`. Match the **previous version's file** (e.g. `v0.2.0.md`), not just the template: sections are `### Added / ### Changed / ### Fixed / ### Testing / ### Technical`, then `---`, then the `[X.Y.Z]: https://github.com/jnahian/...` link line. No `Settings`/`Compatibility`/`Coming Next` sections — fold those into Changed/Technical. Keep it compact per `docs/changelogs/CHANGELOG_TEMPLATE.md`. Use today's date, not a placeholder.
4. Update the web changelog at `web/src/pages/ChangelogPage.tsx` — prefer the `add-web-changelog` skill, which follows `web/CHANGELOG_WEB_GUIDE.md` (insert new entry, move the "Latest" badge, pick the timeline color). The markdown changelog is the source of truth and must exist first.
5. Commit the prep. `main` has branch protection (PR + code-scanning required); a direct push only works if the user has admin **bypass**. If the push is rejected, open a PR instead — don't force it.

## Phase 2 — Test the build (dry run, no publish)

Goal: catch compile/test/packaging failures *before* anything is published or tagged.

1. `npm run compile:tsc` — must be clean.
2. `npm run test:unit` — all must pass.
3. **Dry-run the VSIX in a clean tree.** Do NOT `npm run package` in the working tree — dev-branch leftovers (`packages/`, `@jnahian/*` symlinks in `node_modules`) break vsce's `npm ls --production` dependency pruning, which either crashes the build or ships all of `node_modules` (thousands of files). Build from a throwaway worktree instead:
   ```bash
   WT=/tmp/cn-release-dry; rm -rf "$WT"
   git worktree add --detach "$WT" main    # or the vX.Y.Z tag once it exists
   ( cd "$WT" && npm ci && npm run package )
   ```
   Then sanity-check the artifact: `cd "$WT" && npx vsce ls | wc -l` should be well under ~100 files (a clean package is ~75). If it's in the thousands, the tree is polluted — stop and investigate before publishing. Remove the worktree when done: `git worktree remove --force "$WT"`.
   - Quick local fix for a polluted working tree: `npm ci` on `main` clears the stale symlinks.

Report the results (compile / tests / file count) and confirm before publishing.

## Phase 3 — Build & publish to the marketplaces

Goal: the extension is live on both registries.

1. Requires **`.env`** at the repo root with `VSCE_PAT` (VS Code Marketplace, publisher `jnahian`) and `OVSX_PAT` (Open VSX). It's gitignored. **Never print, echo, or commit these tokens.** If `.env` is missing, stop and ask the user to provide it.
2. `npm run publish` — runs `scripts/publish.mjs`: compiles, runs unit tests, packages, then publishes to the VS Code Marketplace (`vsce publish`) and Open VSX (`ovsx publish`). It does **not** create a git tag (that's Phase 4).
   - Listings: `https://marketplace.visualstudio.com/items?itemName=jnahian.code-context-notes` and `https://open-vsx.org/extension/jnahian/code-context-notes`.

## Phase 4 — Publish the GitHub release with the VSIX

Goal: an annotated tag, a GitHub release built from the changelog, and the VSIX attached.

1. Ensure the tag doesn't already exist: `git fetch --tags && git tag -l vX.Y.Z`. If it does and needs replacing, see "Tag already exists" in `docs/RELEASE_TEMPLATE.md`.
2. Create and push an annotated tag:
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z - <short title>

   <one-line highlight>

   See full changelog: docs/changelogs/vX.Y.Z.md"
   git push origin vX.Y.Z
   ```
3. Build the release VSIX from the **tag** in a clean worktree (same method as Phase 2, but check out `vX.Y.Z`). Copy the resulting `code-context-notes-X.Y.Z.vsix` into the repo root, then remove the worktree.
4. Create the release from the changelog and attach the VSIX:
   ```bash
   gh release create vX.Y.Z \
     --title "vX.Y.Z - <Release Title>" \
     --notes-file docs/changelogs/vX.Y.Z.md
   gh release upload vX.Y.Z code-context-notes-X.Y.Z.vsix
   ```
5. Confirm: `gh release view vX.Y.Z --json url,assets`. The Vercel site redeploys from `main` on its own, so the web changelog goes live without extra steps.

## Notes

- **Stop at each phase gate** and report — especially before Phase 3 (publish) and Phase 4 (tag/release), which are irreversible.
- The version already being bumped/dated (as it may be if the release PR did it) means Phase 1 is just verification — don't re-bump.
- If a marketplace publish partly fails (one registry succeeds, the other doesn't), report exactly which — don't retry the whole flow blindly, and don't re-tag.
