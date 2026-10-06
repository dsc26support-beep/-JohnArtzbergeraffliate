/**
 * Freedom Funnel - affiliate marketing web app.
 * Routes: ?page=admin&key=...  (private dashboard)
 *         ?page=bridge&o=slug  (public bridge page + email capture)
 *         ?page=go&o=slug      (public tracked redirect)
 *         ?page=unsub&t=token  (public unsubscribe)
 */

function doGet(e) {
  var p = (e && e.parameter) || {};
  var page = p.page || 'admin';
  try {
    if (page === 'bridge') return renderBridge_(p);
    if (page === 'go') return renderRedirect_(p);
    if (page === 'unsub') return renderUnsub_(p);
    if (!isAdmin_(p.key)) return message_('Not found', 'This page does not exist.');
    var t = HtmlService.createTemplateFromFile('html/Index');
    t.brand = settings_().brandName || 'Freedom Funnel';
    return t.evaluate()
      .setTitle(t.brand + ' - Dashboard')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (err) {
    console.error(err);
    return message_('Something went wrong', 'Please try again in a minute.');
  }
}

function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

function isAdmin_(key) {
  var expected = props_().getProperty('ADMIN_KEY');
  return !!expected && !!key && String(key) === expected;
}

function webAppUrl_() {
  return settings_().webAppUrl || ScriptApp.getService().getUrl();
}

function message_(title, text) {
  var t = HtmlService.createTemplateFromFile('html/Message');
  t.title = title;
  t.text = text;
  return t.evaluate().setTitle(title).addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * One-time setup: creates the database spreadsheet, seeds defaults,
 * generates the admin key and installs the hourly email trigger.
 * Run it from the Apps Script editor, then read the log.
 */
function setup() {
  var p = props_();
  var ss;
  if (p.getProperty('DB_ID')) {
    ss = SpreadsheetApp.openById(p.getProperty('DB_ID'));
  } else {
    ss = SpreadsheetApp.create('Freedom Funnel DB');
    p.setProperty('DB_ID', ss.getId());
  }

  Object.keys(SCHEMA_).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var headers = SCHEMA_[name];
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
  var blank = ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 1) ss.deleteSheet(blank);

  if (!readAll_('Settings').length) appendMany_('Settings', defaultSettings_());
  if (!readAll_('Sequence').length) appendMany_('Sequence', defaultSequence_());

  if (!p.getProperty('ADMIN_KEY')) p.setProperty('ADMIN_KEY', Utilities.getUuid().replace(/-/g, ''));

  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'processSequence') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('processSequence').timeBased().everyHours(1).create();

  console.log('Database: ' + ss.getUrl());
  console.log('Admin key: ' + p.getProperty('ADMIN_KEY'));
  console.log('After deploying as a web app, open: <WEB_APP_URL>?page=admin&key=' + p.getProperty('ADMIN_KEY'));
}

function defaultSettings_() {
  return [
    { key: 'brandName', value: 'Freedom Funnel' },
    { key: 'fromName', value: 'Your Name' },
    { key: 'mailingAddress', value: 'Your business mailing address (required by CAN-SPAM)' },
    { key: 'disclosure', value: 'Disclosure: some links are affiliate links. If you buy through them I may earn a commission at no extra cost to you. I only recommend things I believe in.' },
    { key: 'webAppUrl', value: '' }
  ];
}

function defaultSequence_() {
  return [
    { step: 0, delayDays: 0, subject: 'Here is what you asked for, {{name}}',
      body: 'Hey {{name}},\n\nThanks for grabbing this. As promised, here is the link:\n{{offer_link}}\n\nOver the next few days I will send you short emails with the exact steps that worked for me. Keep an eye out.\n\nTalk soon,\n{{from_name}}' },
    { step: 1, delayDays: 1, subject: 'How I went from failure to freedom',
      body: 'Hey {{name}},\n\nQuick story. Not long ago I was stuck: tired, broke, and trading hours for a paycheck. What changed was not luck. It was picking ONE simple system and doing it every day.\n\nThat is why I share {{offer_name}}. It is the kind of tool that rewards consistency.\n\nTake a look: {{offer_link}}\n\n{{from_name}}' },
    { step: 2, delayDays: 3, subject: 'The one thing most people get wrong',
      body: 'Hey {{name}},\n\nMost people quit right before it works. They try five things for five days instead of one thing for 30 days.\n\nIf you are serious, this is the shortcut I recommend: {{offer_link}}\n\n{{from_name}}' },
    { step: 3, delayDays: 5, subject: '"Is it worth it?" (honest answer)',
      body: 'Hey {{name}},\n\nA few people asked me if {{offer_name}} is worth it. Honest answer: only if you will actually use it. It will not do the work for you, but it makes the work a lot easier.\n\nHere is the page with all the details and the guarantee: {{offer_link}}\n\n{{from_name}}' },
    { step: 4, delayDays: 7, subject: 'Last note on this',
      body: 'Hey {{name}},\n\nThis is my last email about {{offer_name}}. If it is not for you, no worries at all. If it is, here is the link one more time: {{offer_link}}\n\nEither way, I will keep sending you free tips.\n\n{{from_name}}' }
  ];
}

/**
 * Single entry point for every dashboard call. The admin key is checked on every
 * request because the web app is public.
 */
function adminApi(key, action, payload) {
  if (!isAdmin_(key)) throw new Error('Unauthorized');
  payload = payload || {};
  var handlers = {
    dashboard: getDashboard_,
    listOffers: listOffers_,
    saveOffer: saveOffer_,
    deleteOffer: deleteOffer_,
    links: getLinks_,
    listLeads: listLeads_,
    listContent: listContent_,
    generatePlan: generateContentPlan_,
    setContentStatus: setContentStatus_,
    deleteContent: deleteContent_,
    listSequence: listSequence_,
    saveSequence: saveSequence_,
    runSequence: processSequence,
    getSettings: getSettingsList_,
    saveSettings: saveSettings_
  };
  if (!handlers[action]) throw new Error('Unknown action: ' + action);
  var result = handlers[action](payload);
  return JSON.parse(JSON.stringify(result === undefined ? null : result));
}

function getSettingsList_() {
  return readAll_('Settings').map(function (r) { return { key: r.key, value: r.value }; });
}

function saveSettings_(p) {
  var rows = readAll_('Settings');
  Object.keys(p).forEach(function (key) {
    if (!/^\w+$/.test(key)) return;
    var row = rows.filter(function (r) { return r.key === key; })[0];
    var value = String(p[key]).slice(0, 2000);
    if (row) updateRow_('Settings', row._row, { key: key, value: value });
    else append_('Settings', { key: key, value: value });
  });
  return getSettingsList_();
}
