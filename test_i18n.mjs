import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('app.js', 'utf8');
const languages = ['en', 'zh', 'es', 'ja', 'ko', 'fr', 'de', 'pt', 'ar', 'hi', 'ru'];

function readTranslations(constantName) {
  const marker = `const ${constantName} = `;
  const start = source.indexOf(marker);
  const end = source.indexOf('\n};', start);
  assert.ok(start >= 0 && end > start, `${constantName} must be defined`);
  return vm.runInNewContext(`(${source.slice(start + marker.length, end + 2)})`);
}

for (const constantName of ['DETAIL_I18N', 'REVIEW_I18N']) {
  const translations = readTranslations(constantName);
  const required = Object.keys(translations.en).sort();
  assert.deepEqual(Object.keys(translations).sort(), [...languages].sort());
  for (const language of languages) {
    assert.deepEqual(Object.keys(translations[language]).sort(), required, `${language} has incomplete ${constantName} translations`);
    for (const key of required) assert.ok(translations[language][key].trim(), `${language}.${key} is empty`);
  }
}

assert.equal(fs.readFileSync('public/app.js', 'utf8'), source, 'public/app.js must match app.js');
assert.equal(fs.readFileSync('public/index.html', 'utf8'), fs.readFileSync('index.html', 'utf8'), 'public/index.html must match index.html');
assert.ok(!source.includes('Apply 修改'), 'review actions must not contain mixed-language labels');
console.log('Interface translation coverage tests passed');
