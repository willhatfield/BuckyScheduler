const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const runtimeFiles = [
  'popup.js',
  'content.js',
  'courseDataExtractor.js',
  'ics.js'
];

test('runtime code contains no legacy academic-date fallback logic', () => {
  const legacyPatterns = [
    /getSemesterDates/,
    /termName\s*===/,
    /defaulting to Fall/i,
    /DEFAULT_SEMESTER/,
    /Use the appropriate academic year/
  ];

  runtimeFiles.forEach(file => {
    const source = fs.readFileSync(path.join(projectRoot, file), 'utf8');
    legacyPatterns.forEach(pattern => {
      assert.doesNotMatch(source, pattern, `${file} contains ${pattern}`);
    });
  });
});

test('refactored extension is distinguishable from the installed 1.3.0 build', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, 'manifest.json'), 'utf8'));
  assert.equal(manifest.version, '2.0.0');
  assert.match(manifest.version_name, /Academic Calendar Refactor/);
});
