const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

test('popup loads the canonical calendar before popup logic', () => {
  const html = fs.readFileSync(path.join(projectRoot, 'popup.html'), 'utf8');
  const calendarScript = html.indexOf('<script src="academicCalendar.js"></script>');
  const popupScript = html.indexOf('<script src="popup.js"></script>');

  assert.notEqual(calendarScript, -1);
  assert.notEqual(popupScript, -1);
  assert.ok(calendarScript < popupScript);
});

test('manifest has no legacy background calendar provider', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, 'manifest.json'), 'utf8'));
  assert.equal(manifest.background, undefined);
});

test('content scripts match both exact and nested Course Schedule URLs', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, 'manifest.json'), 'utf8'));
  const matches = manifest.content_scripts[0].matches;
  assert.ok(matches.includes('https://mumaaenroll.services.wisc.edu/courses-schedule'));
  assert.ok(matches.includes('https://mumaaenroll.services.wisc.edu/courses-schedule/*'));
});

test('popup reinjects the extractor when a schedule tab has no listener', () => {
  const popup = fs.readFileSync(path.join(projectRoot, 'popup.js'), 'utf8');
  assert.match(popup, /chrome\.scripting\.executeScript/);
  assert.match(popup, /courseDataExtractor\.js/);
  assert.match(popup, /content\.js/);
});
