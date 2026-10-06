const test = require('node:test');
const assert = require('node:assert');
const lib = require('../src/Lib.gs');

test('slugify_', () => {
  assert.strictEqual(lib.slugify_('  Keto Recipe Book! '), 'keto-recipe-book');
  assert.strictEqual(lib.slugify_('<script>'), 'script');
  assert.strictEqual(lib.slugify_(undefined), '');
});

test('isEmail_ and isHttpUrl_', () => {
  assert.ok(lib.isEmail_('a.b@site.com'));
  assert.ok(!lib.isEmail_('nope'));
  assert.ok(!lib.isEmail_('a@b"c.com'));
  assert.ok(lib.isHttpUrl_('https://hop.clickbank.net/?affiliate=me'));
  assert.ok(!lib.isHttpUrl_('javascript:alert(1)'));
});

test('youtubeId_', () => {
  assert.strictEqual(lib.youtubeId_('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.strictEqual(lib.youtubeId_('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1'), 'dQw4w9WgXcQ');
  assert.strictEqual(lib.youtubeId_('https://youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.strictEqual(lib.youtubeId_('https://evil.com/x'), '');
});

test('tracking and bridge urls', () => {
  const base = 'https://script.google.com/macros/s/ID/exec';
  assert.strictEqual(lib.buildTrackingUrl_(base, 'keto', 'TikTok', 'Day 1'),
    base + '?page=go&o=keto&src=tiktok&v=day-1');
  assert.strictEqual(lib.buildBridgeUrl_(base, 'keto', 'shorts'), base + '?page=bridge&o=keto&src=shorts');
});

test('renderTemplate_ escapes in html mode', () => {
  assert.strictEqual(lib.renderTemplate_('Hi {{name}} {{x}}', { name: '<b>' }, true), 'Hi &lt;b&gt; {{x}}');
  assert.strictEqual(lib.renderTemplate_('Hi {{ name }}', { name: 'Jo' }, false), 'Hi Jo');
});

test('nextDueStep_', () => {
  const steps = [{ step: 0, delayDays: 0 }, { step: 1, delayDays: 1 }, { step: 2, delayDays: 3 }];
  const t0 = Date.UTC(2026, 0, 1);
  const day = lib.DAY_MS_;
  assert.strictEqual(lib.nextDueStep_(t0, -1, steps, t0).step, 0);
  assert.strictEqual(lib.nextDueStep_(t0, 0, steps, t0 + day / 2), null);
  assert.strictEqual(lib.nextDueStep_(t0, 0, steps, t0 + day).step, 1);
  assert.strictEqual(lib.nextDueStep_(t0, 1, steps, t0 + 10 * day).step, 2); // one at a time
  assert.strictEqual(lib.nextDueStep_(t0, 2, steps, t0 + 10 * day), null);
});

test('generatePlan_ rotates platforms and hook types', () => {
  const plan = lib.generatePlan_({ slug: 'keto', name: 'Keto Book', niche: 'keto' }, '2026-10-06', 30);
  assert.strictEqual(plan.length, 30);
  assert.deepStrictEqual(plan.slice(0, 3).map((p) => p.platform), ['tiktok', 'shorts', 'reels']);
  assert.strictEqual(new Set(plan.map((p) => p.hookType)).size, 5);
  assert.strictEqual(new Set(plan.map((p) => p.hook)).size, 15);
  assert.ok(plan.every((p) => !/\{\{/.test(p.hook)));
  assert.strictEqual(plan[1].date - plan[0].date, lib.DAY_MS_);
});

test('summarizeEvents_', () => {
  const now = Date.now();
  const s = lib.summarizeEvents_([
    { ts: now, type: 'view', offer: 'keto', src: 'tiktok' },
    { ts: now, type: 'optin', offer: 'keto', src: 'tiktok' },
    { ts: now, type: 'click', offer: 'keto', src: '' },
    { ts: now - 40 * lib.DAY_MS_, type: 'view', offer: 'keto', src: 'tiktok' }
  ], now - 30 * lib.DAY_MS_);
  assert.deepStrictEqual([s.views, s.optins, s.clicks], [1, 1, 1]);
  assert.deepStrictEqual(s.bySource.tiktok, { views: 1, clicks: 0, optins: 1 });
  assert.strictEqual(s.bySource['(direct)'].clicks, 1);
});
