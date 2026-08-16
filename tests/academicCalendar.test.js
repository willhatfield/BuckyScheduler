const test = require('node:test');
const assert = require('node:assert/strict');

const { AcademicCalendar } = require('../academicCalendar.js');

const calendar = new AcademicCalendar();

test('catalog begins with Fall 2026 and contains every PDF term in order', () => {
  const terms = calendar.getAllTerms();
  assert.equal(terms.length, 15);
  assert.deepEqual(
    terms.map(term => term.label),
    [
      'Fall 2026', 'Spring 2027', 'Summer 2027',
      'Fall 2027', 'Spring 2028', 'Summer 2028',
      'Fall 2028', 'Spring 2029', 'Summer 2029',
      'Fall 2029', 'Spring 2030', 'Summer 2030',
      'Fall 2030', 'Spring 2031', 'Summer 2031'
    ]
  );
});

test('August 16, 2026 exposes every supported term beginning with Fall 2026', () => {
  const available = calendar.getAvailableTerms(new Date('2026-08-16T12:00:00-05:00'));
  assert.equal(available.length, 15);
  assert.equal(available[0].id, 'fall2026');
  assert.equal(available.at(-1).id, 'summer2031');
});

test('Fall and Spring instruction ranges match the PDF', () => {
  const expected = {
    fall2026: ['2026-09-02', '2026-12-09'],
    spring2027: ['2027-01-19', '2027-04-30'],
    fall2027: ['2027-09-02', '2027-12-10'],
    spring2028: ['2028-01-25', '2028-05-05'],
    fall2028: ['2028-09-06', '2028-12-13'],
    spring2029: ['2029-01-23', '2029-05-04'],
    fall2029: ['2029-09-05', '2029-12-12'],
    spring2030: ['2030-01-22', '2030-05-03'],
    fall2030: ['2030-09-04', '2030-12-11'],
    spring2031: ['2031-01-21', '2031-05-02']
  };

  Object.entries(expected).forEach(([termId, range]) => {
    const term = calendar.getTerm(termId);
    assert.deepEqual([term.startDate, term.endDate], range, termId);
  });
});

test('Fall and Spring exam windows match the PDF', () => {
  const expected = {
    fall2026: ['2026-12-11', '2026-12-17'],
    spring2027: ['2027-05-02', '2027-05-07'],
    fall2027: ['2027-12-12', '2027-12-17'],
    spring2028: ['2028-05-07', '2028-05-12'],
    fall2028: ['2028-12-15', '2028-12-21'],
    spring2029: ['2029-05-06', '2029-05-11'],
    fall2029: ['2029-12-14', '2029-12-20'],
    spring2030: ['2030-05-05', '2030-05-10'],
    fall2030: ['2030-12-13', '2030-12-19'],
    spring2031: ['2031-05-04', '2031-05-09']
  };

  Object.entries(expected).forEach(([termId, range]) => {
    const term = calendar.getTerm(termId);
    assert.deepEqual([term.exams.startDate, term.exams.endDate], range, termId);
  });
});

test('all Summer session ranges match the PDF', () => {
  const expected = {
    summer2027: {
      '3-week': ['2027-05-24', '2027-06-13'],
      '4-week': ['2027-05-17', '2027-06-13'],
      '8-week': ['2027-06-14', '2027-08-08']
    },
    summer2028: {
      '3-week': ['2028-05-30', '2028-06-18'],
      '4-week': ['2028-05-22', '2028-06-18'],
      '8-week': ['2028-06-19', '2028-08-13']
    },
    summer2029: {
      '3-week': ['2029-05-29', '2029-06-17'],
      '4-week': ['2029-05-21', '2029-06-17'],
      '8-week': ['2029-06-18', '2029-08-12']
    },
    summer2030: {
      '3-week': ['2030-05-28', '2030-06-16'],
      '4-week': ['2030-05-20', '2030-06-16'],
      '8-week': ['2030-06-17', '2030-08-11']
    },
    summer2031: {
      '3-week': ['2031-05-27', '2031-06-15'],
      '4-week': ['2031-05-19', '2031-06-15'],
      '8-week': ['2031-06-16', '2031-08-10']
    }
  };

  Object.entries(expected).forEach(([termId, sessions]) => {
    Object.entries(sessions).forEach(([sessionId, range]) => {
      const term = calendar.getTerm(termId, sessionId);
      assert.deepEqual([term.startDate, term.endDate], range, `${termId} ${sessionId}`);
    });
  });
});

test('term rollover uses midnight America/Chicago', () => {
  assert.equal(
    calendar.getAvailableTerms(new Date('2027-01-19T05:59:59Z'))[0].id,
    'fall2026'
  );
  assert.equal(
    calendar.getAvailableTerms(new Date('2027-01-19T06:00:00Z'))[0].id,
    'spring2027'
  );
});

test('earliest Summer start hides Spring and Summer remains until Fall starts', () => {
  assert.equal(
    calendar.getAvailableTerms(new Date('2027-05-17T04:59:59Z'))[0].id,
    'spring2027'
  );
  assert.equal(
    calendar.getAvailableTerms(new Date('2027-05-17T05:00:00Z'))[0].id,
    'summer2027'
  );
  assert.equal(
    calendar.getAvailableTerms(new Date('2027-09-02T04:59:59Z'))[0].id,
    'summer2027'
  );
  assert.equal(
    calendar.getAvailableTerms(new Date('2027-09-02T05:00:00Z'))[0].id,
    'fall2027'
  );
});

test('no terms are exposed after the configured calendar expires', () => {
  assert.equal(
    calendar.getAvailableTerms(new Date('2031-08-10T12:00:00Z'))[0].id,
    'summer2031'
  );
  assert.deepEqual(
    calendar.getAvailableTerms(new Date('2031-08-11T05:00:00Z')),
    []
  );
});

test('Summer holidays are limited to the selected session range', () => {
  assert.deepEqual(
    calendar.getTerm('summer2028', '3-week').holidays,
    []
  );
  assert.deepEqual(
    calendar.getTerm('summer2028', '4-week').holidays.map(item => item.name),
    ['Memorial Day (observed)']
  );
  assert.deepEqual(
    calendar.getTerm('summer2028', '8-week').holidays.map(item => item.name),
    ['Independence Day (observed)']
  );
});

test('recess weekends are represented as inclusive ranges', () => {
  const fall = calendar.getTerm('fall2030');
  const spring = calendar.getTerm('spring2028');
  assert.deepEqual(fall.holidays[1], {
    name: 'Thanksgiving Recess',
    startDate: '2030-11-28',
    endDate: '2030-12-01'
  });
  assert.deepEqual(spring.holidays[1], {
    name: 'Spring Recess',
    startDate: '2028-03-25',
    endDate: '2028-04-02'
  });
});
