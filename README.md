# 필상 AI 유해 사이트 탐지 — Chrome Extension

> AI 기반 실시간 피싱·유해 사이트 탐지 + 성인·도박 키워드 즉시 차단 + 성인 이미지 자동 블러 크롬 확장 프로그램  
> Chrome Web Store 출시 완료

[![Status](https://img.shields.io/badge/Status-스토어_출시-brightgreen?style=flat-square)]()
[![Model](https://img.shields.io/badge/Model-Boosting_Model_ONNX-FFCC00?style=flat-square)]()
[![Runtime](https://img.shields.io/badge/Runtime-Manifest_V3-4285F4?style=flat-square&logo=googlechrome&logoColor=white)]()
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)]()

> 코드는 상업 서비스 보안상 비공개입니다.

---

<div align="center">
<img src="assets/store/promo_01_hero.png" width="900">
</div>

## 개요

방문하는 모든 URL을 실시간으로 분석하여 **서버 DB 조회 → 온디바이스 ONNX 추론**의 2단계로 피싱·유해 사이트를 탐지합니다.

- **1단계 (서버 DB 조회)**: 화이트/블랙리스트에 등록된 URL은 AI 추론 없이 즉시 결과를 반환합니다.
- **2단계 (온디바이스 AI 추론)**: 미등록 URL은 Boosting Model ONNX WASM으로 브라우저 내에서 직접 추론합니다. 개인 브라우징 데이터가 외부 서버로 전송되지 않습니다.
- **키워드 즉시 차단**: 페이지 `<title>` 태그에 성인·도박 키워드 포함 시 AI 추론 없이 즉시 경고 페이지로 전환합니다.
- **성인 이미지 자동 블러**: NSFW 분류 모델(MobileNetV2 기반)이 웹 페이지 이미지를 실시간 분석해 성인 콘텐츠를 자동으로 블러 처리합니다.

---

## 주요 기능

**🧠 AI 탐지 엔진**

| | |
|:---|:---|
| 🔍 **2단계 탐지** | 서버 DB 조회 → 온디바이스 ONNX 추론 순차 처리로 모든 URL 실시간 분석 |
| ⚡ **즉시 판별** | 화이트/블랙리스트 등록 URL은 AI 추론 생략, 즉시 결과 반환 |
| 💻 **온디바이스 WASM** | URL + HTML 75+ 피처 기반 추론 — 개인 브라우징 데이터 외부 전송 없음 |
| 🖱️ **우클릭 사전 탐지** | 방문 없이 링크 URL만으로 즉시 추론 — 접속 전 위험 확인 가능 |

<br>

**🛡️ 유해 콘텐츠 차단**

| | |
|:---|:---|
| 🎯 **피싱·악성 사이트** | AI 모델 추론 결과 기반 실시간 탐지 및 경고 페이지 차단 |
| 🚫 **성인·도박 즉시 차단** | 페이지 타이틀 한/영 30종+ 키워드 감지 시 AI 추론 없이 즉시 경고 전환 |
| 🔞 **성인 이미지 자동 블러** | MobileNetV2 온디바이스 NSFW 분류 — 이미지 외부 전송 없음 |
| ⚠️ **HTTP 사이트 경고** | 암호화 미적용 사이트 접속 시 모델 결과와 무관하게 유해 의심 알림 고정 표시 |

<br>

**⚡ 자동 대응**

| | |
|:---|:---|
| 🔔 **Chrome 시스템 알림** | 악성 확률 ≥ 70% 시 즉시 알림 발송 — 10분/3회 레이트 리밋 · 6시간 전역 쿨다운 |
| 🚨 **경고 페이지 차단** | 악성 확률 ≥ 80% 시 차단 페이지로 자동 리디렉션 |
| 🎨 **동적 아이콘** | 위험도별 툴바 아이콘 색상 실시간 변경 — 🟢 안전 / 🔵 비교적 안전 / 🟠 유해 의심 / 🔴 유해 |

<br>

**📊 히스토리 & 설정**

| | |
|:---|:---|
| 📈 **탐지 통계** | 일간 / 주간 도넛 차트 — 총 탐지 건수 표시, 카테고리 클릭 시 해당 건수 강조 |
| 🗂️ **Full URL 로그** | 접속 URL + 도메인 + 탐지 시각 기록, 최대 999건 저장 |
| 🎛️ **임계값 조정** | 알림·차단 기준 슬라이더로 개별 설정 |
| 🌙 **기능 토글** | 성인·도박 차단 / 이미지 블러 / 다크모드 ON·OFF 개별 제어 |

---

## 탐지 아키텍처

<div align="center">
<img src="assets/architecture.png" width="720">
</div>

---

## 유해 사이트 알림 및 차단

<div align="center">
<img src="assets/store/promo_02_detection.png" width="900">
</div>

화이트/블랙리스트 등록 URL은 DB 조회 후 즉시 결과를 반환하고, 미등록 URL은 온디바이스 AI 추론을 거쳐 악성 확률에 따라 4단계로 판정합니다.

| 케이스 | 악성 확률 | 판정 |
|--------|-----------|------|
| 화이트리스트 등록 URL | 0% (즉시 반환) | 🟢 안전 |
| AI 추론 결과 | 0% ~ 20% | 🟢 안전 |
| AI 추론 결과 | 21% ~ 50% | 🔵 비교적 안전 |
| AI 추론 결과 | 51% ~ 80% | 🟠 유해 의심 |
| AI 추론 결과 | 81%+ | 🔴 유해 사이트 |
| 블랙리스트 등록 URL | 100% (즉시 반환) | 🔴 유해 사이트 |

**자동 액션 임계값 (설정에서 개별 조정 가능)**

| 임계값 | 기본값 | 동작 |
|--------|--------|------|
| 악성 확률 ≥ 70% | ✅ 활성 | Chrome 시스템 알림 표시 |
| 악성 확률 ≥ 80% | ✅ 활성 | 경고 페이지로 자동 리디렉션 |
| HTTP 사이트 접속 | 자동 적용 | 모델 확률과 무관하게 유해 의심 알림 고정 표시 |

<table>
  <tr>
    <td align="center"><img src="assets/screenshots/01.png" width="150"><br><b>🗄️ DB 등록 URL</b><br><sub>화이트리스트 → 0%<br>블랙리스트 → 100%</sub></td>
    <td align="center"><img src="assets/screenshots/02.png" width="150"><br><b>🟢 안전</b><br><sub>AI 추론 결과<br>(0 ~ 20%)</sub></td>
    <td align="center"><img src="assets/screenshots/03.png" width="150"><br><b>🔵 비교적 안전</b><br><sub>AI 추론 결과<br>(21 ~ 50%)</sub></td>
    <td align="center"><img src="assets/screenshots/06.png" width="150"><br><b>🟠 유해 의심</b><br><sub>AI 추론 결과<br>(51 ~ 80%)</sub></td>
    <td align="center"><img src="assets/screenshots/07.png" width="150"><br><b>🔴 유해 사이트</b><br><sub>AI 추론 결과<br>(81%+)</sub></td>
  </tr>
</table>

---

## 성인·도박 사이트 즉시 차단

<div align="center">
<img src="assets/store/promo_03_block.png" width="900">
</div>

페이지 `<title>` 태그에 성인·도박 관련 키워드가 포함되면 AI 모델 추론 없이 **즉시 경고 페이지로 전환**합니다. 탐지 유형(성인 / 도박 / 일반 유해)에 따라 차단 문구가 분기됩니다.

| 감지 유형 | 키워드 예시 | 차단 문구 |
|-----------|------------|-----------|
| 🔞 **성인 사이트** | 야동, 포르노, 음란, 19금, porn, xxx, nude 등 한/영 18종 | 성인 사이트가 차단되었습니다 |
| 🎰 **도박 사이트** | 카지노, 바카라, 토토, 배팅, casino, gambling, betting 등 한/영 19종 | 도박 사이트가 차단되었습니다 |

> 짧은 영어 키워드(`porn`, `xxx` 등 4자 이하)는 단어 경계(word boundary) 정규식으로 검사해 오탐을 방지합니다.

---

## 성인 이미지 자동 블러

<div align="center">
<img src="assets/store/promo_04_mosaic.png" width="900">
</div>

웹 페이지 내 이미지를 실시간으로 분류해 성인 콘텐츠로 판정된 이미지를 자동으로 블러 처리합니다. **NSFW 분류 모델 역시 온디바이스 모델**로, 이미지 데이터가 외부 서버로 전송되지 않습니다.

| 특징 | 설명 |
|------|------|
| 🧠 **온디바이스 분류** | MobileNetV2 기반 NSFW 모델이 클라이언트에서 직접 실행 — 이미지 외부 전송 없음 |
| 👁️ **뷰포트 우선 처리** | 화면에 보이는 이미지 우선 분류 · 오프스크린 이미지는 IntersectionObserver로 진입 시 처리 |
| 🔄 **동적 이미지 감지** | MutationObserver로 SPA 환경 등 동적으로 추가되는 이미지도 자동 처리 |
| 🌐 **CORS 우회 처리** | 크로스오리진 이미지는 MAIN world → CustomEvent → ISOLATED world → background.js fetch → Blob URL 경유로 분류 |
| 🔒 **3중 활성 조건** | Google 로그인 + 블러 기능 ON + 탐지 기능 ON 세 조건 모두 충족 시에만 동작 |
| 🔓 **클릭으로 해제** | 블러 처리된 이미지 클릭 후 확인 시 원본 표시 |

<div align="center">
<img src="assets/screenshots/blur_01.png" width="720"><br>
<sub>구글 이미지 검색 — 성인 콘텐츠로 판정된 이미지 자동 블러 처리 (🔒 성인 콘텐츠 배지 표시)</sub>
</div>

---

## 탐지 히스토리 & 설정

<div align="center">
<img src="assets/store/promo_05_history.png" width="900">
</div>

**히스토리 탭** — 방문한 URL의 탐지 결과를 일간 / 주간으로 집계합니다.

| 기능 | 설명 |
|------|------|
| 📊 **도넛 차트** | 총 탐지 건수 중앙 표시 + 판정 카테고리별 비율 시각화 |
| 🔍 **카테고리 클릭 필터** | 도넛 차트 카테고리 클릭 시 해당 판정 URL만 필터링 표시 |
| 🔗 **Full URL 로그** | 접속 URL + 도메인 + 탐지 시각 표시 |
| 📦 **최대 999건** | 히스토리 최대 저장 건수 999건 (동일 URL 1분 이내 중복 저장 방지) |

<table>
  <tr>
    <td align="center"><img src="assets/screenshots/08.png" width="210"><br><b>📊 일간 통계</b><br><sub>도넛 차트 + 총 탐지 건수</sub></td>
    <td align="center"><img src="assets/screenshots/09.png" width="210"><br><b>📊 주간 통계</b><br><sub>일간 데이터 누적 분석</sub></td>
    <td align="center"><img src="assets/screenshots/10.png" width="210"><br><b>🔴 카테고리 필터</b><br><sub>판정 선택 시 해당 기록만 표시</sub></td>
  </tr>
</table>

**설정 탭** — 알림·차단 기준과 각 기능을 개별 제어합니다.

| 설정 항목 | 기본값 | 설명 |
|-----------|--------|------|
| 유해 사이트 알림 임계값 | 70% | 슬라이더로 개별 조정 |
| 위험 사이트 차단 임계값 | 80% | 슬라이더로 개별 조정 |
| 성인·도박 사이트 차단 | ON | 키워드 기반 즉시 차단 ON/OFF |
| 성인 콘텐츠 가리기 | ON | 이미지 자동 블러 ON/OFF |
| 다크 모드 | OFF | 확장프로그램 UI 테마 전환 |
| 히스토리 초기화 | — | 저장된 탐지 기록 전체 삭제 |

<div align="center">
<img src="assets/screenshots/11.png" width="220"><br>
<sub>⚙️ 알림 · 차단 · 블러 · 다크모드 설정</sub>
</div>

---

## 서버 API 연동

| API | 방식 | 역할 |
|-----|------|------|
| **DB 조회 API** | `POST` | 접속 URL의 화이트 / 블랙리스트 등록 여부를 main_domain 기준으로 조회 후 즉시 결과 반환 |
| **DB 적재 API** | `POST` | ONNX 추론 결과(URL · 피처 · 예측값)를 서버 DB에 저장 — 수집 데이터는 추후 라벨링 후 모델 재학습에 활용 |

> 두 API 모두 Google OAuth Bearer 토큰 기반으로 인증합니다.

---

## 기술 구성

| 구성 요소 | 역할 |
|-----------|------|
| `content.js` | 페이지 로드 시 URL + HTML 75+ 특성 추출 후 background로 전달. 타이틀 키워드 감지 담당 |
| `blur_content.js` | 웹 페이지 이미지 실시간 NSFW 분류 및 블러 처리 (MAIN world 실행) |
| `background.js` | Service Worker — DB 조회 API 호출, ONNX 추론 흐름 총괄, 아이콘 렌더링, 알림/차단 처리 |
| `offscreen.js` | Offscreen Document — Boosting Model ONNX WASM 런타임 실행 (MV3 제약 우회) |
| `popup.js` | 탐지 결과 UI 렌더링 — 보안 · 히스토리 · 설정 3탭 구성. storage 이벤트 + 폴링 이중 감지 |
| `Boosting Model ONNX` | 피싱 탐지 온디바이스 추론 모델 — WASM 기반, F1-score 0.80, 모델 크기 1.92MB |
| `NSFW 분류 모델` | 성인 이미지 탐지 온디바이스 분류 모델 (MobileNetV2 기반, nsfwjs v4.3.0) |

> Manifest V3의 Service Worker는 백그라운드 지속 실행이 불가하므로, ONNX WASM 런타임은 Offscreen Document를 통해 별도 격리 환경에서 실행합니다.

---

## 개발 특이사항

- **Manifest V3 구조 설계** — Service Worker + Offscreen Document 조합으로 ONNX WASM 런타임 실행 환경 구성
- **이중 AI 엔진** — 피싱 탐지(Boosting Model ONNX)와 성인 이미지 분류(NSFW 모델) 두 가지 AI를 동시 탑재, 각 모델 독립 구동
- **온디바이스 추론** — 두 모델 모두 클라이언트에서 직접 실행. 외부 서버 전송 없이 추론 가능하여 서버 부담이 없으며, 인터넷 미연결 환경에서도 신뢰성 있는 결과 확인 가능
- **AI 모델 성능 개선** — Boosting Model F1-score 0.70 → 0.80, 모델 크기 2.42MB → 1.92MB 경량화
- **Google OAuth 인증** — Chrome Identity API(`getAuthToken`) 기반으로 Google 계정 토큰을 획득하여 API 인증 처리. Edge 환경에서는 `launchWebAuthFlow` 폴백으로 동일한 인증 흐름 지원
- **성인·도박 키워드 즉시 차단** — 페이지 `<title>` 태그에서 한/영 30종+ 키워드 감지 시 AI 추론 없이 즉시 경고 페이지 전환. 짧은 영어 키워드는 단어 경계(word boundary) 정규식으로 오탐 방지
- **URL 사전 분석 (우클릭 탐지)** — 우클릭 컨텍스트 메뉴를 통해 직접 방문 없이 링크 URL 사전 분석. URL 구조 피처(75+개)만으로 ONNX 추론 수행, DOM 없는 환경에서 HTML 피처를 0으로 패딩하여 동일 모델로 처리
- **CORS 우회 이미지 분류** — 크로스오리진 이미지 분류 시 MAIN world → CustomEvent → ISOLATED world → background.js fetch → Blob URL 경유 방식으로 Canvas 픽셀 접근 제한 우회
- **도메인 레벨 분석 캐시** — 동일 도메인 10분 이내 재방문 시 추론·API 호출 없이 캐시 결과 재사용, 불필요한 연산 최소화
- **데이터 수집 파이프라인** — 추론 결과를 서버 DB에 지속 누적하여 추후 라벨링 후 모델 재학습에 활용, 탐지 성능의 점진적 개선을 목표
- **보안 처리** — JS 난독화 및 암호화 적용 (세부 기법 비공개)
- **단독 개발** — 기획 · 데이터 수집 · 모델 설계 · 확장프로그램 개발 · API 연동 · Chrome Web Store 심사 제출 전 과정 수행
