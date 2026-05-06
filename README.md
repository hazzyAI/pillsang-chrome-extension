# 필상 AI 유해 사이트 탐지 — Chrome Extension

> AI 기반 실시간 피싱·유해 사이트 탐지 크롬 확장 프로그램  
> Chrome Web Store 심사 제출 완료 · 출시 예정

방문하는 모든 URL을 실시간으로 분석하여 **서버 DB 조회(화이트/블랙리스트) → 온디바이스 ONNX 추론**의 2단계로 피싱·유해 사이트를 탐지합니다.

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
       │         ├─ 화이트리스트 → 안전 표시 (prob = 0%)
       │         └─ 블랙리스트  → 위험 표시 (prob = 100%)
       │
       └─ 2단계: DB 미등록 → 로컬 ONNX 추론
                 └─ [offscreen.js] CatBoost ONNX (WASM)
                           │
                           ▼
                    악성 확률 0.0 ~ 1.0 반환

────────────────────────────────────────
팝업 표시 상태
  0  ~ 20% → 🟢 안전
  21 ~ 50% → 🔵 비교적 안전
  51 ~ 70% → 🟠 유해 의심
  71%+     → 🔴 유해 사이트

액션 (사용자 설정 가능)
  ≥ 70% (기본) → Chrome 알림 표시
  ≥ 80% (기본) → 경고 페이지 리디렉션
```

---

## 주요 화면

### 안전 — 서버 DB 화이트리스트 확인 / 모델 추론 안전

| 화이트리스트 안전 (prob 0%) | 모델 추론 안전 (0~20%) | 비교적 안전 (21~50%) |
|:---:|:---:|:---:|
| ![whitelist_safe](assets/screenshots/01.png) | ![model_safe](assets/screenshots/02.png) | ![safe_26](assets/screenshots/03.png) |

- **화이트리스트 안전**: 서버 DB에 등록된 신뢰 도메인 — 모델 추론 없이 즉시 안전 판정
- **모델 추론 안전**: 서버 DB 미등록 → 로컬 ONNX 추론 결과 0~20%
- **비교적 안전**: 추론 결과 21~50%, 주의 권고

---

### 유해 의심 (51~70%) — 팝업 + Chrome 알림

| 확장 팝업 (74.3%) | Chrome 알림 (≥70% 기본 임계값) |
|:---:|:---:|
| ![suspect_popup](assets/screenshots/06.png) | ![notification](assets/screenshots/04.png) |

- 팝업에 악성 확률과 상세 특성 분석 결과 표시
- 탐지 즉시 Chrome 시스템 알림으로 사용자에게 경고
- 알림 임계값은 설정 탭에서 조정 가능 (기본 70%)

---

### 유해 사이트 (71%+) — 팝업 + 경고 페이지 리디렉션

| 확장 팝업 (85.7%) | 경고 페이지 (≥80% 기본 임계값) |
|:---:|:---:|
| ![danger_popup](assets/screenshots/07.png) | ![warning_page](assets/screenshots/05.png) |

- 고위험 URL 접속 시 원래 페이지 대신 경고 페이지로 자동 리디렉션
- 경고 페이지에서 **수동 승인** 후 계속 접속하거나 **뒤로 가기** 선택 가능
- 차단 임계값은 설정 탭에서 조정 가능 (기본 80%)

---

### 탐지 이력

#### 일간 통계

![history_daily](assets/screenshots/08.png)

시간대별 탐지 건수를 막대 그래프로 표시합니다. 당일 안전/위험 비율을 한눈에 파악할 수 있습니다.

#### 주간 통계

![history_weekly](assets/screenshots/09.png)

최근 7일간 일별 탐지 현황을 표시합니다. 특정 날짜에 위험 사이트 접속이 집중됐는지 추적할 수 있습니다.

#### 최근 탐지 목록

![history_list](assets/screenshots/10.png)

방문한 URL별 악성 확률과 탐지 시각을 목록으로 확인할 수 있습니다.

---

### 설정

![settings](assets/screenshots/11.png)

| 설정 항목 | 기본값 | 설명 |
|-----------|--------|------|
| **탐지 기능** | ON | 전체 탐지 활성화/비활성화 |
| **알림 임계값** | 70% | 이 값 이상이면 Chrome 알림 표시 |
| **차단 임계값** | 80% | 이 값 이상이면 경고 페이지로 리디렉션 |
| **알림 표시** | ON | Chrome 시스템 알림 허용 여부 |
| **경고 페이지** | ON | 고위험 URL 차단 페이지 활성화 여부 |
| **다크 모드** | 시스템 따름 | 팝업 UI 테마 |

---

## 서버 연동

탐지 1단계에서 자체 서버 DB와 통신하여 화이트리스트/블랙리스트를 조회합니다.

- 등록된 도메인은 DB 결과만으로 즉시 안전/위험 판정
- 미등록 도메인은 로컬 ONNX 모델 추론으로 fallback
- 서버 미응답·오류 시에도 로컬 추론으로 자동 전환하여 탐지 누락 방지

모든 API 요청은 **서명 기반 인증**을 적용하여 위변조·재전송 공격을 방지합니다.  
인증 구현에는 외부 라이브러리 없이 브라우저 내장 Web Crypto API를 사용합니다.

---

## ML 모델

| 항목 | 내용 |
|------|------|
| 알고리즘 | CatBoost (Gradient Boosting) |
| 입력 | 80차원 float32 벡터 (URL + HTML 특성) |
| 출력 | 악성 확률 0.0 ~ 1.0 |
| 변환 | Python CatBoost → ONNX |
| 추론 환경 | ONNX Runtime Web (WASM, 단일 스레드) |

개인정보 보호를 위해 특성 벡터를 외부 서버로 전송하지 않으며, 추론은 전적으로 기기 내에서 수행됩니다.

---

## 특성 추출 (80개)

`content.js`에서 Shannon Entropy 기반으로 URL과 HTML DOM을 실시간 분석합니다.

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

## Manifest V3 설계 포인트

Chrome MV3 Service Worker는 DOM에 직접 접근할 수 없어 ONNX Runtime WASM을 직접 실행할 수 없습니다.  
**Offscreen Document**를 활용해 이 제약을 해결했습니다.

```
Service Worker (background.js)
  └─ chrome.offscreen.createDocument()
       └─ Offscreen Document (offscreen.js)
             └─ ort.InferenceSession.create() — WASM 추론
```

모델 준비 상태는 PING/PONG 메시지로 확인 후 추론 요청을 전달합니다 (최대 60초 대기).

---

## 기술 스택

```
Chrome Extension  Manifest V3
ML Model          CatBoost → ONNX 변환
Inference         ONNX Runtime Web (WASM, 단일 스레드)
Feature Eng.      URL 특성 + HTML DOM 특성 총 80개
API Auth          서명 기반 인증 (Web Crypto API)
Storage           chrome.storage.local / session
```

---

## 프로젝트 구조

```
Chrome_Extension_Pillsang_AI/
├── manifest.json          # Manifest V3 설정
├── background.js          # Service Worker (탐지 로직, API 통신, 아이콘 제어)
├── content.js             # 특성 추출 (URL + HTML 80개)
├── offscreen.js           # ONNX Runtime 추론 (Offscreen Document)
├── offscreen.html         # Offscreen Document 진입점
├── popup.html             # 확장 팝업 UI
├── popup.js               # 팝업 로직 (결과 표시, 탭 전환)
├── popup.css              # 팝업 스타일
├── warning.html           # 고위험 경고 페이지
├── warning.js             # 경고 페이지 로직 (승인/차단)
├── model/
│   └── CatBoost_merged.onnx  # 추론 모델
├── lib/
│   ├── ort.min.js            # ONNX Runtime Web
│   ├── ort-wasm-simd.wasm
│   └── ort-wasm.wasm
├── icons/                    # 확장 아이콘 및 상태별 캐릭터 이미지
└── assets/screenshots/       # 기능 스크린샷
```

---

## 개발 환경 설정

```bash
git clone https://github.com/hazzyAI/Chrome_Extension_Pillsang_AI.git
cd Chrome_Extension_Pillsang_AI
```

Chrome에서 직접 로드:
1. `chrome://extensions` 접속
2. **개발자 모드** 활성화
3. **압축해제된 확장 프로그램 로드** → 프로젝트 루트 폴더 선택

---

## 관련 프로젝트

- **싹다잡아 Android** — 누적 다운로드 50만+ (Google Play)
- **필상 (Pillsang)** — 피싱 탐지 보안 스타트업

---

## 라이선스

본 프로젝트는 포트폴리오 목적으로 공개합니다.  
상업적 이용 및 모델 파일 재배포는 금지합니다.

© 2025 Jungmin Ha · 필상
