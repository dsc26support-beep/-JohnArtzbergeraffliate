/** Lead capture from bridge pages (called by google.script.run). */

function submitLead(form) {
  form = form || {};
  if (form.website) return { ok: true, url: '' }; // honeypot: bots fill hidden fields
  var email = String(form.email || '').trim().toLowerCase();
  if (!isEmail_(email)) return { ok: false, error: 'Please enter a valid email.' };
  var offer = getOffer_(form.o);
  if (!offer) return { ok: false, error: 'This offer is no longer available.' };

  var name = String(form.name || '').trim().slice(0, 60) || 'friend';
  var src = slugify_(form.src);
  var goUrl = buildTrackingUrl_(webAppUrl_(), offer.slug, src || 'bridge', 'optin');

  var existing = readAll_('Leads').filter(function (l) {
    return l.email === email && l.offer === offer.slug;
  })[0];
  if (existing) return { ok: true, url: goUrl };

  var lead = {
    id: newId_(), ts: new Date(), email: email, name: name, offer: offer.slug,
    src: src, v: slugify_(form.v), lastStep: -1, lastSent: '', status: 'active',
    token: Utilities.getUuid().replace(/-/g, '')
  };
  append_('Leads', lead);
  logEvent_('optin', offer.slug, src, form.v);

  try {
    sendDueForLead_(findBy_('Leads', 'token', lead.token), sequenceSteps_(), settings_(), Date.now());
  } catch (err) {
    console.error('Welcome email failed: ' + err); // the hourly trigger will retry
  }
  return { ok: true, url: goUrl };
}

function listLeads_() {
  return readAll_('Leads').map(function (l) {
    return { ts: l.ts, email: l.email, name: l.name, offer: l.offer, src: l.src, lastStep: l.lastStep, status: l.status };
  }).reverse();
}
