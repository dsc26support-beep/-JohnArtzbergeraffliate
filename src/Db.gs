/**
 * Google Sheets as a tiny database. Each tab has a header row; rows map to objects.
 */

var SCHEMA_ = {
  Offers: ['slug', 'name', 'network', 'niche', 'affiliateUrl', 'headline', 'subhead', 'bullets', 'videoUrl', 'cta', 'active'],
  Leads: ['id', 'ts', 'email', 'name', 'offer', 'src', 'v', 'lastStep', 'lastSent', 'status', 'token'],
  Events: ['ts', 'type', 'offer', 'src', 'v'],
  Content: ['id', 'date', 'platform', 'offer', 'hookType', 'hook', 'script', 'cta', 'link', 'status'],
  Sequence: ['step', 'delayDays', 'subject', 'body'],
  Settings: ['key', 'value']
};

function props_() {
  return PropertiesService.getScriptProperties();
}

function db_() {
  var id = props_().getProperty('DB_ID');
  if (!id) throw new Error('Run setup() first.');
  return SpreadsheetApp.openById(id);
}

function sheet_(name) {
  var sh = db_().getSheetByName(name);
  if (!sh) throw new Error('Missing sheet: ' + name + '. Run setup().');
  return sh;
}

function readAll_(name) {
  var values = sheet_(name).getDataRange().getValues();
  var headers = values.shift();
  return values.map(function (row, i) {
    var obj = { _row: i + 2 };
    headers.forEach(function (h, j) { obj[h] = row[j]; });
    return obj;
  });
}

function toRow_(name, obj) {
  return SCHEMA_[name].map(function (h) { return obj[h] === undefined ? '' : obj[h]; });
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function append_(name, obj) {
  return withLock_(function () { sheet_(name).appendRow(toRow_(name, obj)); });
}

function appendMany_(name, objs) {
  if (!objs.length) return;
  withLock_(function () {
    var sh = sheet_(name);
    var rows = objs.map(function (o) { return toRow_(name, o); });
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  });
}

function updateRow_(name, rowNum, obj) {
  withLock_(function () {
    var row = toRow_(name, obj);
    sheet_(name).getRange(rowNum, 1, 1, row.length).setValues([row]);
  });
}

function deleteRow_(name, rowNum) {
  withLock_(function () { sheet_(name).deleteRow(rowNum); });
}

function findBy_(name, key, value) {
  var rows = readAll_(name);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][key]) === String(value)) return rows[i];
  }
  return null;
}

function settings_() {
  var out = {};
  readAll_('Settings').forEach(function (r) { out[r.key] = r.value; });
  return out;
}

function newId_() {
  return Utilities.getUuid().slice(0, 8);
}

function logEvent_(type, offer, src, v) {
  append_('Events', {
    ts: new Date(),
    type: type,
    offer: slugify_(offer),
    src: slugify_(src),
    v: slugify_(v)
  });
}
