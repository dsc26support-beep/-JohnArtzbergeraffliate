/** Public pages: bridge page, tracked redirect, unsubscribe. */

function renderBridge_(p) {
  var offer = getOffer_(p.o);
  if (!offer || offer.active === false) return message_('Not found', 'This page is no longer available.');
  logEvent_('view', offer.slug, p.src, p.v);
  var s = settings_();
  var t = HtmlService.createTemplateFromFile('html/Bridge');
  t.offer = offer;
  t.bullets = String(offer.bullets || '').split('\n').map(function (b) { return b.trim(); }).filter(String);
  t.videoId = youtubeId_(offer.videoUrl);
  t.src = slugify_(p.src);
  t.v = slugify_(p.v);
  t.disclosure = s.disclosure || '';
  t.brand = s.brandName || '';
  return t.evaluate()
    .setTitle(offer.headline || offer.name)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function renderRedirect_(p) {
  var offer = getOffer_(p.o);
  if (!offer || !isHttpUrl_(offer.affiliateUrl)) return message_('Not found', 'This link is no longer available.');
  logEvent_('click', offer.slug, p.src, p.v);
  var t = HtmlService.createTemplateFromFile('html/Redirect');
  t.url = offer.affiliateUrl;
  return t.evaluate().setTitle('Redirecting...');
}

function renderUnsub_(p) {
  var lead = p.t ? findBy_('Leads', 'token', p.t) : null;
  if (lead && lead.status !== 'unsubscribed') {
    lead.status = 'unsubscribed';
    updateRow_('Leads', lead._row, lead);
  }
  return message_('You are unsubscribed', 'You will not receive any more emails from this list.');
}
