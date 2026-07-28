// Supabase REST client using fetch() — no CDN, no tracking issues
var SUPABASE_URL = 'https://idejmgmftmrniviftcce.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_AvMTa-zmQ4hgA1hJNpYc3g_gu8rlirz';

var supabase = (function() {
  var baseHeaders = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  };

  function buildUrl(table, filters, order) {
    var params = [];
    if (filters.select) params.push('select=' + filters.select);
    for (var key in filters) {
      if (key === 'select') continue;
      params.push(key + '=' + encodeURIComponent(filters[key]));
    }
    if (order) {
      params.push('order=' + encodeURIComponent(order.field + '.' + (order.asc ? 'asc' : 'desc')));
    }
    return SUPABASE_URL + '/rest/v1/' + table + (params.length ? '?' + params.join('&') : '');
  }

  function qb(table) {
    var filters = {};
    var orderClause = null;
    var method = 'GET';
    var bodyData = null;

    function exec() {
      var url = buildUrl(table, filters, orderClause);
      var h = {};
      for (var k in baseHeaders) h[k] = baseHeaders[k];
      if (method !== 'GET') h['Prefer'] = 'return=minimal';
      var opts = { method: method, headers: h };
      if (bodyData) opts.body = JSON.stringify(bodyData);
      return fetch(url, opts).then(function(r) {
        if (method === 'GET') {
          return r.json().then(function(d) { return { data: d, error: null }; });
        }
        return r.json().then(function(d) { return { data: d, error: null }; }).catch(function() {
          return { data: null, error: r.ok ? null : { message: r.statusText } };
        });
      }).catch(function(e) {
        return { data: null, error: e };
      });
    }

    var chain = {
      select: function(cols) { method = 'GET'; filters['select'] = cols || '*'; return chain; },
      insert: function(rows) { method = 'POST'; bodyData = rows; return chain; },
      update: function(data) { method = 'PATCH'; bodyData = data; return chain; },
      'delete': function() { method = 'DELETE'; return chain; },
      eq: function(field, val) { filters[field] = 'eq.' + val; return chain; },
      gte: function(field, val) { filters[field] = 'gte.' + val; return chain; },
      lte: function(field, val) { filters[field] = 'lte.' + val; return chain; },
      order: function(field, opts) { orderClause = { field: field, asc: opts && opts.ascending }; return chain; },
      then: function(resolve, reject) { return exec().then(resolve, reject); },
      catch: function(rej) { return exec().catch(rej); }
    };

    return chain;
  }

  return {
    from: function(table) { return qb(table); }
  };
})();
