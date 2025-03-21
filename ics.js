/* ics.js - v0.2.0 */
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
  var BYDAY_VALUES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

  return {
    /**
     * Returns events array
     * @return {array} Events
     */
    'events': function() {
      return calendarEvents;
    },

    /**
     * Returns calendar
     * @return {string} Calendar in iCalendar format
     */
    'calendar': function() {
      return calendarStart + SEPARATOR + calendarEvents.join(SEPARATOR) + calendarEnd;
    },

    /**
     * Add event to the calendar
     * @param  {string} subject     Subject/Title of event
     * @param  {string} description Description of event
     * @param  {string} location    Location of event
     * @param  {string} begin       Beginning date of event
     * @param  {string} stop        Ending date of event
     * @param  {object} options     Additional event options
     */
    'addEvent': function(subject, description, location, begin, stop, options) {
      // I'm not in the mood to validate the inputs, so just don't mess up
      if (typeof subject === 'undefined' ||
        typeof description === 'undefined' ||
        typeof location === 'undefined' ||
        typeof begin === 'undefined' ||
        typeof stop === 'undefined'
      ) {
        return false;
      }

      options = options || {};
      
      var start = formatDate(begin);
      var end = formatDate(stop);

      var calendarEvent = [
        'BEGIN:VEVENT',
        'UID:' + generateUID(subject, begin),
        'CLASS:PUBLIC',
        'DESCRIPTION:' + description,
        'DTSTAMP:' + formatDateUTC(new Date()),
        'DTSTART;TZID=America/Chicago:' + start,
        'DTEND;TZID=America/Chicago:' + end,
        'LOCATION:' + location,
        'SUMMARY;LANGUAGE=en-us:' + subject,
        'TRANSP:TRANSPARENT'
      ];

      // Handle recurrence rule if provided
      if (options.recurrenceRule) {
        var rrule = 'RRULE:FREQ=' + options.recurrenceRule.freq;
        
        if (options.recurrenceRule.until) {
          rrule += ';UNTIL=' + formatDate(options.recurrenceRule.until);
        }
        
        if (options.recurrenceRule.count) {
          rrule += ';COUNT=' + options.recurrenceRule.count;
        }
        
        if (options.recurrenceRule.interval) {
          rrule += ';INTERVAL=' + options.recurrenceRule.interval;
        }
        
        if (options.recurrenceRule.byday && options.recurrenceRule.byday.length) {
          rrule += ';BYDAY=' + options.recurrenceRule.byday.join(',');
        }
        
        calendarEvent.push(rrule);
      }
      
      // Handle excluded dates
      if (options.excludeDates && options.excludeDates.length) {
        options.excludeDates.forEach(function(date) {
          calendarEvent.push('EXDATE;TZID=America/Chicago:' + formatDate(date));
        });
      }
      
      // Handle alarms
      if (options.alarms && options.alarms.length) {
        options.alarms.forEach(function(alarm) {
          calendarEvent.push('BEGIN:VALARM');
          calendarEvent.push('ACTION:' + alarm.action);
          
          if (alarm.trigger) {
            if (alarm.trigger.minutes) {
              var sign = alarm.trigger.before ? '-' : '';
              calendarEvent.push('TRIGGER:' + sign + 'PT' + alarm.trigger.minutes + 'M');
            } else if (alarm.trigger.date) {
              calendarEvent.push('TRIGGER;VALUE=DATE-TIME:' + formatDate(alarm.trigger.date));
            }
          }
          
          calendarEvent.push('END:VALARM');
        });
      }

      calendarEvent.push('END:VEVENT');
      calendarEvents.push(calendarEvent.join(SEPARATOR));
      return calendarEvent;
    },

    /**
     * Download calendar using the saveAs function from FileSaver.js
     * @param  {string} filename Filename
     * @param  {string} ext      Extention
     */
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

  function formatDate(date) {
    // Format date in local time for consistent display across DST changes
    // Format: YYYYMMDDTHHMMSS (local time)
    const pad = (n) => n < 10 ? '0' + n : n;
    
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    
    return year + month + day + 'T' + hours + minutes + seconds;
  }
  
  function formatDateUTC(date) {
    // Format date in UTC for timestamp fields that require it
    var formatted = date.toISOString().replace(/-|:|\.\d+/g, '');
    
    // Make sure it ends with Z to indicate UTC time
    if (formatted.charAt(formatted.length - 1) !== 'Z') {
      formatted += 'Z';
    }
    
    return formatted;
  }

  function generateUID(subject, start) {
    var uid = encodeURIComponent(subject).replace(/%20/g, '').replace(/[^a-z0-9]/gi, '') + start.getTime() + '@' + uidDomain;
    return uid;
  }

  // FileSaver.js implementation for downloading files
  function saveAs(blob, filename) {
    try {
      // Create a download link and trigger it
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a); // Append to body for Firefox compatibility
      a.click();
      setTimeout(function() {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(a.href);
      }, 100);
    } catch (e) {
      console.error('Error saving file:', e);
      // Fallback method for some browsers
      if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(blob, filename);
      } else {
        console.error('Could not save file. Browser may not support download API.');
      }
    }
  }
}; 