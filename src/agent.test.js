import test from 'node:test';
import assert from 'node:assert/strict';
import { briefingTwiml, responseTwiml } from './voice.js';

test('briefing TwiML contains speech gathering and webhook', () => {
  const xml = briefingTwiml('Good morning. Focus on sales.', 'https://example.onrender.com');
  assert.match(xml, /<Gather/);
  assert.match(xml, /Good morning\. Focus on sales\./);
  assert.match(xml, /https:\/\/example\.onrender\.com\/voice\/respond/);
});

test('voice output escapes XML-sensitive content', () => {
  const xml = responseTwiml('Use <today> & focus', 'https://example.onrender.com');
  assert.match(xml, /Use &lt;today&gt; &amp; focus/);
  assert.doesNotMatch(xml, /Use <today>/);
});
