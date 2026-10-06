/** Short-form content planner (TikTok / YouTube Shorts / Instagram Reels). */

var CONTENT_STATUSES_ = ['Idea', 'Filmed', 'Posted'];

function listContent_() {
  return readAll_('Content').map(stripRow_).sort(function (a, b) {
    return new Date(a.date) - new Date(b.date);
  });
}

function generateContentPlan_(p) {
  var offer = getOffer_(p.offer);
  if (!offer) throw new Error('Pick an offer first.');
  var days = Math.min(Math.max(Number(p.days) || 30, 1), 90);
  var start = p.startDate ? new Date(p.startDate) : new Date();
  var base = webAppUrl_();
  var posts = generatePlan_(offer, start, days).map(function (post) {
    return {
      id: newId_(),
      date: post.date,
      platform: post.platform,
      offer: post.offer,
      hookType: post.hookType,
      hook: post.hook,
      script: post.script,
      cta: post.cta,
      link: buildBridgeUrl_(base, offer.slug, post.platform) + '&v=' + encodeURIComponent(post.videoTag),
      status: post.status
    };
  });
  appendMany_('Content', posts);
  return listContent_();
}

function setContentStatus_(p) {
  if (CONTENT_STATUSES_.indexOf(p.status) === -1) throw new Error('Bad status');
  var row = findBy_('Content', 'id', p.id);
  if (row) {
    row.status = p.status;
    updateRow_('Content', row._row, row);
  }
  return listContent_();
}

function deleteContent_(p) {
  var row = findBy_('Content', 'id', p.id);
  if (row) deleteRow_('Content', row._row);
  return listContent_();
}
