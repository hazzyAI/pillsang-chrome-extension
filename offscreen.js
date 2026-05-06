// 필상 AI 피싱 탐지 - Offscreen Document (ONNX 추론 전담)

let session = null;
let modelReady = false;
let loadError = null;

ort.env.wasm.wasmPaths = {
  'ort-wasm-simd.wasm': chrome.runtime.getURL('lib/ort-wasm-simd.wasm'),
  'ort-wasm.wasm':      chrome.runtime.getURL('lib/ort-wasm.wasm'),
};
ort.env.wasm.numThreads = 1;

async function loadModel() {
  try {
    const url = chrome.runtime.getURL('model/CatBoost_merged.onnx');
    const buf = await fetch(url).then(r => r.arrayBuffer());
    session = await ort.InferenceSession.create(buf, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
    modelReady = true;
    console.log('[필상] 모델 준비 완료. 입력:', session.inputNames, '출력:', session.outputNames);
  } catch (e) {
    loadError = e?.message || String(e);
    console.error('[필상] 모델 로드 실패:', loadError);
  }
}

async function infer(vector) {
  if (!modelReady) throw new Error(loadError || '모델 로드 중...');

  const inputName = session.inputNames[0];
  const tensor = new ort.Tensor('float32', new Float32Array(vector), [1, vector.length]);
  const results = await session.run({ [inputName]: tensor });

  for (const name of session.outputNames) {
    const out = results[name];
    if (!out?.dims) continue;
    if (out.dims.length === 2 && out.dims[1] === 2) return Number(out.data[1]);
  }

  for (const name of session.outputNames) {
    const out = results[name];
    if (!out?.dims) continue;
    if (out.dims.length === 1) return Number(out.data[0]) === 1 ? 0.9 : 0.01;
  }

  return 0;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.target !== 'offscreen') return false;

  if (msg.type === 'PING') {
    sendResponse({ ok: true, ready: modelReady, error: loadError });
    return false;
  }

  if (msg.type === 'INFER') {
    infer(msg.vector)
      .then(prob => sendResponse({ prob }))
      .catch(e  => sendResponse({ error: e.message }));
    return true;
  }
});

loadModel();
