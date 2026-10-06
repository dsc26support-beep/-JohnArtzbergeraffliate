# handoff: freedom-funnel-v1 (LIVE)
project: johnartzberger-affiliate
type: apps-script
updated: 2026-10-06 (session 2)
goal: Affiliate marketing web app (Apps Script + GitHub) on John Artzberger's "Free Social Funnel": short video -> bridge page -> email list -> affiliate offer. User is the affiliate.

## next-steps  <!-- resume here -->
1. PR dsc26support-beep/-JohnArtzbergeraffliate#2 (draft, docs-only handoff update) -> user marks ready + merges, or asks Claude to. Session subscribed.
2. User deletes stale branch `claude/brave-knuth-hymcnx` on GitHub (sandbox delete failed; proxy disconnect + permission check blocked investigating — do NOT retry from sandbox).
3. After PR #2 merges: user deletes `claude/epic-thompson-luf3cc`.
4. User-side setup (README "Setup"): Apps Script API, project, `clasp push`, `setup()`, deploy web app, set `webAppUrl`, GitHub secrets CLASPRC_JSON / SCRIPT_ID / DEPLOYMENT_ID.
5. After first deploy: smoke-test bridge page, `?page=go` redirect, opt-in + welcome email in real runtime.

## state
- done: v1 app merged to `main` via PR #1 (merge commit 1b019ed), at user's request. CI `test` green; `deploy` skips until secrets set.
- done: `claude/epic-thompson-luf3cc` reset to `main` (only merged history), 1 commit 90839b0 updating .handoff/20261006-1257-freedom-funnel-v1.md; PR #2 opened.
- todo: PR #2 merge; branch cleanup; Google-side setup.

## decisions
- Reused `claude/epic-thompson-luf3cc` for the note instead of deleting it: it's the only branch this session may push; never commit to `main` without OK.
- Merge method for PR #1 = merge commit (keeps history incl. orphan-main merge).
- Unsubscribed PR #1 + cancelled its check-in after merge.

## gotchas
- Sandbox git proxy drops pushes/deletes to non-designated branches ("remote end hung up").
- Real Apps Script runtime still unverified (top-frame redirect, google.script.url, html/ template paths via clasp).
- MailApp quota ~100/day on free Gmail.

## open-questions
- None blocking. Later: custom domain for bridge pages, external ESP for larger lists.
