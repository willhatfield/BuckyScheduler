/*
 * Canonical UW-Madison academic calendar data.
 *
 * Source: University of Wisconsin-Madison Academic Calendar for 2026-2031
 * (PrintVersion_AcademicCalendar_2026-2031.pdf).
 *
 * Keep all supported academic dates in this file. The rest of the extension
 * obtains term ranges and holiday exclusions through AcademicCalendar.
 */
(function(root) {
  'use strict';

  const TIME_ZONE = 'America/Chicago';
  const SUPPORT_END_DATE = '2031-08-10';

  const terms = [
    {
      id: 'fall2026', label: 'Fall 2026', season: 'fall', year: 2026,
      facultyContractStart: '2026-08-17', instructionStart: '2026-09-02',
      lastClassDay: '2026-12-09', studyDay: '2026-12-10',
      exams: { startDate: '2026-12-11', endDate: '2026-12-17' },
      commencement: { startDate: '2026-12-13', endDate: '2026-12-13' },
      gradingDeadline: '2026-12-20',
      holidays: [
        { name: 'Labor Day', startDate: '2026-09-07', endDate: '2026-09-07' },
        { name: 'Thanksgiving Recess', startDate: '2026-11-26', endDate: '2026-11-29' }
      ]
    },
    {
      id: 'spring2027', label: 'Spring 2027', season: 'spring', year: 2027,
      instructionStart: '2027-01-19', classesResume: '2027-03-29', lastClassDay: '2027-04-30',
      studyDay: '2027-05-01',
      exams: { startDate: '2027-05-02', endDate: '2027-05-07' },
      commencement: { startDate: '2027-05-07', endDate: '2027-05-09' },
      gradingDeadline: '2027-05-10', facultyContractEnd: '2027-05-16',
      holidays: [
        { name: 'Martin Luther King Jr. Day', startDate: '2027-01-18', endDate: '2027-01-18' },
        { name: 'Spring Recess', startDate: '2027-03-20', endDate: '2027-03-28' }
      ]
    },
    {
      id: 'summer2027', label: 'Summer 2027', season: 'summer', year: 2027,
      sessions: [
        { id: '3-week', label: '3-week session', startDate: '2027-05-24', endDate: '2027-06-13' },
        { id: '4-week', label: '4-week session', startDate: '2027-05-17', endDate: '2027-06-13' },
        { id: '8-week', label: '8-week session', startDate: '2027-06-14', endDate: '2027-08-08' }
      ],
      gradingDeadline: '2027-08-11',
      holidays: [
        { name: 'Memorial Day (observed)', startDate: '2027-05-31', endDate: '2027-05-31' },
        { name: 'Independence Day (observed)', startDate: '2027-07-05', endDate: '2027-07-05' }
      ]
    },
    {
      id: 'fall2027', label: 'Fall 2027', season: 'fall', year: 2027,
      facultyContractStart: '2027-08-23', instructionStart: '2027-09-02',
      lastClassDay: '2027-12-10', studyDay: '2027-12-11',
      exams: { startDate: '2027-12-12', endDate: '2027-12-17' },
      commencement: { startDate: '2027-12-19', endDate: '2027-12-19' },
      gradingDeadline: '2027-12-20',
      holidays: [
        { name: 'Labor Day', startDate: '2027-09-06', endDate: '2027-09-06' },
        { name: 'Thanksgiving Recess', startDate: '2027-11-25', endDate: '2027-11-28' }
      ]
    },
    {
      id: 'spring2028', label: 'Spring 2028', season: 'spring', year: 2028,
      instructionStart: '2028-01-25', classesResume: '2028-04-03', lastClassDay: '2028-05-05',
      studyDay: '2028-05-06',
      exams: { startDate: '2028-05-07', endDate: '2028-05-12' },
      commencement: { startDate: '2028-05-12', endDate: '2028-05-14' },
      gradingDeadline: '2028-05-15', facultyContractEnd: '2028-05-21',
      holidays: [
        { name: 'Martin Luther King Jr. Day', startDate: '2028-01-17', endDate: '2028-01-17' },
        { name: 'Spring Recess', startDate: '2028-03-25', endDate: '2028-04-02' }
      ]
    },
    {
      id: 'summer2028', label: 'Summer 2028', season: 'summer', year: 2028,
      sessions: [
        { id: '3-week', label: '3-week session', startDate: '2028-05-30', endDate: '2028-06-18' },
        { id: '4-week', label: '4-week session', startDate: '2028-05-22', endDate: '2028-06-18' },
        { id: '8-week', label: '8-week session', startDate: '2028-06-19', endDate: '2028-08-13' }
      ],
      gradingDeadline: '2028-08-16',
      holidays: [
        { name: 'Memorial Day (observed)', startDate: '2028-05-29', endDate: '2028-05-29' },
        { name: 'Independence Day (observed)', startDate: '2028-07-04', endDate: '2028-07-04' }
      ]
    },
    {
      id: 'fall2028', label: 'Fall 2028', season: 'fall', year: 2028,
      facultyContractStart: '2028-08-21', instructionStart: '2028-09-06',
      lastClassDay: '2028-12-13', studyDay: '2028-12-14',
      exams: { startDate: '2028-12-15', endDate: '2028-12-21' },
      commencement: { startDate: '2028-12-17', endDate: '2028-12-17' },
      gradingDeadline: '2028-12-24',
      holidays: [
        { name: 'Labor Day', startDate: '2028-09-04', endDate: '2028-09-04' },
        { name: 'Thanksgiving Recess', startDate: '2028-11-23', endDate: '2028-11-26' }
      ]
    },
    {
      id: 'spring2029', label: 'Spring 2029', season: 'spring', year: 2029,
      instructionStart: '2029-01-23', classesResume: '2029-04-02', lastClassDay: '2029-05-04',
      studyDay: '2029-05-05',
      exams: { startDate: '2029-05-06', endDate: '2029-05-11' },
      commencement: { startDate: '2029-05-11', endDate: '2029-05-13' },
      gradingDeadline: '2029-05-14', facultyContractEnd: '2029-05-20',
      holidays: [
        { name: 'Martin Luther King Jr. Day', startDate: '2029-01-15', endDate: '2029-01-15' },
        { name: 'Spring Recess', startDate: '2029-03-24', endDate: '2029-04-01' }
      ]
    },
    {
      id: 'summer2029', label: 'Summer 2029', season: 'summer', year: 2029,
      sessions: [
        { id: '3-week', label: '3-week session', startDate: '2029-05-29', endDate: '2029-06-17' },
        { id: '4-week', label: '4-week session', startDate: '2029-05-21', endDate: '2029-06-17' },
        { id: '8-week', label: '8-week session', startDate: '2029-06-18', endDate: '2029-08-12' }
      ],
      gradingDeadline: '2029-08-15',
      holidays: [
        { name: 'Memorial Day (observed)', startDate: '2029-05-28', endDate: '2029-05-28' },
        { name: 'Independence Day (observed)', startDate: '2029-07-04', endDate: '2029-07-04' }
      ]
    },
    {
      id: 'fall2029', label: 'Fall 2029', season: 'fall', year: 2029,
      facultyContractStart: '2029-08-20', instructionStart: '2029-09-05',
      lastClassDay: '2029-12-12', studyDay: '2029-12-13',
      exams: { startDate: '2029-12-14', endDate: '2029-12-20' },
      commencement: { startDate: '2029-12-16', endDate: '2029-12-16' },
      gradingDeadline: '2029-12-23',
      holidays: [
        { name: 'Labor Day', startDate: '2029-09-03', endDate: '2029-09-03' },
        { name: 'Thanksgiving Recess', startDate: '2029-11-22', endDate: '2029-11-25' }
      ]
    },
    {
      id: 'spring2030', label: 'Spring 2030', season: 'spring', year: 2030,
      instructionStart: '2030-01-22', classesResume: '2030-04-01', lastClassDay: '2030-05-03',
      studyDay: '2030-05-04',
      exams: { startDate: '2030-05-05', endDate: '2030-05-10' },
      commencement: { startDate: '2030-05-10', endDate: '2030-05-12' },
      gradingDeadline: '2030-05-13', facultyContractEnd: '2030-05-19',
      holidays: [
        { name: 'Martin Luther King Jr. Day', startDate: '2030-01-21', endDate: '2030-01-21' },
        { name: 'Spring Recess', startDate: '2030-03-23', endDate: '2030-03-31' }
      ]
    },
    {
      id: 'summer2030', label: 'Summer 2030', season: 'summer', year: 2030,
      sessions: [
        { id: '3-week', label: '3-week session', startDate: '2030-05-28', endDate: '2030-06-16' },
        { id: '4-week', label: '4-week session', startDate: '2030-05-20', endDate: '2030-06-16' },
        { id: '8-week', label: '8-week session', startDate: '2030-06-17', endDate: '2030-08-11' }
      ],
      gradingDeadline: '2030-08-14',
      holidays: [
        { name: 'Memorial Day (observed)', startDate: '2030-05-27', endDate: '2030-05-27' },
        { name: 'Independence Day (observed)', startDate: '2030-07-04', endDate: '2030-07-04' }
      ]
    },
    {
      id: 'fall2030', label: 'Fall 2030', season: 'fall', year: 2030,
      facultyContractStart: '2030-08-19', instructionStart: '2030-09-04',
      lastClassDay: '2030-12-11', studyDay: '2030-12-12',
      exams: { startDate: '2030-12-13', endDate: '2030-12-19' },
      commencement: { startDate: '2030-12-15', endDate: '2030-12-15' },
      gradingDeadline: '2030-12-22',
      holidays: [
        { name: 'Labor Day', startDate: '2030-09-02', endDate: '2030-09-02' },
        { name: 'Thanksgiving Recess', startDate: '2030-11-28', endDate: '2030-12-01' }
      ]
    },
    {
      id: 'spring2031', label: 'Spring 2031', season: 'spring', year: 2031,
      instructionStart: '2031-01-21', classesResume: '2031-03-31', lastClassDay: '2031-05-02',
      studyDay: '2031-05-03',
      exams: { startDate: '2031-05-04', endDate: '2031-05-09' },
      commencement: { startDate: '2031-05-09', endDate: '2031-05-10' },
      gradingDeadline: '2031-05-12', facultyContractEnd: '2031-05-18',
      holidays: [
        { name: 'Martin Luther King Jr. Day', startDate: '2031-01-20', endDate: '2031-01-20' },
        { name: 'Spring Recess', startDate: '2031-03-22', endDate: '2031-03-30' }
      ]
    },
    {
      id: 'summer2031', label: 'Summer 2031', season: 'summer', year: 2031,
      sessions: [
        { id: '3-week', label: '3-week session', startDate: '2031-05-27', endDate: '2031-06-15' },
        { id: '4-week', label: '4-week session', startDate: '2031-05-19', endDate: '2031-06-15' },
        { id: '8-week', label: '8-week session', startDate: '2031-06-16', endDate: '2031-08-10' }
      ],
      gradingDeadline: '2031-08-13',
      holidays: [
        { name: 'Memorial Day (observed)', startDate: '2031-05-26', endDate: '2031-05-26' },
        { name: 'Independence Day (observed)', startDate: '2031-07-04', endDate: '2031-07-04' }
      ]
    }
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function chicagoDateKey(date) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date);
    const values = {};
    parts.forEach(part => {
      if (part.type !== 'literal') values[part.type] = part.value;
    });
    return `${values.year}-${values.month}-${values.day}`;
  }

  function visibilityStart(term) {
    if (term.season !== 'summer') return term.instructionStart;
    return term.sessions.reduce((earliest, session) => (
      !earliest || session.startDate < earliest ? session.startDate : earliest
    ), null);
  }

  function intervalsOverlap(firstStart, firstEnd, secondStart, secondEnd) {
    return firstStart <= secondEnd && secondStart <= firstEnd;
  }

  class AcademicCalendar {
    constructor() {
      this.timeZone = TIME_ZONE;
      this.supportEndDate = SUPPORT_END_DATE;
    }

    getAvailableTerms(now = new Date()) {
      const dateKey = chicagoDateKey(now);
      if (dateKey > this.supportEndDate) return [];

      let activeIndex = -1;
      terms.forEach((term, index) => {
        if (visibilityStart(term) <= dateKey) activeIndex = index;
      });

      const available = activeIndex >= 0 ? terms.slice(activeIndex) : terms;
      return clone(available.map(term => ({
        id: term.id,
        label: term.label,
        season: term.season,
        year: term.year,
        visibilityStartDate: visibilityStart(term),
        sessions: term.sessions || []
      })));
    }

    getTerm(termId, summerSessionId = null) {
      const term = terms.find(item => item.id === termId);
      if (!term) throw new Error(`Unsupported academic term: ${termId}`);

      if (term.season === 'summer') {
        const session = term.sessions.find(item => item.id === summerSessionId);
        if (!session) {
          throw new Error(`Select a valid Summer session for ${term.label}.`);
        }

        return clone({
          ...term,
          label: `${term.label} (${session.label})`,
          baseLabel: term.label,
          sessionId: session.id,
          sessionLabel: session.label,
          startDate: session.startDate,
          endDate: session.endDate,
          holidays: term.holidays.filter(holiday => intervalsOverlap(
            holiday.startDate,
            holiday.endDate,
            session.startDate,
            session.endDate
          ))
        });
      }

      return clone({
        ...term,
        baseLabel: term.label,
        sessionId: null,
        sessionLabel: null,
        startDate: term.instructionStart,
        endDate: term.lastClassDay
      });
    }

    getAllTerms() {
      return clone(terms);
    }

    getChicagoDateKey(now = new Date()) {
      return chicagoDateKey(now);
    }
  }

  root.AcademicCalendar = AcademicCalendar;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AcademicCalendar };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
