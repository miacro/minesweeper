import assert from 'node:assert/strict';
import test from 'node:test';

import { createI18n } from '../modules/i18n.js';

test('i18n switches languages and interpolates values', () => {
  const i18n = createI18n();
  assert.equal(i18n.language, 'en');
  assert.deepEqual(i18n.languages.map(({ code }) => code), ['en', 'zh-CN']);
  assert.equal(i18n.t('title'), 'Minesweeper');

  i18n.setLanguage('zh-CN');
  assert.equal(i18n.t('title'), '扫雷');
  assert.equal(i18n.t('best', { value: '12s' }), '最佳：12s');

  i18n.setLanguage('en');
  assert.equal(i18n.t('title'), 'Minesweeper');
  assert.equal(i18n.t('best', { value: '12s' }), 'Best: 12s');
});

test('i18n translates English validation errors for Chinese display', () => {
  const i18n = createI18n('zh-CN');
  assert.equal(
    i18n.translateError('Duplicate mine coordinates'),
    '地雷坐标重复',
  );
});
