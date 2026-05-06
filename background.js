// 필상 AI 유해 사이트 탐지 - Background Service Worker

const MAX_HISTORY = 200;
const API_BASE = 'https://s-www.pillsang.kr';
const SECRET_KEY = 'YOUR_HMAC_SECRET_KEY'; // 실제 키는 배포 빌드에서 주입

async function buildHeaders() {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomUUID();
  const message = timestamp + nonce;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const buf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  const signature = Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return {
    'X-EXT-TIMESTAMP': timestamp,
    'X-EXT-NONCE': nonce,
    'X-EXT-SIGNATURE': signature,
    'Content-Type': 'application/json',
  };
}

async function querySelectList(url) {
  try {
    const parsed = new URL(url);
    const full_domain = parsed.hostname;
    const main_domain = parsed.hostname;
    const headers = await buildHeaders();
    console.log('[필상] API 요청:', url);
    const res = await fetch(`${API_BASE}/api/select-list`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ full_url: url, full_domain, main_domain }),
    });
    if (!res.ok) {
      console.warn('[필상] API 실패:', res.status);
      return null;
    }
    const data = await res.json();
    console.log('[필상] API 응답:', data);
    return data.select_result ?? null;
  } catch (e) {
    console.warn('[필상] API 오류:', e.message);
    return null;
  }
}

async function getThresholds() {
  const d = await chrome.storage.local.get({ notifyThreshold: 70, warnThreshold: 80 });
  return { NOTIFY: d.notifyThreshold / 100, WARN: d.warnThreshold / 100 };
}

const HISTORY_DEDUP_MS = 30 * 60 * 1000;  // 같은 URL 30분 이내 재방문 → 롤링 갱신
const DOMAIN_DEDUP_MS  =  2 * 60 * 1000;  // 같은 도메인 2분 이내 → 중복 방지 (리디렉션·재로드)

let _historyLock = false;
async function saveHistory(entry) {
  // 동시 호출 직렬화 (경쟁 조건 방지)
  while (_historyLock) await new Promise(r => setTimeout(r, 30));
  _historyLock = true;
  try {
    const d = await chrome.storage.local.get({ detectionHistory: [] });
    const history = d.detectionHistory;

    const cutoff30 = entry.timestamp - HISTORY_DEDUP_MS;
    const cutoff2  = entry.timestamp - DOMAIN_DEDUP_MS;
    const entryHost = getHostname(entry.url);

    // 1순위: 같은 전체 URL을 30분 이내 재방문 → 롤링 갱신
    let recentIdx = history.findIndex(h => h.url === entry.url && h.timestamp > cutoff30);

    // 2순위: 같은 도메인을 2분 이내 재탐지 (리디렉션·재로드) → 갱신 (중복 방지)
    if (recentIdx < 0 && entryHost) {
      recentIdx = history.findIndex(h => getHostname(h.url) === entryHost && h.timestamp > cutoff2);
    }

    if (recentIdx >= 0) {
      history[recentIdx] = entry;
      history.unshift(history.splice(recentIdx, 1)[0]);
    } else {
      history.unshift(entry);
      if (history.length > MAX_HISTORY) history.splice(MAX_HISTORY);
    }

    await chrome.storage.local.set({ detectionHistory: history });
  } finally {
    _historyLock = false;
  }
}

let offscreenPromise = null;

async function ensureOffscreen() {
  if (offscreenPromise) return offscreenPromise;
  offscreenPromise = (async () => {
    try { if (await chrome.offscreen.hasDocument()) return; } catch {}
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL('offscreen.html'),
      reasons: ['DOM_SCRAPING'],
      justification: 'ONNX Runtime WASM phishing inference',
    });
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        const pong = await msgOffscreen({ type: 'PING' });
        if (pong?.ready) { console.log(`[필상] 모델 준비 완료 (${i + 1}초)`); return; }
      } catch {}
    }
    throw new Error('offscreen 모델 로드 타임아웃');
  })();
  // 실패 시 다음 호출에서 재시도 가능하도록 Promise 초기화
  offscreenPromise.catch(() => { offscreenPromise = null; });
  return offscreenPromise;
}

function msgOffscreen(payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ target: 'offscreen', ...payload }, resp => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      resolve(resp);
    });
  });
}

async function runInference(vector) {
  await ensureOffscreen();
  const resp = await msgOffscreen({ type: 'INFER', vector });
  if (!resp) throw new Error('offscreen 응답 없음');
  if (resp.error) throw new Error(resp.error);
  return resp;
}

// 아이콘 우하단에 컬러 점 표시
async function setIconDot(tabId, dotColor) {
  try {
    const size = 48;
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');

    const blob = await fetch(chrome.runtime.getURL('icons/icon48.png')).then(r => r.blob());
    const bitmap = await createImageBitmap(blob);
    ctx.drawImage(bitmap, 0, 0, size, size);

    // 우하단 작은 원
    const cx = size - 11, cy = size - 11, r = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = dotColor;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    const imageData = ctx.getImageData(0, 0, size, size);
    await chrome.action.setIcon({ imageData, tabId });
    await chrome.action.setBadgeText({ text: '', tabId });
  } catch (e) {
    console.warn('[필상] 아이콘 점 설정 실패:', e.message);
  }
}

// 기본 아이콘으로 초기화
async function resetIcon(tabId) {
  try {
    await chrome.action.setIcon({ path: { 48: 'icons/icon48.png' }, tabId });
    await chrome.action.setBadgeText({ text: '', tabId });
  } catch {}
}

function getHostname(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

async function isApproved(tabId, url) {
  const hostname = getHostname(url);
  if (!hostname) return false;
  const data = await chrome.storage.session.get(`approved_${tabId}`);
  return (data[`approved_${tabId}`] || []).includes(hostname);
}

async function isNotified(tabId, url) {
  const hostname = getHostname(url);
  if (!hostname) return false;
  const data = await chrome.storage.session.get(`notified_${tabId}`);
  return (data[`notified_${tabId}`] || []).includes(hostname);
}

async function markNotified(tabId, url) {
  const hostname = getHostname(url);
  if (!hostname) return;
  const data = await chrome.storage.session.get(`notified_${tabId}`);
  const list = data[`notified_${tabId}`] || [];
  if (!list.includes(hostname)) list.push(hostname);
  await chrome.storage.session.set({ [`notified_${tabId}`]: list });
}

async function isDetectEnabled() {
  const data = await chrome.storage.local.get('detectEnabled');
  return data.detectEnabled !== false;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.target === 'offscreen') return false;

  if (msg.type === 'APPROVE_URL') {
    const { tabId, url } = msg;
    if (!tabId) { sendResponse({ ok: false }); return false; }
    const hostname = getHostname(url);
    if (!hostname) { sendResponse({ ok: false }); return false; }
    chrome.storage.session.get(`approved_${tabId}`).then(data => {
      const list = data[`approved_${tabId}`] || [];
      if (!list.includes(hostname)) list.push(hostname);
      chrome.storage.session.set({ [`approved_${tabId}`]: list });
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type !== 'FEATURES') return false;

  const tabId = sender.tab?.id;
  if (!tabId) return false;

  (async () => {
    try {
      if (!(await isDetectEnabled())) {
        await resetIcon(tabId);
        sendResponse({ ok: true });
        return;
      }

      const { NOTIFY, WARN } = await getThresholds();
      const timestamp = Date.now();

      // 1단계: 서버 DB 조회
      const selectResult = await querySelectList(msg.url);
      const isExist = selectResult?.is_exist === true;
      const listType = selectResult?.list ?? '';

      let prob, isMalicious;

      if (isExist) {
        // 화이트리스트 → 안전 (prob 0)
        // 블랙리스트 → 위험 (prob 1)
        const isWhite = listType.includes('white');
        prob = isWhite ? 0 : 1;
        isMalicious = !isWhite;
      } else {
        // 2단계: 서버 DB에 없으면 로컬 모델 추론
        const result = await runInference(msg.vector);
        prob = result.prob;
        isMalicious = prob >= WARN;
      }

      await chrome.storage.session.set({
        [`result_${tabId}`]: { url: msg.url, prob, isMalicious, timestamp, error: null, selectResult },
      });

      await saveHistory({ url: msg.url, prob, isMalicious, timestamp });

      const dotColor = prob < 0.2 ? '#388e3c'
                     : prob < 0.5 ? '#0288d1'
                     : prob < 0.8 ? '#ef6c00'
                     :              '#c62828';
      await setIconDot(tabId, dotColor);

      const approved = await isApproved(tabId, msg.url);
      const pct = Math.round(prob * 100);

      const { notifyEnabled, warnEnabled } = await chrome.storage.local.get({ notifyEnabled: true, warnEnabled: true });

      if (prob >= WARN && !approved && warnEnabled) {
        const warningUrl = chrome.runtime.getURL('warning.html')
          + '?url=' + encodeURIComponent(msg.url)
          + '&prob=' + pct
          + '&tabId=' + tabId;
        chrome.tabs.update(tabId, { url: warningUrl }).catch(() => {});
      } else if (prob >= NOTIFY && !approved && notifyEnabled && !(await isNotified(tabId, msg.url))) {
        await markNotified(tabId, msg.url);
        chrome.notifications.create(`phishing_${tabId}_${Date.now()}`, {
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon48.png'),
          title: '⚠ 유해 사이트 의심',
          message: `악성 확률 ${pct}% — 개인정보 입력에 주의하세요.`,
          contextMessage: msg.url.length > 60 ? msg.url.slice(0, 60) + '…' : msg.url,
          priority: 2,
        });
      }

      sendResponse({ ok: true });
    } catch (e) {
      console.error('[필상] 추론 실패:', e.message);
      await chrome.storage.session.set({
        [`result_${tabId}`]: { url: msg.url, prob: null, isMalicious: null, timestamp: Date.now(), error: e.message },
      });
      await resetIcon(tabId);
      sendResponse({ ok: false, error: e.message });
    }
  })();

  return true;
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'loading') return;

  resetIcon(tabId);
  chrome.storage.session.remove(`result_${tabId}`).catch(() => {});

  const newUrl = changeInfo.url || tab.url || '';
  if (newUrl.startsWith(chrome.runtime.getURL('warning.html'))) return;

  const newHostname = getHostname(newUrl);
  if (!newHostname) return;

  const data = await chrome.storage.session.get([`approved_${tabId}`, `notified_${tabId}`]);
  const approved = data[`approved_${tabId}`] || [];
  const notified = data[`notified_${tabId}`] || [];

  if (!approved.includes(newHostname)) {
    chrome.storage.session.remove(`approved_${tabId}`).catch(() => {});
  }
  if (!notified.includes(newHostname)) {
    chrome.storage.session.remove(`notified_${tabId}`).catch(() => {});
  }
});

ensureOffscreen().catch(e => console.warn('[필상] offscreen 초기화 실패:', e.message));
