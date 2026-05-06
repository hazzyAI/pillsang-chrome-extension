// 필상 AI 유해 사이트 탐지 - Popup Script

const STATES = ['loading', 'result', 'error', 'waiting', 'off'];

function showState(id) {
  for (const s of STATES) {
    document.getElementById(`state-${s}`).classList.toggle('hidden', s !== id);
  }
}

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toTimeString().slice(0, 8);
}

function renderResult(result) {
  if (!result) { showState('waiting'); return; }

  if (result.error) {
    showState('error');
    document.getElementById('error-text').textContent = result.error;
    return;
  }

  showState('result');

  const { prob, isMalicious, url, timestamp } = result;
  const pct = Math.round(prob * 1000) / 10;

  const catKey   = getCatKey(prob);
  const catColor = getCatColor(catKey);

  document.getElementById('verdict-card').className = `verdict-card verdict-${catKey}`;

  const labelMap = { safe: '안전', ok: '비교적 안전', suspect: '유해 의심', danger: '유해 사이트' };
  const iconMap  = { safe: 'character_safe', ok: 'character_ok', suspect: 'character_danger', danger: 'character_danger' };

  document.getElementById('verdict-icon').innerHTML =
    `<img src="icons/${iconMap[catKey]}.webp" class="verdict-character">`;
  const labelEl = document.getElementById('verdict-label');
  labelEl.textContent  = labelMap[catKey];
  labelEl.style.color  = catColor;

  const bar = document.getElementById('prob-bar');
  bar.style.width      = `${Math.min(prob * 100, 100)}%`;
  bar.style.background = catColor;

  document.getElementById('prob-text').textContent = `악성 확률: ${pct}%`;

  const displayUrl = url || '-';
  const urlEl = document.getElementById('url-text');
  urlEl.textContent = displayUrl.length > 80 ? displayUrl.slice(0, 80) + '…' : displayUrl;
  urlEl.title = displayUrl;

  document.getElementById('time-text').textContent = `분석: ${formatTime(timestamp)}`;
}

function isHttp(url) {
  return url.startsWith('http://') || url.startsWith('https://');
}

async function injectContentScript(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => { window.__pilsang_cancel = true; window.__pilsang_running = false; },
  });
  await new Promise(r => setTimeout(r, 60));
  await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
}

async function waitForResult(key) {
  let done = false;

  const listener = (changes, area) => {
    if (area !== 'session' || !changes[key]) return;
    done = true;
    chrome.storage.onChanged.removeListener(listener);
    renderResult(changes[key].newValue || null);
  };
  chrome.storage.onChanged.addListener(listener);

  for (let i = 0; i < 150; i++) {
    await new Promise(r => setTimeout(r, 400));
    if (done) return;
    const d = await chrome.storage.session.get(key);
    if (d[key]) {
      done = true;
      chrome.storage.onChanged.removeListener(listener);
      renderResult(d[key]);
      return;
    }
  }

  chrome.storage.onChanged.removeListener(listener);
  showState('waiting');
}

async function loadResult() {
  showState('loading');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !isHttp(tab.url || '')) { showState('waiting'); return; }

    const key = `result_${tab.id}`;
    const data = await chrome.storage.session.get(key);
    if (data[key]) { renderResult(data[key]); return; }

    try { await injectContentScript(tab.id); } catch { /* scripting 불가 탭 */ }
    await waitForResult(key);
  } catch (e) {
    showState('error');
    document.getElementById('error-text').textContent = e.message;
  }
}

async function reanalyze() {
  showState('loading');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !isHttp(tab.url || '')) { showState('waiting'); return; }

    const key = `result_${tab.id}`;
    await chrome.storage.session.remove(key);
    await injectContentScript(tab.id);
    await waitForResult(key);
  } catch (e) {
    showState('error');
    document.getElementById('error-text').textContent = e.message;
  }
}

// ── 탭 전환 ──
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
    if (btn.dataset.tab === 'history') {
      currentPeriod = 'daily';
      document.querySelectorAll('.sub-tab-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.period === 'daily'));
      renderHistory();
    }
  });
});

// ── 도넛 차트 ──

// 라이트 모드: 약간 진한 색 / 다크 모드: 약간 밝은 색
const CAT_COLORS = {
  light: { safe: '#388e3c', ok: '#0288d1', suspect: '#ef6c00', danger: '#c62828' },
  dark:  { safe: '#66bb6a', ok: '#4fc3f7', suspect: '#ffa726', danger: '#ef5350' },
};
function getCatColor(key) {
  return (document.body.classList.contains('dark') ? CAT_COLORS.dark : CAT_COLORS.light)[key];
}

const CATEGORIES = [
  { key: 'safe',    label: '안전',        test: p => p < 0.2 },
  { key: 'ok',      label: '비교적 안전',  test: p => p < 0.5 },
  { key: 'suspect', label: '유해 의심',    test: p => p < 0.8 },
  { key: 'danger',  label: '유해 사이트',  test: () => true  },
];

function getCatKey(prob) {
  return prob < 0.2 ? 'safe' : prob < 0.5 ? 'ok' : prob < 0.8 ? 'suspect' : 'danger';
}

let activeFilter = null;  // 현재 선택된 필터 카테고리

// 도넛 중앙 서브 텍스트
function setDonutSub(key) {
  const subEl = document.querySelector('.donut-sub');
  if (!subEl) return;
  const dc = getCatColor('danger');
  const sc = getCatColor('suspect');
  subEl.innerHTML =
    `<span data-cat="danger"  style="color:${dc};${key === 'danger'  ? 'font-weight:800' : ''};cursor:pointer">유해</span>` +
    `<span style="color:#bdbdbd">/</span>` +
    `<span data-cat="suspect" style="color:${sc};${key === 'suspect' ? 'font-weight:800' : ''};cursor:pointer">의심</span>`;
}

// 도넛 세그먼트·범례·중앙텍스트 통합 하이라이트
function applySegHover(key) {
  document.querySelectorAll('#donut-legend li').forEach(li => {
    li.classList.toggle('seg-hover', li.dataset.cat === key);
    li.classList.toggle('seg-hover-inactive', li.dataset.cat !== key);
  });
  document.querySelectorAll('#donut-svg .donut-seg').forEach(seg => {
    seg.style.opacity = seg.dataset.cat === key ? '1' : '0.3';
  });
  setDonutSub(key);
}

function clearSegHover() {
  document.querySelectorAll('#donut-legend li').forEach(li => {
    li.classList.remove('seg-hover', 'seg-hover-inactive');
  });
  document.querySelectorAll('#donut-svg .donut-seg').forEach(seg => {
    seg.style.opacity = '';
  });
  setDonutSub(null);
}

function renderDonut(history) {
  setDonutSub(null);  // 재호출 시 서브텍스트 항상 초기화
  const counts = CATEGORIES.map(() => 0);
  history.forEach(item => {
    const idx = CATEGORIES.findIndex(c => c.test(item.prob));
    if (idx >= 0) counts[idx]++;
  });

  const total = history.length;
  const dangerCount = counts[2] + counts[3];
  document.getElementById('donut-num').innerHTML = `${dangerCount}<span class="donut-unit">건</span>`;

  // SVG 도넛
  const svg = document.getElementById('donut-svg');
  const cx = 60, cy = 60, r = 44, sw = 16;
  const circ = 2 * Math.PI * r;
  const visibleCount = counts.filter(c => c > 0).length;
  const GAP = visibleCount > 1 ? 2 : 0;

  const trackColor = document.body.classList.contains('dark') ? '#2e2e50' : '#e0e0e0';
  let svgHtml = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${trackColor}" stroke-width="${sw}"/>`;

  if (total > 0) {
    let offset = 0;
    CATEGORIES.forEach((cat, i) => {
      const len = (counts[i] / total) * circ;
      if (len <= 0) return;
      const segLen = Math.max(0.1, len - GAP);
      svgHtml += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
        stroke="${getCatColor(cat.key)}" stroke-width="${sw}"
        stroke-dasharray="${segLen} ${circ - segLen}"
        stroke-dashoffset="${-offset}"
        transform="rotate(-90 ${cx} ${cy})"
        class="donut-seg" data-cat="${cat.key}" style="cursor:pointer"/>`;
      offset += len;
    });
  }
  svg.innerHTML = svgHtml;

  // 도넛 세그먼트 hover & 클릭
  svg.querySelectorAll('.donut-seg').forEach(seg => {
    const key = seg.dataset.cat;
    seg.addEventListener('mouseenter', () => applySegHover(key));
    seg.addEventListener('mouseleave', () => clearSegHover());
    seg.addEventListener('click', () => {
      activeFilter = activeFilter === key ? null : key;
      chrome.storage.local.get({ detectionHistory: [] }, ({ detectionHistory }) => {
        renderDonut(detectionHistory);
        renderHistoryList(detectionHistory);
      });
    });
  });

  // 범례 (클릭 필터)
  const legend = document.getElementById('donut-legend');
  legend.innerHTML = CATEGORIES.map((cat, i) => {
    const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
    const isActive = activeFilter === cat.key;
    const isInactive = activeFilter !== null && !isActive;
    const color = getCatColor(cat.key);
    return `<li data-cat="${cat.key}" class="${isActive ? 'filter-active' : ''} ${isInactive ? 'filter-inactive' : ''}" style="cursor:pointer">
      <span class="legend-dot" style="background:${color}"></span>
      <span class="legend-label" style="color:${color}">${cat.label}</span>
      <span class="legend-stat">${counts[i]}건<span class="legend-pct" style="color:${color}">${pct}%</span></span>
    </li>`;
  }).join('');

  // 범례 클릭 이벤트
  legend.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      const key = li.dataset.cat;
      activeFilter = activeFilter === key ? null : key;
      chrome.storage.local.get({ detectionHistory: [] }, ({ detectionHistory }) => {
        renderDonut(detectionHistory);
        renderHistoryList(detectionHistory);
      });
    });
  });
}

// ── 히스토리 렌더링 ──
function getHostname(url) {
  try { return new URL(url).hostname; } catch { return url; }
}

function formatDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = d.toTimeString().slice(0, 5);
  if (isToday) return `오늘 ${time}`;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd} ${time}`;
}

const HISTORY_DISPLAY_LIMIT = 100;  // 리스트 표시 최대 건수

function renderHistoryList(history) {
  const listEl = document.getElementById('history-list');
  const allFiltered = activeFilter ? history.filter(item => getCatKey(item.prob) === activeFilter) : history;
  const filtered = allFiltered.slice(0, HISTORY_DISPLAY_LIMIT);

  // 필터 라벨 표시
  const dividerSpan = document.querySelector('.history-divider span');
  const dividerEl = document.querySelector('.history-divider');
  if (dividerSpan) {
    if (activeFilter) {
      const cat = CATEGORIES.find(c => c.key === activeFilter);
      const color = getCatColor(cat.key);
      dividerSpan.textContent = `${cat.label} 기록 (총 ${allFiltered.length}건)`;
      dividerSpan.style.color = color;
      if (dividerEl) dividerEl.style.setProperty('--divider-accent', color);
    } else {
      dividerSpan.textContent = `최근 탐지 기록 (총 ${history.length}건)`;
      dividerSpan.style.color = '';
      if (dividerEl) dividerEl.style.removeProperty('--divider-accent');
    }
  }

  if (!filtered.length) {
    const msg = activeFilter ? '해당 카테고리의 기록이 없습니다' : '탐지 기록이 없습니다';
    listEl.innerHTML = `<div class="history-empty"><span>🛡️</span><span>${msg}</span></div>`;
    return;
  }

  listEl.innerHTML = filtered.map(item => {
    const pct = Math.round(item.prob * 100);
    const cat = getCatKey(item.prob);
    const safeUrl = item.url.replace(/"/g, '&quot;');
    return `
      <div class="history-item" data-url="${safeUrl}" style="cursor:pointer">
        <div class="history-dot hist-${cat}"></div>
        <div class="history-info">
          <span class="history-url" title="${safeUrl}">${getHostname(item.url)}</span>
          <span class="history-time">${formatDate(item.timestamp)}</span>
        </div>
        <span class="history-prob hist-${cat}">${pct}%</span>
      </div>`;
  }).join('');

  // 클릭 시 해당 URL로 새 탭 열기
  listEl.querySelectorAll('.history-item[data-url]').forEach(el => {
    el.addEventListener('click', () => {
      const url = el.dataset.url;
      if (url) chrome.tabs.create({ url });
    });
  });
}

let currentPeriod = 'daily';  // 'daily' | 'weekly'

function filterByPeriod(history) {
  const now = Date.now();
  if (currentPeriod === 'daily') {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return history.filter(item => item.timestamp >= startOfDay.getTime());
  }
  // weekly: 최근 7일
  return history.filter(item => item.timestamp >= now - 7 * 24 * 60 * 60 * 1000);
}

function renderHistory() {
  activeFilter = null;
  chrome.storage.local.get({ detectionHistory: [] }, ({ detectionHistory }) => {
    const periodFiltered = filterByPeriod(detectionHistory);
    renderDonut(periodFiltered);
    renderHistoryList(periodFiltered);
  });
}

// 하위 탭 클릭
document.querySelectorAll('.sub-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPeriod = btn.dataset.period;
    renderHistory();
  });
});

document.getElementById('btn-clear-history').addEventListener('click', () => {
  if (!confirm('히스토리를 모두 삭제할까요?')) return;
  chrome.storage.local.set({ detectionHistory: [] }, renderHistory);
});

// ── 임계값 슬라이더 ──
const notifySlider   = document.getElementById('notify-threshold');
const notifySliderVal = document.getElementById('notify-threshold-val');
const warnSlider     = document.getElementById('warn-threshold');
const warnSliderVal  = document.getElementById('warn-threshold-val');

chrome.storage.local.get({ notifyThreshold: 70, warnThreshold: 80 }, ({ notifyThreshold, warnThreshold }) => {
  notifySlider.value    = notifyThreshold;
  notifySliderVal.textContent = `${notifyThreshold}%`;
  warnSlider.value      = warnThreshold;
  warnSliderVal.textContent   = `${warnThreshold}%`;
});

notifySlider.addEventListener('input', () => {
  const val = Number(notifySlider.value);
  // 알림 임계값은 차단 임계값보다 클 수 없음
  if (val >= Number(warnSlider.value)) { warnSlider.value = Math.min(val + 5, 95); warnSliderVal.textContent = `${warnSlider.value}%`; }
  notifySliderVal.textContent = `${val}%`;
  chrome.storage.local.set({ notifyThreshold: val, warnThreshold: Number(warnSlider.value) });
});

warnSlider.addEventListener('input', () => {
  const val = Number(warnSlider.value);
  // 차단 임계값은 알림 임계값보다 작을 수 없음
  if (val <= Number(notifySlider.value)) { notifySlider.value = Math.max(val - 5, 50); notifySliderVal.textContent = `${notifySlider.value}%`; }
  warnSliderVal.textContent = `${val}%`;
  chrome.storage.local.set({ warnThreshold: val, notifyThreshold: Number(notifySlider.value) });
});

// ── 설정 토글 초기화 ──
const notifyEl = document.getElementById('toggle-notify');
const warnEl   = document.getElementById('toggle-warn');
const darkEl   = document.getElementById('toggle-dark');

chrome.storage.local.get({ notifyEnabled: true, warnEnabled: true, darkMode: false }, ({ notifyEnabled, warnEnabled, darkMode }) => {
  notifyEl.checked = notifyEnabled;
  warnEl.checked   = warnEnabled;
  darkEl.checked   = darkMode;
  applyDarkMode(darkMode);
});

notifyEl.addEventListener('change', () => {
  chrome.storage.local.set({ notifyEnabled: notifyEl.checked });
});
warnEl.addEventListener('change', () => {
  chrome.storage.local.set({ warnEnabled: warnEl.checked });
});
darkEl.addEventListener('change', () => {
  chrome.storage.local.set({ darkMode: darkEl.checked });
  applyDarkMode(darkEl.checked);
});

function applyDarkMode(enabled) {
  document.body.classList.toggle('dark', enabled);
}

function syncSettingToggles(enabled) {
  [notifyEl, warnEl].forEach(el => {
    el.disabled = !enabled;
    el.closest('.setting-item').classList.toggle('disabled', !enabled);
  });
}

// ── 초기화 ──
const toggleEl = document.getElementById('toggle-detect');

document.getElementById('btn-reanalyze').addEventListener('click', () => {
  if (toggleEl.checked) reanalyze();
});

chrome.storage.local.get('detectEnabled', ({ detectEnabled }) => {
  const enabled = detectEnabled !== false;
  toggleEl.checked = enabled;
  syncSettingToggles(enabled);
  if (enabled) loadResult(); else showState('off');
});

toggleEl.addEventListener('change', () => {
  const enabled = toggleEl.checked;
  chrome.storage.local.set({ detectEnabled: enabled });
  syncSettingToggles(enabled);
  if (enabled) loadResult(); else showState('off');
});

// 도넛 중앙 "유해/의심" 텍스트 hover → 도넛+범례 연동 (이벤트 위임)
const donutCenterEl = document.querySelector('.donut-center-text');
if (donutCenterEl) {
  donutCenterEl.addEventListener('mouseover', (e) => {
    const span = e.target.closest('[data-cat]');
    if (span) applySegHover(span.dataset.cat);
  });
  donutCenterEl.addEventListener('mouseleave', () => clearSegHover());
}
