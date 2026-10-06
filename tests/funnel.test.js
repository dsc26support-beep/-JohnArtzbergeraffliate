// End-to-end funnel test with in-memory mocks of the Apps Script services.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeContext() {
  const sheets = {};
  const sent = [];
  const props = {};
  let clock = Date.UTC(2026, 9, 6, 12);

  function makeSheet(name) {
    const data = [];
    return {
      getName: () => name,
      getDataRange: () => ({ getValues: () => data.map((r) => r.slice()) }),
      getRange: (row, col, nRows, nCols) => ({
        setValues(vals) { vals.forEach((v, i) => { data[row - 1 + i] = v.slice(); }); return this; },
        setFontWeight() { return this; },
        clearContent() { data.splice(row - 1, nRows); return this; }
      }),
      appendRow: (r) => data.push(r.slice()),
      deleteRow: (n) => data.splice(n - 1, 1),
      getLastRow: () => data.length,
      setFrozenRows() {},
      _data: data
    };
  }
  const ss = {
    getId: () => 'SS1', getUrl: () => 'https://sheet',
    getSheetByName: (n) => sheets[n] || null,
    insertSheet: (n) => (sheets[n] = makeSheet(n)),
    getSheets: () => Object.values(sheets),
    deleteSheet: (s) => delete sheets[s.getName()]
  };
  let uuid = 0;
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...a) { super(...(a.length ? a : [clock])); }
    static now() { return clock; }
  }
  const ctx = {
    console: { log() {}, warn() {}, error: (...a) => { throw new Error(a.join(' ')); } },
    Date: FakeDate,
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
    SpreadsheetApp: { create: () => { sheets.Sheet1 = makeSheet('Sheet1'); return ss; }, openById: () => ss },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: { getUuid: () => 'uuid-' + String(++uuid).padStart(8, '0') + '-abcd' },
    MailApp: { getRemainingDailyQuota: () => 100, sendEmail: (to, subject, body, opts) => sent.push({ to, subject, body, opts }) },
    ScriptApp: {
      getProjectTriggers: () => [],
      newTrigger: () => ({ timeBased: () => ({ everyHours: () => ({ create() {} }) }) }),
      getService: () => ({ getUrl: () => 'https://app/exec' })
    },
    HtmlService: {
      createTemplateFromFile: (f) => ({ file: f, evaluate() {
        const self = this; const out = { setTitle: () => out, addMetaTag: () => out, template: self }; return out; } })
    }
  };
  vm.createContext(ctx);
  const src = path.join(__dirname, '..', 'src');
  fs.readdirSync(src).filter((f) => f.endsWith('.gs')).forEach((f) => {
    vm.runInContext(fs.readFileSync(path.join(src, f), 'utf8'), ctx, { filename: f });
  });
  return { ctx, sheets, sent, props, advance: (ms) => { clock += ms; } };
}

test('full funnel: setup -> offer -> optin -> sequence -> unsubscribe', () => {
  const { ctx, sheets, sent, props, advance } = makeContext();
  ctx.setup();
  assert.ok(props.ADMIN_KEY && props.DB_ID);
  assert.ok(!sheets.Sheet1);
  assert.strictEqual(sheets.Sequence._data.length, 6);

  const key = props.ADMIN_KEY;
  assert.throws(() => ctx.adminApi('wrong', 'listOffers'), /Unauthorized/);
  assert.throws(() => ctx.adminApi(key, 'saveOffer', { name: 'X', affiliateUrl: 'javascript:1' }), /Affiliate URL/);
  const offers = ctx.adminApi(key, 'saveOffer', {
    name: 'Keto Book', niche: 'keto', affiliateUrl: 'https://hop.example.com/?a=me', bullets: 'One\nTwo'
  });
  assert.strictEqual(offers[0].slug, 'keto-book');

  // Bridge view + redirect logging
  const bridge = ctx.doGet({ parameter: { page: 'bridge', o: 'keto-book', src: 'tiktok' } });
  assert.strictEqual(bridge.template.file, 'html/Bridge');
  assert.strictEqual(JSON.stringify(bridge.template.bullets), '["One","Two"]');
  const go = ctx.doGet({ parameter: { page: 'go', o: 'keto-book', src: 'tiktok' } });
  assert.strictEqual(go.template.url, 'https://hop.example.com/?a=me');
  assert.strictEqual(ctx.doGet({ parameter: {} }).template.file, 'html/Message'); // admin w/o key

  // Opt-in sends welcome email immediately
  assert.strictEqual(ctx.submitLead({ o: 'keto-book', email: 'bad' }).ok, false);
  const res = ctx.submitLead({ o: 'keto-book', email: 'Jo@Example.com', name: 'Jo', src: 'tiktok' });
  assert.ok(res.ok);
  assert.strictEqual(res.url, 'https://app/exec?page=go&o=keto-book&src=tiktok&v=optin');
  assert.strictEqual(sent.length, 1);
  assert.strictEqual(sent[0].to, 'jo@example.com');
  assert.match(sent[0].subject, /Jo/);
  assert.match(sent[0].body, /src=email&v=step0/);
  assert.match(sent[0].body, /page=unsub&t=/);
  assert.match(sent[0].opts.htmlBody, /<a href="https:\/\/app\/exec\?page=go&amp;o=keto-book/);

  // Duplicate opt-in does not resend
  ctx.submitLead({ o: 'keto-book', email: 'jo@example.com' });
  assert.strictEqual(sent.length, 1);

  // Nothing due an hour later; day 1 email next day
  advance(3600e3);
  assert.strictEqual(ctx.processSequence().sent, 0);
  advance(24 * 3600e3);
  assert.strictEqual(ctx.processSequence().sent, 1);
  assert.match(sent[1].subject, /failure to freedom/);

  // Dashboard numbers
  const d = ctx.adminApi(key, 'dashboard', {});
  assert.deepStrictEqual([d.totals.views, d.totals.clicks, d.totals.optins], [1, 1, 1]);
  assert.strictEqual(d.leads.active, 1);

  // Unsubscribe stops emails
  const token = sent[0].body.match(/t=(\w+)/)[1];
  ctx.doGet({ parameter: { page: 'unsub', t: token } });
  advance(10 * 24 * 3600e3);
  assert.strictEqual(ctx.processSequence().sent, 0);
  assert.strictEqual(ctx.adminApi(key, 'listLeads')[0].status, 'unsubscribed');
});

test('content plan + sequence editing', () => {
  const { ctx, props } = makeContext();
  ctx.setup();
  const key = props.ADMIN_KEY;
  ctx.adminApi(key, 'saveOffer', { name: 'Dog Training', niche: 'puppy training', affiliateUrl: 'https://x.com' });
  const plan = ctx.adminApi(key, 'generatePlan', { offer: 'dog-training', days: 7, startDate: '2026-10-07' });
  assert.strictEqual(plan.length, 7);
  assert.match(plan[0].link, /page=bridge&o=dog-training&src=tiktok&v=d1-curiosity/);
  const updated = ctx.adminApi(key, 'setContentStatus', { id: plan[0].id, status: 'Posted' });
  assert.strictEqual(updated.find((p) => p.id === plan[0].id).status, 'Posted');

  const seq = ctx.adminApi(key, 'saveSequence', { steps: [
    { delayDays: 0, subject: 'A', body: 'a' }, { delayDays: 2, subject: 'B', body: 'b' }] });
  assert.strictEqual(JSON.stringify(seq.map((s) => [s.step, s.delayDays, s.subject])), '[[0,0,"A"],[1,2,"B"]]');
});
