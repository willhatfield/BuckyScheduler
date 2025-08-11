/* ics.js - v0.2.0 (patched) */
var ics = function(uidDomain, prodId) {
  'use strict';

  if (navigator.userAgent.indexOf('MSIE') > -1 && navigator.userAgent.indexOf('MSIE 10') == -1) {
    console.log('Unsupported Browser');
    return;
  }

  if (typeof uidDomain === 'undefined') { uidDomain = 'default'; }
  if (typeof prodId === 'undefined') { prodId = 'Calendar'; }

  var SEPARATOR = (navigator.appVersion.indexOf('Win') !== -1) ? '\r\n' : '\n';
  var calendarEvents = [];
  var calendarStart = [
    'BEGIN:VCALENDAR',
    'PRODID:-//' + prodId + '//EN',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-TIMEZONE:America/Chicago',
    'BEGIN:VTIMEZONE',
    'TZID:America/Chicago',
    'X-LIC-LOCATION:America/Chicago',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0600',
    'TZOFFSETTO:-0500',
    'TZNAME:CDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0600',
    'TZNAME:CST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE'
  ].join(SEPARATOR);
  var calendarEnd = SEPARATOR + 'END:VCALENDAR';

  // --------- Helpers / Fixes ----------

  // Default semester end (local Central time). Adjust if needed.
  var DEFAULT_SEMESTER_END_LOCAL = new Date('2025-12-19T23:59:59-06:00');

  function toDate(x) {
    if (x instanceof Date) return new Date(x.getTime());
    if (typeof x === 'number') return new Date(x);     // epoch ms
    if (typeof x === 'string') return new Date(x);      // ISO-ish
    throw new Error('Invalid date input: ' + x);
  }

  // If caller didn't provide COUNT or UNTIL, apply default UNTIL (semester end)
  function computeUntilUTC(recurrenceRule) {
    if (recurrenceRule && recurrenceRule.until) {
      var d = toDate(recurrenceRule.until);
      d.setHours(23, 59, 59, 0); // include last day
      return formatDateUTC(d);
    }
    // If COUNT is provided, don't force UNTIL (RFC recommends not mixing)
    if (recurrenceRule && recurrenceRule.count) return null;

    // No until/count provided -> default to semester end
    var def = new Date(DEFAULT_SEMESTER_END_LOCAL.getTime());
    def.setHours(23, 59, 59, 0);
    return formatDateUTC(def);
  }

  // Build an EXDATE at the same local time-of-day as event start, on holiday date
  function exdateAtLocalStart(holidayYMD, eventLocalStart) {
    var base = toDate(holidayYMD);       // e.g., '2025-11-27'
    var start = toDate(eventLocalStart); // actual event start
    base.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), 0);
    return formatDate(base);             // local YYYYMMDDTHHMMSS
  }

  function formatDate(date) {
    // Local time: YYYYMMDDTHHMMSS
    var d = toDate(date);
    const pad = (n) => n < 10 ? '0' + n : '' + n;
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());
    return year + month + day + 'T' + hours + minutes + seconds;
  }

  function formatDateUTC(date) {
    // UTC: YYYYMMDDTHHMMSSZ
    var d = toDate(date);
    const pad = (n) => n < 10 ? '0' + n : '' + n;
    const year = d.getUTCFullYear();
    const month = pad(d.getUTCMonth() + 1);
    const day = pad(d.getUTCDate());
    const hours = pad(d.getUTCHours());
    const minutes = pad(d.getUTCMinutes());
    const seconds = pad(d.getUTCSeconds());
    return year + month + day + 'T' + hours + minutes + seconds + 'Z';
  }

  function generateUID(subject, start) {
    var s = (subject || '') + '';
    var safe = encodeURIComponent(s).replace(/%20/g, '').replace(/[^a-z0-9]/gi, '');
    var t = (start instanceof Date) ? start.getTime() : toDate(start).getTime();
    return safe + t + '@' + uidDomain;
  }

  // FileSaver.js helper
  function saveAs(blob, filename) {
    try {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function() {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(a.href);
      }, 100);
    } catch (e) {
      console.error('Error saving file:', e);
      if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(blob, filename);
      } else {
        console.error('Could not save file. Browser may not support download API.');
      }
    }
  }

  // -------------- Public API ---------------
  return {
    'events': function() {
      return calendarEvents;
    },

    'calendar': function() {
      return calendarStart + SEPARATOR + calendarEvents.join(SEPARATOR) + calendarEnd;
    },

    /**
     * Add event to the calendar
     * @param  {string} subject
     * @param  {string} description
     * @param  {string} location
     * @param  {Date|number|string} begin
     * @param  {Date|number|string} stop
     * @param  {object} options
     *   - recurrenceRule: {
     *       freq: 'WEEKLY'|'DAILY'|...,
     *       until?: Date|string|number,
     *       count?: number,
     *       interval?: number,
     *       byday?: string[] // e.g., ['MO','WE','FR']
     *     }
     *   - holidays?: string[] // e.g., ['2025-11-27','2025-11-28']
     *   - excludeDates?: (Date|string|number)[]
     *   - alarms?: [{ action: 'display', trigger: { minutes?: number, before?: boolean, date?: Date|string|number } }]
     */
    'addEvent': function(subject, description, location, begin, stop, options) {
      if (typeof subject === 'undefined' ||
          typeof description === 'undefined' ||
          typeof location === 'undefined' ||
          typeof begin === 'undefined' ||
          typeof stop === 'undefined') {
        return false;
      }

      options = options || {};

      // Coerce dates to avoid malformed stamps
      var beginDate = toDate(begin);
      var stopDate  = toDate(stop);

      var start = formatDate(beginDate);
      var end   = formatDate(stopDate);

      var calendarEvent = [
        'BEGIN:VEVENT',
        'UID:' + generateUID(subject, beginDate),
        'CLASS:PUBLIC',
        'DESCRIPTION:' + description,
        'DTSTAMP:' + formatDateUTC(new Date()),
        'DTSTART;TZID=America/Chicago:' + start,
        'DTEND;TZID=America/Chicago:' + end,
        'LOCATION:' + location,
        'SUMMARY;LANGUAGE=en-us:' + subject,
        'TRANSP:TRANSPARENT'
      ];

      // Recurrence
      if (options.recurrenceRule) {
        var rr = options.recurrenceRule;
        var rrule = 'RRULE:FREQ=' + rr.freq;

        // Prefer caller-provided UNTIL; else if COUNT given, keep COUNT; else default UNTIL
        var untilUTC = computeUntilUTC(rr);
        if (untilUTC) rrule += ';UNTIL=' + untilUTC;

        if (rr.count)    rrule += ';COUNT=' + rr.count;
        if (rr.interval) rrule += ';INTERVAL=' + rr.interval;
        if (rr.byday && rr.byday.length) {
          rrule += ';BYDAY=' + rr.byday.join(',');
        }
        calendarEvent.push(rrule);
      }

      // Explicit excluded dates
      if (options.excludeDates && options.excludeDates.length) {
        options.excludeDates.forEach(function(date) {
          calendarEvent.push('EXDATE;TZID=America/Chicago:' + formatDate(toDate(date)));
        });
      }

      // Holidays to pause series (use event's local start time)
      if (options.holidays && options.holidays.length) {
        options.holidays.forEach(function(h) {
          calendarEvent.push('EXDATE;TZID=America/Chicago:' + exdateAtLocalStart(h, beginDate));
        });
      }

      // Alarms
      if (options.alarms && options.alarms.length) {
        options.alarms.forEach(function(alarm) {
          calendarEvent.push('BEGIN:VALARM');
          calendarEvent.push('ACTION:' + alarm.action);

          if (alarm.trigger) {
            if (typeof alarm.trigger.minutes === 'number') {
              var sign = alarm.trigger.before ? '-' : '';
              calendarEvent.push('TRIGGER:' + sign + 'PT' + alarm.trigger.minutes + 'M');
            } else if (alarm.trigger.date) {
              calendarEvent.push('TRIGGER;VALUE=DATE-TIME:' + formatDate(toDate(alarm.trigger.date)));
            }
          }

          calendarEvent.push('END:VALARM');
        });
      }

      calendarEvent.push('END:VEVENT');
      calendarEvents.push(calendarEvent.join(SEPARATOR));
      return calendarEvent;
    },

    'download': function(filename, ext) {
      if (calendarEvents.length < 1) {
        return false;
      }

      ext = (typeof ext !== 'undefined') ? ext : '.ics';
      filename = (typeof filename !== 'undefined') ? filename : 'calendar';
      var calendar = calendarStart + SEPARATOR + calendarEvents.join(SEPARATOR) + calendarEnd;

      var blob = new Blob([calendar], { type: 'text/calendar;charset=utf-8' });
      saveAs(blob, filename + ext);
      return calendar;
    }
  };
};
