/* =============================================================
   SARMAAN LC Coordinator Dashboard - shared behaviour
   Consumed by index.html (Overview) and insights.html (Insights).

   Owns: sidebar toggle (with mobile drawer), filter bar visibility,
   date multi-select dropdown, data.json fetch + status dot,
   error / empty / loading affordances.

   Pages plug in with:
     Dashboard.init({ onData: function(json) { ... render page ... } });

   `onData` is called every time data reloads; pages own their own
   render + chart-destroy logic.
   ============================================================= */

(function (window) {
  'use strict';

  var state = {
    raw: [],
    allDates: [],
    fetchedAt: '',
    onData: null,
    refreshIntervalMs: 10 * 60 * 1000
  };

  // ---------------------------------------------------------------
  // Sidebar
  // ---------------------------------------------------------------
  function initSidebar() {
    var sb   = document.getElementById('sidebar');
    var main = document.getElementById('mainContent');
    var btn  = document.getElementById('sidebarToggle');
    if (!sb || !btn) return;

    // Restore prior state (desktop only — mobile always starts hidden).
    if (!isMobile() && localStorage.getItem('sidebarCollapsed') === 'true') {
      sb.classList.add('collapsed');
      if (main) main.classList.add('collapsed');
    }

    btn.addEventListener('click', function () {
      if (isMobile()) {
        // Mobile: toggle expanded drawer.
        sb.classList.toggle('expanded');
        btn.setAttribute('aria-expanded', sb.classList.contains('expanded') ? 'true' : 'false');
      } else {
        sb.classList.toggle('collapsed');
        if (main) main.classList.toggle('collapsed');
        btn.setAttribute('aria-expanded', sb.classList.contains('collapsed') ? 'false' : 'true');
        localStorage.setItem('sidebarCollapsed', sb.classList.contains('collapsed'));
      }
    });

    // Close mobile drawer when a nav link is clicked.
    sb.querySelectorAll('.nav-link').forEach(function (a) {
      a.addEventListener('click', function () {
        if (isMobile()) sb.classList.remove('expanded');
      });
    });

    // Close mobile drawer on outside tap.
    document.addEventListener('click', function (e) {
      if (!isMobile()) return;
      if (!sb.contains(e.target) && sb.classList.contains('expanded')) {
        sb.classList.remove('expanded');
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    // Escape closes the drawer.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sb.classList.contains('expanded')) {
        sb.classList.remove('expanded');
        btn.setAttribute('aria-expanded', 'false');
        btn.focus();
      }
    });
  }

  function isMobile() { return window.matchMedia('(max-width: 640px)').matches; }

  // ---------------------------------------------------------------
  // Filter bar visibility
  // ---------------------------------------------------------------
  function initFilterToggle() {
    var btn = document.getElementById('filterToggleBtn');
    var fb  = document.getElementById('filterBar');
    var arr = document.getElementById('filterArrow');
    if (!btn || !fb) return;

    btn.addEventListener('click', function () {
      var open = fb.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (arr) arr.innerHTML = open ? '&#9650;' : '&#9660;';
    });
  }

  // ---------------------------------------------------------------
  // Date multi-select dropdown
  // ---------------------------------------------------------------
  function initDateDropdown() {
    var wrap  = document.getElementById('ddWrap');
    var btn   = document.getElementById('ddBtn');
    var panel = document.getElementById('ddPanel');
    var search = document.getElementById('ddSearch');
    if (!wrap || !btn || !panel) return;

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = panel.classList.contains('open');
      var rect = btn.getBoundingClientRect();
      panel.style.top  = (rect.bottom + window.scrollY + 4) + 'px';
      panel.style.left = (rect.left  + window.scrollX) + 'px';
      panel.classList.toggle('open', !isOpen);
      btn.setAttribute('aria-expanded', panel.classList.contains('open') ? 'true' : 'false');
    });

    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) {
        panel.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) {
        panel.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        btn.focus();
      }
    });

    if (search) {
      search.addEventListener('input', function () {
        var q = this.value.toLowerCase();
        document.querySelectorAll('#ddList .dd-item').forEach(function (item) {
          item.style.display = item.getAttribute('data-date').indexOf(q) !== -1 ? '' : 'none';
        });
      });
    }
  }

  function buildDateList(dates) {
    state.allDates = dates;
    var list = document.getElementById('ddList');
    if (!list) return;
    list.innerHTML = dates.map(function (d) {
      return '<label class="dd-item" data-date="' + d + '">' +
             '<input type="checkbox" value="' + d + '" checked aria-label="Toggle ' + d + '"> ' +
             d + '</label>';
    }).join('');
    list.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        updateDateLabel();
        if (typeof window.apply === 'function') window.apply();
      });
    });
    updateDateLabel();
  }

  function updateDateLabel() {
    var checked = document.querySelectorAll('#ddList input[type=checkbox]:checked').length;
    var label   = document.getElementById('ddLabel');
    if (!label) return;
    label.textContent = (checked === state.allDates.length || checked === 0)
      ? 'All dates'
      : checked + ' date' + (checked === 1 ? '' : 's');
  }

  function selectAllDates() {
    document.querySelectorAll('#ddList input[type=checkbox]').forEach(function (cb) { cb.checked = true; });
    updateDateLabel();
    if (typeof window.apply === 'function') window.apply();
  }

  function clearAllDates() {
    document.querySelectorAll('#ddList input[type=checkbox]').forEach(function (cb) { cb.checked = false; });
    updateDateLabel();
    if (typeof window.apply === 'function') window.apply();
  }

  function getSelectedDates() {
    var checked = Array.prototype.slice.call(
      document.querySelectorAll('#ddList input[type=checkbox]:checked')
    ).map(function (cb) { return cb.value; });
    return (checked.length === 0 || checked.length === state.allDates.length) ? null : new Set(checked);
  }

  // ---------------------------------------------------------------
  // Data loader
  // ---------------------------------------------------------------
  function setStatus(kind, text) {
    var dot = document.getElementById('statusDot');
    var txt = document.getElementById('statusText');
    if (dot) dot.className = 'status-dot dot-' + kind;
    if (txt) txt.textContent = text;
  }

  function showLoadingSkeleton() {
    document.querySelectorAll('[data-skeleton]').forEach(function (el) {
      el.dataset.originalHtml = el.innerHTML;
      var rows = parseInt(el.getAttribute('data-skeleton'), 10) || 3;
      var html = '';
      for (var i = 0; i < rows; i++) {
        html += '<div class="skeleton" style="height:14px;margin:6px 0;width:' + (60 + Math.random() * 30) + '%;"></div>';
      }
      el.innerHTML = html;
    });
  }

  function hideLoadingSkeleton() {
    document.querySelectorAll('[data-skeleton]').forEach(function (el) {
      if (el.dataset.originalHtml !== undefined) {
        el.innerHTML = el.dataset.originalHtml;
        delete el.dataset.originalHtml;
      }
    });
  }

  function showEmptyState(msg) {
    var host = document.getElementById('emptyState');
    if (!host) return;
    host.innerHTML =
      '<div class="empty-state" role="status">' +
      '<strong>No data yet.</strong>' +
      (msg || 'The dashboard will populate as soon as the first data.json refresh lands.') +
      '</div>';
    host.hidden = false;
  }

  function hideEmptyState() {
    var host = document.getElementById('emptyState');
    if (host) host.hidden = true;
  }

  function showError(msg) {
    var eb = document.getElementById('errorBar');
    if (!eb) return;
    eb.style.display = 'block';
    eb.textContent = msg;
    eb.setAttribute('role', 'alert');
  }

  function hideError() {
    var eb = document.getElementById('errorBar');
    if (eb) { eb.style.display = 'none'; eb.textContent = ''; }
  }

  async function loadData() {
    setStatus('loading', 'Refreshing…');
    showLoadingSkeleton();
    try {
      var res  = await fetch('data.json?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var json = await res.json();
      state.raw = json.rows || [];
      state.fetchedAt = json.fetched_at || '';
      hideLoadingSkeleton();
      hideError();
      setStatus('ok', 'Live · ' + state.fetchedAt + ' · ' + state.raw.length + ' submissions');

      if (state.raw.length === 0) {
        showEmptyState();
      } else {
        hideEmptyState();
      }

      if (typeof state.onData === 'function') state.onData(json);
    } catch (e) {
      hideLoadingSkeleton();
      setStatus('error', 'Fetch failed');
      showError('Could not load data.json: ' + e.message);
    }
  }

  // ---------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------
  window.Dashboard = {
    init: function (opts) {
      state.onData = (opts && opts.onData) || null;
      if (opts && opts.refreshIntervalMs) state.refreshIntervalMs = opts.refreshIntervalMs;

      initSidebar();
      initFilterToggle();
      initDateDropdown();

      loadData();
      if (state.refreshIntervalMs > 0) {
        setInterval(loadData, state.refreshIntervalMs);
      }
    },
    // exposed for page code:
    getRaw:            function () { return state.raw; },
    getAllDates:       function () { return state.allDates.slice(); },
    getSelectedDates:  getSelectedDates,
    buildDateList:     buildDateList,
    updateDateLabel:   updateDateLabel,
    selectAllDates:    selectAllDates,
    clearAllDates:     clearAllDates,
    reload:            loadData
  };

  // Convenience globals for existing inline onclick="" handlers.
  window.ddSelectAll = selectAllDates;
  window.ddClearAll  = clearAllDates;

})(window);
