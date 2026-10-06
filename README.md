# Freedom Funnel — Affiliate Marketing Web App

A Google Apps Script web app that runs the **Free Social Funnel**, the affiliate method
taught by John Artzberger ([@JohnArtzberger](https://www.youtube.com/@JohnArtzberger)):

```
Short video (TikTok / Shorts / Reels) → tracked bio link → bridge page → email captured → follow-up emails → affiliate offer
```

Strategy guide: **[docs/PLAYBOOK.md](docs/PLAYBOOK.md)** (it's also in the app's Playbook tab).

## Features

| Tab | What it does |
|---|---|
| **Dashboard** | Bridge views, opt-ins, opt-in rate, offer clicks, broken down by source and offer (last 30 days) |
| **Offers** | Add ClickBank / Digistore24 / any affiliate offers with a headline, bullets, YouTube video and button text |
| **Links** | Tracked bridge-page links for each platform (TikTok, Shorts, Reels, YouTube, email), ready to copy |
| **Content Plan** | Makes a 30-day short-form plan: 5 hook styles × 3 platforms, a 30-second script and a unique tracked link per video |
| **Leads** | Everyone who opted in, where they came from, and where they are in the email sequence |
| **Emails** | 5-email nurture sequence you can edit (Day 0, 1, 3, 5, 7), sent automatically every hour |
| **Settings** | Brand name, sender name, mailing address, affiliate disclosure, web app URL |

Public pages:

- `?page=bridge&o=<slug>&src=<source>` — bridge page with email opt-in (sends visitors on to the offer)
- `?page=go&o=<slug>&src=<source>&v=<video>` — logs the click, then redirects to your affiliate link
- `?page=unsub&t=<token>` — one-click unsubscribe

Your data lives in a Google Sheet (`Offers`, `Leads`, `Events`, `Content`, `Sequence`, `Settings`) that `setup()` creates for you.

## Project layout

```
src/                 Apps Script code (clasp rootDir)
  appsscript.json    manifest: V8, web app, scopes
  Code.gs            doGet router, setup(), adminApi()
  Db.gs              Google Sheets helpers
  Lib.gs             pure helpers (unit tested)
  Offers.gs  Tracking.gs  Leads.gs  Sequence.gs  Content.gs  Dashboard.gs
  html/              Index (dashboard), Bridge, Redirect, Message, Playbook, Styles, App.js
tests/               Node tests (mocked Apps Script services)
docs/PLAYBOOK.md     the strategy
.github/workflows/deploy.yml   test on every PR, deploy to Apps Script on push to main
```

## Setup (about 10 minutes)

### 1. Create the Apps Script project

1. Turn on the Apps Script API: <https://script.google.com/home/usersettings>.
2. Go to <https://script.google.com> → **New project**. Name it "Freedom Funnel".
3. **Project Settings** → copy the **Script ID**.

### 2. Push the code with clasp

```bash
npm install -g @google/clasp@2.4.2
clasp login
cp .clasp.json.example .clasp.json   # paste your Script ID into it
clasp push -f
```

### 3. Run setup

1. In the Apps Script editor, pick `setup` and click **Run**. Approve the permissions.
2. Open **Execution log**. Copy the **Admin key** and the database link.

### 4. Deploy the web app

1. **Deploy → New deployment → Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
2. Copy the web app URL (ends in `/exec`) and the **Deployment ID**.
3. Open `<WEB_APP_URL>?page=admin&key=<ADMIN_KEY>` and bookmark it. Keep this link private.
4. In **Settings**, paste the `/exec` URL into `webAppUrl`, and fill in your name, mailing address and disclosure.

### 5. Auto-deploy from GitHub

In GitHub → **Settings → Secrets and variables → Actions**, add:

| Secret | Value |
|---|---|
| `CLASPRC_JSON` | Full contents of `~/.clasprc.json` (made by `clasp login`) |
| `SCRIPT_ID` | Your Script ID |
| `DEPLOYMENT_ID` | Your web app Deployment ID (keeps the same `/exec` URL) |

Now every push to `main` runs the tests, pushes the code, and updates the live web app.
Pull requests only run the tests.

## Your first day

1. **Offers:** add one offer (name, niche, hoplink, headline, 3-5 bullets).
2. **Links:** put the TikTok, Shorts and Reels bridge links in each profile bio.
3. **Content Plan:** generate 30 days. Film and post today's video.
4. **Emails:** rewrite the Day 1 email with your own "failure to freedom" story.
5. Opt in on your own bridge page to test it. You should get the welcome email right away.

## Development

```bash
npm run check   # syntax-check .gs files and inline scripts
npm test        # unit + mocked end-to-end funnel tests
```

## Notes and limits

- Emails go out through `MailApp` (about 100 a day on a free Gmail account, 1,500 on Workspace).
  When you hit the limit, the rest wait for the next hourly run. For a big list, move to a proper email service.
- The admin page is protected by the secret key in the URL. Don't share it. To change it, delete the
  `ADMIN_KEY` script property and run `setup()` again.
- Apps Script web apps show a small Google banner on public pages. For a cleaner look, use a custom domain that frames or forwards to the bridge link.
- Follow FTC disclosure, CAN-SPAM/GDPR and each affiliate network's rules. See the Playbook.
