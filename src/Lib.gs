/**
 * Pure helpers with no Apps Script dependencies, so they can be unit tested in Node.
 * Names end in "_" so google.script.run cannot call them from the browser.
 */

var PLATFORMS_ = ['tiktok', 'shorts', 'reels'];

var HOOKS_ = {
  curiosity: [
    'Nobody talks about this {{niche}} trick...',
    'I found a {{niche}} shortcut that feels illegal to know',
    'Stop scrolling if you struggle with {{niche}}'
  ],
  pain: [
    'If {{niche}} keeps beating you, watch this',
    'The #1 mistake I made with {{niche}} (and how I fixed it)',
    'Tired of wasting money on {{niche}}? Same.'
  ],
  story: [
    'A year ago I failed at {{niche}}. Here is what changed.',
    'From broke and stuck to finally winning at {{niche}}',
    'I almost quit {{niche}} until I found this'
  ],
  listicle: [
    '3 {{niche}} tips I wish I knew sooner',
    '5 free {{niche}} tools nobody mentions',
    '3 signs you are doing {{niche}} wrong'
  ],
  tried: [
    'I tried {{offer}} for 7 days. Honest results.',
    'Is {{offer}} worth it? I tested it so you do not have to',
    'Day 1 vs Day 30 using {{offer}}'
  ]
};

var HOOK_TYPES_ = Object.keys(HOOKS_);

function escapeHtml_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify_(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function isEmail_(s) {
  return /^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i.test(String(s || '').trim());
}

function isHttpUrl_(s) {
  return /^https?:\/\/[^\s<>"']+$/i.test(String(s || '').trim());
}

/** Extracts an 11-char YouTube video id from a URL or bare id; '' if none. */
function youtubeId_(s) {
  s = String(s || '').trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  var m = s.match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/)([\w-]{11})/);
  return m ? m[1] : '';
}

/** Builds a tracked link: base?page=go&o=slug&src=...&v=... */
function buildTrackingUrl_(base, slug, src, v) {
  var params = { page: 'go', o: slug };
  if (src) params.src = slugify_(src);
  if (v) params.v = slugify_(v);
  var qs = Object.keys(params).map(function (k) {
    return k + '=' + encodeURIComponent(params[k]);
  }).join('&');
  return base + (base.indexOf('?') === -1 ? '?' : '&') + qs;
}

function buildBridgeUrl_(base, slug, src) {
  var url = base + (base.indexOf('?') === -1 ? '?' : '&') + 'page=bridge&o=' + encodeURIComponent(slug);
  return src ? url + '&src=' + encodeURIComponent(slugify_(src)) : url;
}

/** Replaces {{key}} tags. When html is true, values are HTML-escaped. */
function renderTemplate_(tpl, vars, html) {
  return String(tpl || '').replace(/\{\{\s*(\w+)\s*\}\}/g, function (all, key) {
    if (!Object.prototype.hasOwnProperty.call(vars, key)) return all;
    return html ? escapeHtml_(vars[key]) : String(vars[key]);
  });
}

var DAY_MS_ = 24 * 60 * 60 * 1000;

/**
 * Given a lead's opt-in time, the last step sent (-1 = none) and the sequence
 * (sorted by step), returns the next step that is due now, or null.
 */
function nextDueStep_(optinMs, lastStep, steps, nowMs) {
  for (var i = 0; i < steps.length; i++) {
    var s = steps[i];
    if (Number(s.step) <= lastStep) continue;
    var dueAt = optinMs + Number(s.delayDays) * DAY_MS_;
    return nowMs >= dueAt ? s : null;
  }
  return null;
}

/**
 * Generates a content plan: one post per day, rotating platforms and hook types.
 * offer: { slug, name, niche }. Returns plain objects (no ids, no links).
 */
function generatePlan_(offer, startDate, days) {
  var posts = [];
  var start = new Date(startDate);
  start.setHours(9, 0, 0, 0);
  for (var d = 0; d < days; d++) {
    var type = HOOK_TYPES_[d % HOOK_TYPES_.length];
    var bank = HOOKS_[type];
    var hookTpl = bank[Math.floor(d / HOOK_TYPES_.length) % bank.length];
    var vars = { niche: offer.niche || offer.name, offer: offer.name };
    var hook = renderTemplate_(hookTpl, vars, false);
    var date = new Date(start.getTime() + d * DAY_MS_);
    posts.push({
      date: date,
      platform: PLATFORMS_[d % PLATFORMS_.length],
      offer: offer.slug,
      hookType: type,
      hook: hook,
      script: [
        'HOOK (0-3s): ' + hook,
        'VALUE (3-20s): Share one specific, useful ' + vars.niche + ' tip or result. Show, do not tell.',
        'BRIDGE (20-30s): "I put the full breakdown on a free page."',
        'CTA: "Link in bio" - comment "INFO" and I will send it.'
      ].join('\n'),
      cta: 'Link in bio',
      videoTag: 'd' + (d + 1) + '-' + type,
      status: 'Idea'
    });
  }
  return posts;
}

/** Aggregates click/view/optin events into totals and per-key breakdowns. */
function summarizeEvents_(events, sinceMs) {
  var out = { views: 0, clicks: 0, optins: 0, byOffer: {}, bySource: {} };
  events.forEach(function (e) {
    var t = new Date(e.ts).getTime();
    if (sinceMs && t < sinceMs) return;
    var type = e.type === 'view' ? 'views' : e.type === 'optin' ? 'optins' : 'clicks';
    out[type]++;
    [['byOffer', e.offer || '(none)'], ['bySource', e.src || '(direct)']].forEach(function (pair) {
      var bucket = out[pair[0]];
      bucket[pair[1]] = bucket[pair[1]] || { views: 0, clicks: 0, optins: 0 };
      bucket[pair[1]][type]++;
    });
  });
  return out;
}

if (typeof module !== 'undefined') {
  module.exports = {
    escapeHtml_: escapeHtml_, slugify_: slugify_, isEmail_: isEmail_, isHttpUrl_: isHttpUrl_,
    youtubeId_: youtubeId_, buildTrackingUrl_: buildTrackingUrl_, buildBridgeUrl_: buildBridgeUrl_,
    renderTemplate_: renderTemplate_, nextDueStep_: nextDueStep_, generatePlan_: generatePlan_,
    summarizeEvents_: summarizeEvents_, DAY_MS_: DAY_MS_
  };
}
