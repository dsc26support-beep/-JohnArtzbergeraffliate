/** Funnel stats for the last N days. */

function getDashboard_(p) {
  var days = Number(p.days) || 30;
  var since = Date.now() - days * DAY_MS_;
  var summary = summarizeEvents_(readAll_('Events'), since);
  var leads = readAll_('Leads');
  var content = readAll_('Content');
  return {
    days: days,
    totals: summary,
    optinRate: summary.views ? Math.round((summary.optins / summary.views) * 1000) / 10 : 0,
    leads: {
      total: leads.length,
      active: leads.filter(function (l) { return l.status === 'active'; }).length,
      unsubscribed: leads.filter(function (l) { return l.status === 'unsubscribed'; }).length
    },
    content: {
      planned: content.length,
      posted: content.filter(function (c) { return c.status === 'Posted'; }).length
    },
    webAppUrl: webAppUrl_()
  };
}
