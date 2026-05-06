const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  Header, Footer, PageNumber, LevelFormat
} = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

function cell(text, isHeader = false, width = 4680) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: isHeader ? { fill: "1A3C5E", type: ShadingType.CLEAR } : { fill: "FFFFFF", type: ShadingType.CLEAR },
    margins: { top: 100, bottom: 100, left: 150, right: 150 },
    children: [new Paragraph({
      children: [new TextRun({
        text,
        bold: isHeader,
        color: isHeader ? "FFFFFF" : "222222",
        font: "Malgun Gothic",
        size: 20,
      })]
    })]
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, font: "Malgun Gothic", size: 32, color: "1A3C5E" })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 160 },
    children: [new TextRun({ text, bold: true, font: "Malgun Gothic", size: 26, color: "2E6DA4" })]
  });
}

function body(text) {
  return new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text, font: "Malgun Gothic", size: 22, color: "333333" })]
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 100 },
    children: [new TextRun({ text, font: "Malgun Gothic", size: 22, color: "333333" })]
  });
}

function code(text) {
  return new Paragraph({
    spacing: { after: 100 },
    shading: { fill: "F4F4F4", type: ShadingType.CLEAR },
    indent: { left: 360 },
    children: [new TextRun({ text, font: "Courier New", size: 18, color: "C0392B" })]
  });
}

function divider() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" } },
    children: []
  });
}

const doc = new Document({
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{
        level: 0,
        format: LevelFormat.BULLET,
        text: "•",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } }
      }]
    }]
  },
  styles: {
    default: { document: { run: { font: "Malgun Gothic", size: 22 } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Malgun Gothic", color: "1A3C5E" },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Malgun Gothic", color: "2E6DA4" },
        paragraph: { spacing: { before: 300, after: 160 }, outlineLevel: 1 }
      }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "1A3C5E" } },
          children: [new TextRun({ text: "필상 AI 유해 사이트 탐지 확장프로그램 — 보안 명세서", font: "Malgun Gothic", size: 18, color: "666666" })]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Page ", font: "Malgun Gothic", size: 18, color: "999999" }),
            new TextRun({ children: [PageNumber.CURRENT], font: "Malgun Gothic", size: 18, color: "999999" }),
          ]
        })]
      })
    },
    children: [

      // ── 표지 ──
      new Paragraph({ spacing: { before: 1200, after: 200 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "필상 AI 유해 사이트 탐지", font: "Malgun Gothic", size: 52, bold: true, color: "1A3C5E" })] }),
      new Paragraph({ spacing: { after: 160 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Chrome 확장프로그램 보안 명세서", font: "Malgun Gothic", size: 36, color: "2E6DA4" })] }),
      new Paragraph({ spacing: { after: 80 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "JavaScript Obfuscation & Static Asset Protection", font: "Malgun Gothic", size: 24, color: "888888" })] }),
      new Paragraph({ spacing: { after: 600 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "작성일: 2026-04-29  |  버전: 1.0.0  |  작성: 필상(PillsAI)", font: "Malgun Gothic", size: 20, color: "AAAAAA" })] }),
      divider(),

      // ── 1. 개요 ──
      h1("1. 개요"),
      body("본 문서는 필상 AI 유해 사이트 탐지 Chrome 확장프로그램(v1.0.0)에 적용된 JavaScript 난독화 및 정적 자산 보호 조치를 기술한 보안 명세서입니다."),
      body("클라이언트 사이드 코드는 구조상 소스 열람이 가능하므로, 분석 비용을 높이고 핵심 로직 및 API 연동 정보의 즉각적인 노출을 방지하기 위해 아래 조치를 적용하였습니다."),
      divider(),

      // ── 2. 보안 위협 모델 ──
      h1("2. 보안 위협 모델"),
      body("Chrome 확장프로그램의 구조적 특성상 아래 위협이 존재합니다."),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2000, 3500, 3860],
        rows: [
          new TableRow({ children: [cell("위협 유형", true, 2000), cell("설명", true, 3500), cell("적용 대응", true, 3860)] }),
          new TableRow({ children: [cell("소스 코드 열람", false, 2000), cell("chrome://extensions에서 JS 파일 직접 열람 가능", false, 3500), cell("JavaScript 난독화 적용", false, 3860)] }),
          new TableRow({ children: [cell("모델 파일 탈취", false, 2000), cell("web_accessible_resources를 통한 .onnx 파일 외부 다운로드", false, 3500), cell("web_accessible_resources에서 model/* 제거", false, 3860)] }),
          new TableRow({ children: [cell("API 정보 노출", false, 2000), cell("JS 코드 분석을 통한 API 엔드포인트, 키 정보 추출", false, 3500), cell("난독화로 분석 난이도 상승", false, 3860)] }),
        ]
      }),
      new Paragraph({ spacing: { after: 200 }, children: [] }),
      divider(),

      // ── 3. 적용 조치 ──
      h1("3. 적용 조치"),

      h2("3-1. web_accessible_resources 최소화"),
      body("변경 전 manifest.json에서 model/* 리소스가 외부 웹페이지에 노출되어 있었습니다."),
      body("변경 전:"),
      code('"resources": ["lib/*", "model/*"]'),
      body("변경 후:"),
      code('"resources": ["lib/*"]'),
      body("model/* 항목을 제거하여 외부 URL을 통한 .onnx 모델 파일 직접 다운로드를 차단하였습니다. 확장프로그램 내부에서는 chrome.runtime.getURL()을 통해 정상 접근되므로 기능상 영향 없습니다."),

      new Paragraph({ spacing: { after: 200 }, children: [] }),
      h2("3-2. JavaScript 난독화"),
      body("javascript-obfuscator(v5.4.2) 라이브러리를 사용하여 배포용 JS 파일을 난독화합니다."),

      new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: "대상 파일", bold: true, font: "Malgun Gothic", size: 22, color: "1A3C5E" })] }),
      bullet("background.js — 서비스 워커, API 통신 로직"),
      bullet("content.js — 콘텐츠 스크립트"),
      bullet("popup.js — 팝업 UI 로직"),
      bullet("offscreen.js — ONNX 모델 추론 로직"),
      bullet("warning.js — 경고 페이지 로직"),

      new Paragraph({ spacing: { after: 200 }, children: [] }),
      new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: "적용 옵션 상세", bold: true, font: "Malgun Gothic", size: 22, color: "1A3C5E" })] }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3000, 1800, 4560],
        rows: [
          new TableRow({ children: [cell("옵션", true, 3000), cell("설정값", true, 1800), cell("효과", true, 4560)] }),
          new TableRow({ children: [cell("compact", false, 3000), cell("true", false, 1800), cell("코드 압축 및 개행 제거", false, 4560)] }),
          new TableRow({ children: [cell("controlFlowFlattening", false, 3000), cell("true (0.5)", false, 1800), cell("제어 흐름 평탄화 — 로직 구조 파악 난이도 상승", false, 4560)] }),
          new TableRow({ children: [cell("stringArray", false, 3000), cell("true", false, 1800), cell("문자열을 배열로 분리하여 직접 노출 방지", false, 4560)] }),
          new TableRow({ children: [cell("stringArrayEncoding", false, 3000), cell("base64", false, 1800), cell("분리된 문자열 배열을 Base64로 인코딩", false, 4560)] }),
          new TableRow({ children: [cell("stringArrayThreshold", false, 3000), cell("0.75", false, 1800), cell("전체 문자열의 75%를 배열 처리 대상으로 선정", false, 4560)] }),
          new TableRow({ children: [cell("deadCodeInjection", false, 3000), cell("true (0.2)", false, 1800), cell("가짜 코드 삽입으로 분석 시간 증가", false, 4560)] }),
          new TableRow({ children: [cell("selfDefending", false, 3000), cell("true", false, 1800), cell("포맷팅 시 동작 중단 — 자동 정리 도구 무력화", false, 4560)] }),
          new TableRow({ children: [cell("identifierNamesGenerator", false, 3000), cell("hexadecimal", false, 1800), cell("변수명 16진수 형태로 치환 (_0x3f2a 등)", false, 4560)] }),
        ]
      }),
      new Paragraph({ spacing: { after: 200 }, children: [] }),
      divider(),

      // ── 4. 빌드 구조 ──
      h1("4. 빌드 구조"),
      body("난독화는 원본 파일을 수정하지 않으며, dist/ 디렉터리에 별도 출력합니다."),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3500, 5860],
        rows: [
          new TableRow({ children: [cell("경로", true, 3500), cell("설명", true, 5860)] }),
          new TableRow({ children: [cell("obfuscate.js", false, 3500), cell("난독화 빌드 스크립트 (Node.js)", false, 5860)] }),
          new TableRow({ children: [cell("package.json", false, 3500), cell("npm 프로젝트 설정 및 devDependency 관리", false, 5860)] }),
          new TableRow({ children: [cell("dist/background.js", false, 3500), cell("난독화된 서비스 워커 (배포용)", false, 5860)] }),
          new TableRow({ children: [cell("dist/content.js", false, 3500), cell("난독화된 콘텐츠 스크립트 (배포용)", false, 5860)] }),
          new TableRow({ children: [cell("dist/popup.js", false, 3500), cell("난독화된 팝업 로직 (배포용)", false, 5860)] }),
          new TableRow({ children: [cell("dist/offscreen.js", false, 3500), cell("난독화된 추론 로직 (배포용)", false, 5860)] }),
          new TableRow({ children: [cell("dist/warning.js", false, 3500), cell("난독화된 경고 페이지 로직 (배포용)", false, 5860)] }),
        ]
      }),

      new Paragraph({ spacing: { after: 200 }, children: [] }),
      body("빌드 명령어:"),
      code("npm run obfuscate"),
      divider(),

      // ── 5. 한계 및 추가 권고 ──
      h1("5. 한계 및 추가 보안 권고"),
      body("JavaScript 난독화는 분석 비용을 높이는 기법이며, 충분한 시간과 도구를 가진 공격자에 의해 복원될 수 있습니다. 이는 클라이언트 사이드 보호의 구조적 한계입니다."),

      new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: "추가 권고 사항", bold: true, font: "Malgun Gothic", size: 22, color: "1A3C5E" })] }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [200, 3000, 6160],
        rows: [
          new TableRow({ children: [cell("순위", true, 200), cell("항목", true, 3000), cell("설명", true, 6160)] }),
          new TableRow({ children: [cell("1", false, 200), cell("HMAC 기반 앱 인증", false, 3000), cell("Secret + Timestamp + Nonce 조합으로 서명, 서버 검증 (리플레이 공격 방어)", false, 6160)] }),
          new TableRow({ children: [cell("2", false, 200), cell("JWT 사용자 인증", false, 3000), cell("앱 인증 통과 후 사용자 토큰 발급, 만료 시간 적용", false, 6160)] }),
          new TableRow({ children: [cell("3", false, 200), cell("Rate Limiting", false, 3000), cell("IP 및 토큰 기반 요청 횟수 제한, DDoS 방어", false, 6160)] }),
          new TableRow({ children: [cell("4", false, 200), cell("모델 파일 암호화", false, 3000), cell("AES 암호화 후 배포, 런타임 복호화 키 서버 수령", false, 6160)] }),
        ]
      }),

      new Paragraph({ spacing: { after: 200 }, children: [] }),
      divider(),

      // ── 6. 의존성 ──
      h1("6. 의존성"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3000, 2000, 4360],
        rows: [
          new TableRow({ children: [cell("패키지", true, 3000), cell("버전", true, 2000), cell("용도", true, 4360)] }),
          new TableRow({ children: [cell("javascript-obfuscator", false, 3000), cell("^5.4.2", false, 2000), cell("JavaScript 난독화 엔진", false, 4360)] }),
          new TableRow({ children: [cell("Node.js", false, 3000), cell("v24.15.0", false, 2000), cell("빌드 스크립트 런타임", false, 4360)] }),
        ]
      }),

      new Paragraph({ spacing: { after: 400 }, children: [] }),
      divider(),
      new Paragraph({ spacing: { after: 160 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "본 문서는 필상(PillsAI) 내부 기술 문서입니다. 무단 배포를 금합니다.", font: "Malgun Gothic", size: 18, color: "AAAAAA" })]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('보안_명세서_JS난독화.docx', buffer);
  console.log('완료: 보안_명세서_JS난독화.docx');
});
