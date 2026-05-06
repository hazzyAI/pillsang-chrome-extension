(function () {
  const params = new URLSearchParams(location.search);
  const blockedUrl = params.get('url') || '';
  const prob = params.get('prob') || '?';
  const tabId = Number(params.get('tabId')) || null;

  document.getElementById('blocked-url').textContent = blockedUrl || '알 수 없는 URL';
  document.getElementById('prob-badge').textContent = `악성 확률: ${prob}%`;

  document.getElementById('btn-back').addEventListener('click', () => {
    if (history.length > 2) {
      history.go(-2);
    } else {
      window.close();
    }
  });

  document.getElementById('btn-proceed').addEventListener('click', () => {
    if (!blockedUrl) return;
    if (!confirm('이 사이트는 유해 사이트일 수 있습니다. 정말 계속 진행하시겠습니까?')) return;

    // background에 이 URL 승인 등록 후 이동 (재차단 방지)
    const doNavigate = () => { location.href = blockedUrl; };

    if (tabId) {
      chrome.runtime.sendMessage({ type: 'APPROVE_URL', url: blockedUrl, tabId }, doNavigate);
    } else {
      doNavigate();
    }
  });
})();
