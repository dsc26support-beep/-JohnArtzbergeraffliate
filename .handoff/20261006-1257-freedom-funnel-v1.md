# handoff: freedom-funnel-v1
project: johnartzberger-affiliate
type: apps-script
generated: 2026-10-06 12:57
goal: Affiliate marketing web app (Apps Script + GitHub) built on John Artzberger's "Free Social Funnel": short video -> bridge page -> email list -> affiliate offer. For the user as the affiliate.

## next-steps  <!-- resume here -->
1. Open draft PR `claude/brave-knuth-hymcnx` -> `main` (repo dsc26support-beep/-JohnArtzbergeraffliate); body = feature summary + README setup; end with Claude Code footer. Then subscribe_pr_activity.
2. Watch CI (`.github/workflows/deploy.yml` test job: `npm run check`, `npm test`).
3. User-side (manual, not doable from sandbox): enable Apps Script API, create project, `clasp push`, run `setup()`, deploy web app, set `webAppUrl` setting, add GitHub secrets CLASPRC_JSON / SCRIPT_ID / DEPLOYMENT_ID. Steps in README.md.

## state
- done: full v1 app — bridge pages, tracked redirects, 30-day content planner, 5-email sequence, dashboard, playbook, CI.
- done: `main` created as orphan base (README stub, a7d11e0), merged into feature branch (f029664, -X ours keeps full README). Both pushed.
- todo: PR not yet opened.

## changes
- A src/Code.gs — doGet router (?page=admin|bridge|go|unsub), setup(), adminApi(key, action, payload) dispatcher
- A src/Db.gs — Sheets-as-DB (SCHEMA_: Offers, Leads, Events, Content, Sequence, Settings), LockService appends
- A src/Lib.gs — pure helpers (slugify_, buildTrackingUrl_, nextDueStep_, generatePlan_, summarizeEvents_); module.exports for Node tests
- A src/{Offers,Tracking,Leads,Sequence,Content,Dashboard}.gs; src/html/{Index,App.js,Bridge,Redirect,Message,Playbook,Styles}.html
- A src/appsscript.json — V8, webapp USER_DEPLOYING + ANYONE_ANONYMOUS, scopes spreadsheets/script.send_mail/script.scriptapp
- A tests/{lib,funnel}.test.js, tests/check-syntax.js; docs/PLAYBOOK.md; README.md; .clasp.json.example (rootDir src)

## decisions
- Admin auth = secret ADMIN_KEY in Script Properties passed in URL + every adminApi call — anonymous webapp can't see user email
- All helpers end in `_` so google.script.run can't call them; public fns: doGet, include, setup, adminApi, submitLead, processSequence
- MailApp not GmailApp — narrower scope (script.send_mail)
- clasp pinned 2.4.2 in CI — stable ~/.clasprc.json format
- Bridge before offer, email captured first — core of Artzberger method
- Dashboard DOM built via textContent only (no innerHTML) — XSS safety

## verified
- works: 10/10 tests (unit + mocked end-to-end: setup -> offer -> view/click -> optin -> welcome email -> day-1 email -> unsub) — `npm test`
- works: syntax check of .gs + inline scripts — `npm run check`
- unverified: real Apps Script runtime (top-frame redirect via window.top.location, google.script.url.getLocation, html/ subfolder template names via clasp)

## gotchas
- YouTube, medium.com, 25freedomdollars.com blocked by sandbox egress; philosophy sourced from search summaries (Authority Magazine interview, LinkedIn). Playbook says "inspired by", not official.
- Redirect from sandboxed iframe may be blocked; Continue button fallback exists in Bridge.html/Redirect.html
- MailApp quota ~100/day free Gmail; processSequence stops at quota
- funnel.test.js compares VM-realm arrays via JSON.stringify (deepStrictEqual fails cross-realm)

## git
- branch: claude/brave-knuth-hymcnx (also `main`)
- uncommitted: .handoff/ only
- recent: f029664 merge main base; a7d11e0 initial commit (main); f1dd1a8 add Freedom Funnel app

## open-questions
- None blocking. Later ideas: custom domain for bridge pages, external ESP for larger lists.
