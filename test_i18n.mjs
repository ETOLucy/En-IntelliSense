import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('app.js', 'utf8');
const start = source.indexOf('const DETAIL_I18N = ');
const end = source.indexOf('\n};', start);
assert.ok(start >= 0 && end > start, 'DETAIL_I18N must be defined');
const literal = source.slice(start + 'const DETAIL_I18N = '.length, end + 2);
const translations = vm.runInNewContext(`(${literal})`);
const languages = ['en', 'zh', 'es', 'ja', 'ko', 'fr', 'de', 'pt', 'ar', 'hi', 'ru'];
const required = Object.keys(translations.en).sort();

assert.deepEqual(Object.keys(translations).sort(), [...languages].sort());
for (const language of languages) {
  assert.deepEqual(Object.keys(translations[language]).sort(), required, `${language} has incomplete detail translations`);
  for (const key of required) assert.ok(translations[language][key].trim(), `${language}.${key} is empty`);
}

console.log('Interface translation coverage tests passed');
