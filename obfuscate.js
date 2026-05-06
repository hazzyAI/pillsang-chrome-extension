const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const targets = ['background.js', 'content.js', 'popup.js', 'offscreen.js', 'warning.js'];

const options = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.2,
  selfDefending: true,
  identifierNamesGenerator: 'hexadecimal',
};

const outDir = path.join(__dirname, 'dist');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

targets.forEach(file => {
  const src = path.join(__dirname, file);
  if (!fs.existsSync(src)) return;
  const code = fs.readFileSync(src, 'utf8');
  const result = JavaScriptObfuscator.obfuscate(code, options);
  fs.writeFileSync(path.join(outDir, file), result.getObfuscatedCode());
  console.log(`✓ ${file} 난독화 완료`);
});

console.log('\ndist/ 폴더에 난독화된 파일이 생성됐습니다.');
