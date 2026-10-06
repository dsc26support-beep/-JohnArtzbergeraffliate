/** Email follow-up sequence, sent by an hourly time trigger. */

function sequenceSteps_() {
  return readAll_('Sequence')
    .map(function (s) { return { step: Number(s.step), delayDays: Number(s.delayDays), subject: s.subject, body: s.body }; })
    .sort(function (a, b) { return a.step - b.step; });
}

function listSequence_() {
  return sequenceSteps_();
}

/** Replaces the whole sequence with the steps sent from the dashboard. */
function saveSequence_(p) {
  var steps = (p.steps || []).map(function (s, i) {
    if (!s.subject || !s.body) throw new Error('Step ' + (i + 1) + ' needs a subject and body.');
    return {
      step: i,
      delayDays: Math.max(0, Number(s.delayDays) || 0),
      subject: String(s.subject).slice(0, 200),
      body: String(s.body).slice(0, 10000)
    };
  });
  withLock_(function () {
    var sh = sheet_('Sequence');
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, SCHEMA_.Sequence.length).clearContent();
  });
  appendMany_('Sequence', steps);
  return sequenceSteps_();
}

/** Trigger handler. Sends at most one due email per lead per run. */
function processSequence() {
  var steps = sequenceSteps_();
  if (!steps.length) return { sent: 0 };
  var s = settings_();
  var now = Date.now();
  var sent = 0;
  var leads = readAll_('Leads').filter(function (l) { return l.status === 'active'; });
  for (var i = 0; i < leads.length; i++) {
    if (MailApp.getRemainingDailyQuota() < 1) {
      console.warn('Daily email quota reached; remaining leads wait for the next run.');
      break;
    }
    try {
      if (sendDueForLead_(leads[i], steps, s, now)) sent++;
    } catch (err) {
      console.error('Send failed for ' + leads[i].email + ': ' + err);
    }
  }
  return { sent: sent };
}

function sendDueForLead_(lead, steps, s, now) {
  if (!lead || lead.status !== 'active') return false;
  var lastStep = lead.lastStep === '' ? -1 : Number(lead.lastStep);
  var step = nextDueStep_(new Date(lead.ts).getTime(), lastStep, steps, now);
  if (!step) {
    if (lastStep >= steps[steps.length - 1].step) {
      lead.status = 'complete';
      updateRow_('Leads', lead._row, lead);
    }
    return false;
  }
  var offer = getOffer_(lead.offer) || { slug: lead.offer, name: lead.offer };
  var base = webAppUrl_();
  var vars = {
    name: lead.name || 'friend',
    email: lead.email,
    offer_name: offer.name,
    offer_link: buildTrackingUrl_(base, offer.slug, 'email', 'step' + step.step),
    from_name: s.fromName || '',
    unsub_link: base + '?page=unsub&t=' + lead.token
  };
  var footer = '\n\n--\n' + (s.disclosure || '') + '\n' + (s.mailingAddress || '') +
    '\nUnsubscribe: {{unsub_link}}';
  var plain = renderTemplate_(step.body + footer, vars, false);
  var html = renderTemplate_(escapeHtml_(step.body + footer), vars, true)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')
    .replace(/\n/g, '<br>');

  MailApp.sendEmail(lead.email, renderTemplate_(step.subject, vars, false), plain, {
    htmlBody: html,
    name: s.fromName || undefined
  });
  lead.lastStep = step.step;
  lead.lastSent = new Date();
  updateRow_('Leads', lead._row, lead);
  return true;
}
