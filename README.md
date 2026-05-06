# 필상 AI 유해 사이트 탐지 — Chrome Extension

> AI 기반 실시간 피싱·유해 사이트 탐지 크롬 확장 프로그램  
> Chrome Web Store 심사 제출 완료 · 출시 예정

---

## 개요

방문하는 모든 URL을 실시간으로 분석하여 피싱·유해 사이트 여부를 탐지합니다.  
서버 DB 조회(화이트/블랙리스트) → 미등록 URL은 **온디바이스 ONNX 모델 추론**으로 2단계 탐지를 수행합니다.

누적 다운로드 50만+ Android 앱 **싹다잡아**와 동일한 ML 모델을 Web 환경에 이식한 프로젝트입니다.

---

## 탐지 아키텍처

```
사용자가 URL 접속
       │
       ▼
[content.js] URL + HTML 특성 80개 추출
       │
       ▼
[background.js] Service Worker
       │
       ├─ 1단계: 서버 DB 조회 (화이트/블랙리스트)
       │         ├─ 화이트리스트 → 안전 (prob = 0)
       │         └─ 블랙리스트  → 위험 (prob = 1)
       │
       └─ 2단계: DB 미등록 → 로컬 ONNX 추론
                 └─ [offscreen.js] CatBoost ONNX (WASM) 실행
                           │
                           ▼
                    악성 확률 0.0 ~ 1.0 반환

결과 처리
  prob < 0.2  → 🟢 안전  (초록 아이콘)
  prob < 0.5  → 🔵 주의  (파랑 아이콘)
  prob < 0.8  → 🟠 경고  (주황 알림)
  prob ≥ 0.8  → 🔴 위험  (경고 페이지 리디렉션)
```

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **실시간 URL 탐지** | 모든 탭 이동 시 자동 분석 |
| **온디바이스 추론** | ONNX Runtime WASM — 개인정보 서버 미전송 |
| **2단계 탐지** | 서버 DB 우선 조회 → 미등록 시 로컬 모델 fallback |
| **경고 페이지 리디렉션** | 고위험(≥80%) URL 접속 시 경고 페이지로 전환 |
| **알림 시스템** | 중위험(≥70%) URL Chrome 알림 |
| **탐지 이력 관리** | 최근 200건 저장, URL/도메인 중복 방지 |
| **탭별 승인** | 사용자가 위험 판단 후 수동 승인 가능 |
| **아이콘 컬러 코딩** | 확률 구간별 실시간 아이콘 색상 표시 |

---

## 기술 스택

```
Chrome Extension  Manifest V3
ML Model          CatBoost → ONNX 변환
Inference         ONNX Runtime Web (WASM, 단일 스레드)
Feature Eng.      URL 특성 + HTML DOM 특성 총 80개
API Auth          HMAC-SHA256 (Web Crypto API)
Storage           chrome.storage.local / session
```

---

## 특성 추출 (80개)

`content.js`에서 Shannon Entropy 기반으로 URL과 HTML DOM을 분석합니다.

**URL 특성 (~30개)**
- URL 엔트로피, 문자 비율, HTTPS 여부, 길이 계열
- 서브도메인 수/길이, TLD 엔트로피
- 경로 깊이, 쿼리 파라미터 키/값 엔트로피
- 컴포넌트별 최대·평균 엔트로피

**HTML 특성 (~50개)**
- 태그 수, 링크 수, 내부/외부 링크 비율
- 인라인 스크립트 수, Base64 문자열 수
- 폼·입력 필드 수, hidden input 비율
- DOM 분기 계수, 반복 서브트리 비율
- HTML 전체 문자/라인 엔트로피

---

## 프로젝트 구조

```
확장프로그램_v2/
├── manifest.json          # Manifest V3 설정
├── background.js          # Service Worker (탐지 로직, API 통신)
├── content.js             # 특성 추출 (URL + HTML 80개)
├── offscreen.js           # ONNX Runtime 추론 (Offscreen Document)
├── offscreen.html         # Offscreen Document 진입점
├── popup.html / popup.js / popup.css  # 확장 팝업 UI
├── warning.html / warning.js          # 고위험 경고 페이지
├── model/
│   └── CatBoost_merged.onnx  # 변환된 추론 모델
├── lib/
│   ├── ort.min.js            # ONNX Runtime Web
│   ├── ort-wasm-simd.wasm
│   └── ort-wasm.wasm
└── icons/                    # 확장 아이콘 및 캐릭터 이미지
```

---

## Manifest V3 설계 포인트

Chrome MV3에서는 Service Worker가 DOM에 직접 접근할 수 없습니다.  
ONNX Runtime WASM을 Service Worker 내에서 실행할 수 없는 제약을 **Offscreen Document**로 해결했습니다.

```
Service Worker (background.js)
  └─ chrome.offscreen.createDocument()
       └─ Offscreen Document (offscreen.js)
             └─ ort.InferenceSession (WASM 추론)
```

모델 준비 상태는 PING/PONG 메시지로 확인 후 추론 요청을 전달합니다.

---

## 개발 환경 설정

```bash
git clone https://github.com/hazzyAI/pillsang-phishing-extension.git
cd pillsang-phishing-extension
npm install   # obfuscation 도구 설치 (선택)
```

Chrome에서 로드:
1. `chrome://extensions` 접속
2. **개발자 모드** 활성화
3. **압축해제된 확장 프로그램 로드** → 프로젝트 루트 폴더 선택

---

## 관련 프로젝트

- **싹다잡아 Android** — 동일 모델 탑재, 누적 다운로드 50만+ ([Google Play](https://play.google.com/store))
- **필상 (Pillsang)** — 피싱 탐지 보안 스타트업

---

## 라이선스

본 프로젝트는 포트폴리오 목적으로 공개합니다.  
상업적 이용 및 모델 파일 재배포는 금지합니다.

© 2025 Jungmin Ha · 필상
