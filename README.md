# 필상 AI 유해 사이트 탐지 — Chrome Extension

> AI 기반 실시간 피싱·유해 사이트 탐지 크롬 확장 프로그램  
> Chrome Web Store 심사 제출 완료 · 출시 예정

[![Status](https://img.shields.io/badge/Status-심사_중-blue?style=flat-square)]()
[![Model](https://img.shields.io/badge/Model-CatBoost_ONNX-FFCC00?style=flat-square)]()
[![Runtime](https://img.shields.io/badge/Runtime-Manifest_V3-4285F4?style=flat-square&logo=googlechrome&logoColor=white)]()

> 코드는 상업 서비스 보안상 비공개입니다.

---

## 개요

방문하는 모든 URL을 실시간으로 분석하여 **서버 DB 조회 → 온디바이스 ONNX 추론**의 2단계로 피싱·유해 사이트를 탐지합니다.
서버 API 2개(조회 / 적재)를 연동하여 탐지 결과를 DB에 누적함으로써, 신규 사이트가 지속적으로 화이트/블랙리스트에 편입되는 구조를 갖추고 있습니다.

---

## 탐지 아키텍처

```
사용자가 URL 접속
       │
       ▼
[content.js] URL + HTML 특성 추출
       │
       ▼
[background.js] Service Worker
       │
       ├─ 1단계: 서버 DB 조회 API (화이트/블랙리스트)
       │         ├─ 화이트리스트 → 안전 표시 (prob = 0%)
       │         └─ 블랙리스트  → 위험 표시 (prob = 100%)
       │
       └─ 2단계: DB 미등록 → 로컬 ONNX 추론
                 └─ [offscreen.js] CatBoost ONNX (WASM)
                           │
                           ▼
                    악성 확률 0.0 ~ 1.0 반환
                           │
                           ▼
                 서버 DB 적재 API → 결과 저장
                 (신규 URL 화이트/블랙리스트 편입)
```

---

## 서버 API 연동

| API | 방식 | 역할 |
|-----|------|------|
| **DB 조회 API** | `GET` | 접속 URL이 화이트/블랙리스트에 등록되어 있는지 조회 |
| **DB 적재 API** | `POST` | ONNX 추론 결과를 서버에 저장, 임계값 이상 시 블랙리스트 자동 편입 |

> 두 API 모두 서버 전문가와 협업하여 설계 · 연동하였으며, 통신 보안 처리를 적용했습니다.

---

## 팝업 표시 상태

| 악성 확률 | 표시 | 상태 |
|-----------|------|------|
| 0 ~ 20% | 🟢 | 안전 |
| 21 ~ 50% | 🔵 | 비교적 안전 |
| 51 ~ 70% | 🟠 | 유해 의심 |
| 71%+ | 🔴 | 유해 사이트 |

---

## 자동 액션 (사용자 설정 가능)

| 임계값 | 기본값 | 동작 |
|--------|--------|------|
| 확률 ≥ 70% | ✅ 활성 | Chrome 알림 표시 |
| 확률 ≥ 80% | ✅ 활성 | 경고 페이지 리디렉션 |

---

## 기술 구성

| 구성 요소 | 설명 |
|-----------|------|
| `content.js` | 페이지 로드 시 특성 추출, background로 전달 |
| `background.js` | Service Worker — API 조회 / ONNX 추론 흐름 제어 |
| `offscreen.js` | Offscreen Document — ONNX WASM 런타임 실행 |
| `popup.js` | 탐지 결과 UI 렌더링 |
| `CatBoost ONNX` | WASM 기반 온디바이스 추론 (네트워크 불필요) |

---

## 스크린샷

<div align="center">
<img src="assets/screenshots/01.png" width="180">
<img src="assets/screenshots/02.png" width="180">
<img src="assets/screenshots/03.png" width="180">
<img src="assets/screenshots/04.png" width="180">
</div>

---

## 개발 특이사항

- **Manifest V3** 기반 — Service Worker + Offscreen Document 구조로 ONNX WASM 실행
- **온디바이스 추론** — 모델이 클라이언트에 탑재되어 네트워크 없이 추론 가능
- **DB 피드백 루프** — 추론 결과를 서버에 누적하여 화이트/블랙리스트 지속 갱신
- **단독 개발** — 기획 · 모델 설계 · 확장프로그램 개발 · API 연동 · 심사 제출 전 과정 수행
