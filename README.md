# 필상 AI 유해 사이트 탐지 — Chrome Extension

> AI 기반 실시간 피싱·유해 사이트 탐지 크롬 확장 프로그램  
> Chrome Web Store 심사 제출 완료 · 출시 예정

[![Status](https://img.shields.io/badge/Status-심사_중-blue?style=flat-square)]()
[![Model](https://img.shields.io/badge/Model-Boosting_Model_ONNX-FFCC00?style=flat-square)]()
[![Runtime](https://img.shields.io/badge/Runtime-Manifest_V3-4285F4?style=flat-square&logo=googlechrome&logoColor=white)]()

> 코드는 상업 서비스 보안상 비공개입니다.

---

## 개요

방문하는 모든 URL을 실시간으로 분석하여 **서버 DB 조회 → 온디바이스 ONNX 추론**의 2단계로 피싱·유해 사이트를 탐지합니다.  
서버 API 2개(조회 / 적재)를 연동하며, 추론 결과를 DB에 지속 누적합니다. 수집된 데이터는 추후 라벨링 과정을 거쳐 모델 재학습에 활용되며, 이를 통해 탐지 성능을 지속적으로 개선하는 구조를 갖추고 있습니다.

---

## 탐지 아키텍처

<div align="center">
<img src="assets/architecture.png" width="720">
</div>

---

## 보안 탭 — 6가지 판정 케이스

화이트/블랙리스트 등록 URL은 DB 조회 후 즉시 결과를 반환하고, 미등록 URL은 온디바이스 AI 추론을 거쳐 확률에 따라 4단계로 판정합니다.

| 케이스 | 악성 확률 | 판정 |
|--------|-----------|------|
| 화이트리스트 등록 URL | 0% (즉시 반환) | 🟢 안전 |
| AI 추론 결과 | 0% ~ 20% | 🟢 안전 |
| AI 추론 결과 | 21% ~ 50% | 🔵 비교적 안전 |
| AI 추론 결과 | 51% ~ 80% | 🟠 유해 의심 |
| AI 추론 결과 | 81%+ | 🔴 유해 사이트 |
| 블랙리스트 등록 URL | 100% (즉시 반환) | 🔴 유해 사이트 |

<table>
  <tr>
    <td align="center"><img src="assets/screenshots/01.png" width="150"><br><b>🗄️ DB 등록 URL</b><br><sub>화이트리스트 → 확률 0%<br>블랙리스트 → 확률 100%<br>즉시 결과 반환</sub></td>
    <td align="center"><img src="assets/screenshots/02.png" width="150"><br><b>🟢 안전</b><br><sub>AI 추론 결과<br>(확률 0 ~ 20%)</sub></td>
    <td align="center"><img src="assets/screenshots/03.png" width="150"><br><b>🔵 비교적 안전</b><br><sub>AI 추론 결과<br>(확률 21 ~ 50%)</sub></td>
    <td align="center"><img src="assets/screenshots/06.png" width="150"><br><b>🟠 유해 의심</b><br><sub>AI 추론 결과<br>(확률 51 ~ 80%)</sub></td>
    <td align="center"><img src="assets/screenshots/07.png" width="150"><br><b>🔴 유해 사이트</b><br><sub>AI 추론 결과<br>(확률 81%+)</sub></td>
  </tr>
</table>

---

## 자동 액션 — 임계값 초과 시 자동 대응

사용자가 설정한 임계값을 초과하면 Chrome 알림과 차단 페이지가 자동으로 동작합니다. 두 임계값은 설정 탭에서 개별 조정 가능합니다.

| 임계값 | 기본값 | 동작 |
|--------|--------|------|
| 확률 ≥ 70% | ✅ 활성 | Chrome 알림 표시 |
| 확률 ≥ 80% | ✅ 활성 | 경고 페이지 리디렉션 |

<table>
  <tr>
    <td align="center"><img src="assets/screenshots/04.png" width="380"><br><b>⚠️ Chrome 알림</b><br><sub>악성 확률 ≥ 70% · 개인정보 입력 주의 알림</sub></td>
    <td align="center"><img src="assets/screenshots/05.png" width="380"><br><b>🚫 유해 사이트 차단 페이지</b><br><sub>악성 확률 ≥ 80% · 경고 페이지로 자동 리다이렉트</sub></td>
  </tr>
</table>

---

## 히스토리 탭 — 탐지 이력 및 통계

방문한 URL의 탐지 결과를 일간 / 주간으로 집계하며, 도넛 차트의 카테고리를 선택하면 해당 판정에 해당하는 URL만 필터링하여 확인할 수 있습니다.

<table>
  <tr>
    <td align="center"><img src="assets/screenshots/08.png" width="210"><br><b>📊 일간 통계</b><br><sub>도넛 차트 + 최근 탐지 기록<br>(총 28건)</sub></td>
    <td align="center"><img src="assets/screenshots/09.png" width="210"><br><b>📊 주간 통계</b><br><sub>누적 분석 결과<br>(총 116건)</sub></td>
    <td align="center"><img src="assets/screenshots/10.png" width="210"><br><b>🔴 카테고리별 조회</b><br><sub>유해 사이트 카테고리 선택 시<br>해당 기록만 표시 (7건)</sub></td>
  </tr>
</table>

---

## 설정 탭 — 사용자 맞춤 설정

알림 임계값, 차단 임계값을 슬라이더로 개별 조정할 수 있으며, 다크 모드와 히스토리 초기화 기능을 제공합니다.

<div align="center">
<img src="assets/screenshots/11.png" width="220"><br>
<b>⚙️ 알림 · 차단 · 다크모드 설정</b><br>
<sub>알림 임계값(기본 70%) · 차단 임계값(기본 80%) · 다크 모드 ON/OFF · 히스토리 초기화</sub>
</div>

---

## 서버 API 연동

| API | 방식 | 역할 |
|-----|------|------|
| **DB 조회 API** | `GET` | 접속 URL이 화이트/블랙리스트에 등록되어 있는지 조회 |
| **DB 적재 API** | `POST` | ONNX 추론 결과(URL · 특성 · 예측값)를 서버 DB에 저장 · 수집 데이터는 추후 라벨링을 거쳐 모델 재학습에 활용 |

> 두 API 모두 서버 전문가와 협업하여 설계 · 연동하였으며, JS 난독화 및 암호화를 적용하여 보안 처리했습니다 (세부 기법 비공개).

---

## 기술 구성

| 구성 요소 | 설명 |
|-----------|------|
| `content.js` | 페이지 로드 시 URL + HTML 특성 추출, background로 전달 |
| `background.js` | Service Worker — DB 조회 API 호출 / ONNX 추론 흐름 제어 |
| `offscreen.js` | Offscreen Document — Boosting Model ONNX WASM 런타임 실행 |
| `popup.js` | 탐지 결과 UI 렌더링 (보안 / 히스토리 / 설정 탭) |
| `Boosting Model ONNX` | WASM 기반 온디바이스 추론 (네트워크 불필요) |

---

## 개발 특이사항

- **Manifest V3** 기반 — Service Worker + Offscreen Document 구조로 ONNX WASM 실행
- **온디바이스 추론** — 모델이 클라이언트에 탑재되어 네트워크 없이 추론 가능
- **데이터 수집 파이프라인** — 추론 결과를 서버 DB에 누적하여 추후 라벨링 후 모델 재학습에 활용, 탐지 성능 지속 개선 목적
- **보안 처리** — JS 난독화 및 암호화 적용 (세부 기법 비공개)
- **단독 개발** — 기획 · 모델 설계 · 확장프로그램 개발 · API 연동 · 심사 제출 전 과정 수행
