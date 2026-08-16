const test = require('node:test');
const assert = require('node:assert/strict');

Object.defineProperty(globalThis, 'navigator', {
  value: { userAgent: 'Node.js', appVersion: 'Mac' },
  configurable: true
});

const Ics = require('../ics.js');

test('recurrence UNTIL is the selected end date at end-of-day America/Chicago', () => {
  const calendar = new Ics();
  calendar.addEvent(
    'Course',
    '',
    'Room',
    new Date(2027, 0, 19, 10, 0, 0),
    new Date(2027, 0, 19, 11, 0, 0),
    {
      recurrenceRule: {
        freq: 'WEEKLY',
        until: new Date(2027, 3, 30),
        byday: ['TU']
      }
    }
  );

  const output = calendar.calendar();
  assert.match(output, /UNTIL=20270501T045959Z/);
  assert.doesNotMatch(output, /2025/);
});

test('a recurrence without UNTIL or COUNT has no stale fallback end date', () => {
  const calendar = new Ics();
  calendar.addEvent(
    'One-off recurrence',
    '',
    'Room',
    new Date(2027, 0, 19, 10, 0, 0),
    new Date(2027, 0, 19, 11, 0, 0),
    { recurrenceRule: { freq: 'WEEKLY' } }
  );

  const rrule = calendar.calendar()
    .match(/RRULE:[^\r\n]+/g)
    .find(line => line.includes('FREQ=WEEKLY'));
  assert.equal(rrule, 'RRULE:FREQ=WEEKLY');
});

test('Fall recurrence ends at Central Standard Time end-of-day', () => {
  const calendar = new Ics();
  calendar.addEvent(
    'Fall course',
    '',
    'Room',
    new Date(2026, 8, 2, 10, 0, 0),
    new Date(2026, 8, 2, 11, 0, 0),
    {
      recurrenceRule: {
        freq: 'WEEKLY',
        until: new Date(2026, 11, 9),
        byday: ['WE']
      }
    }
  );

  assert.match(calendar.calendar(), /UNTIL=20261210T055959Z/);
});
