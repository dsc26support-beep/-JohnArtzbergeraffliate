/** Offers: the affiliate products you promote. */

function listOffers_() {
  return readAll_('Offers').map(stripRow_);
}

function stripRow_(r) {
  var o = {};
  Object.keys(r).forEach(function (k) { if (k !== '_row') o[k] = r[k]; });
  return o;
}

function getOffer_(slug) {
  return findBy_('Offers', 'slug', slugify_(slug));
}

function saveOffer_(p) {
  var slug = slugify_(p.slug || p.name);
  if (!slug) throw new Error('Offer needs a name or slug.');
  if (!isHttpUrl_(p.affiliateUrl)) throw new Error('Affiliate URL must start with http:// or https://');
  if (p.videoUrl && !youtubeId_(p.videoUrl)) throw new Error('Video must be a YouTube link or id.');
  var offer = {
    slug: slug,
    name: String(p.name || slug).slice(0, 120),
    network: String(p.network || '').slice(0, 60),
    niche: String(p.niche || '').slice(0, 80),
    affiliateUrl: String(p.affiliateUrl).trim(),
    headline: String(p.headline || '').slice(0, 200),
    subhead: String(p.subhead || '').slice(0, 400),
    bullets: String(p.bullets || '').slice(0, 2000),
    videoUrl: String(p.videoUrl || '').trim(),
    cta: String(p.cta || 'Send Me The Free Guide').slice(0, 60),
    active: p.active === false || p.active === 'false' ? false : true
  };
  var existing = getOffer_(slug);
  if (existing) updateRow_('Offers', existing._row, offer);
  else append_('Offers', offer);
  return listOffers_();
}

function deleteOffer_(p) {
  var existing = getOffer_(p.slug);
  if (existing) deleteRow_('Offers', existing._row);
  return listOffers_();
}

/** Ready-to-paste links for each offer and platform. */
function getLinks_() {
  var base = webAppUrl_();
  return readAll_('Offers').map(function (o) {
    return {
      slug: o.slug,
      name: o.name,
      bridge: PLATFORMS_.concat(['youtube', 'email']).map(function (src) {
        return { src: src, url: buildBridgeUrl_(base, o.slug, src) };
      }),
      direct: buildTrackingUrl_(base, o.slug, 'direct', '')
    };
  });
}
