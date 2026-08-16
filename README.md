# Bucky Scheduler

Convert your UW–Madison Course Schedule into a clean calendar you can import into Apple Calendar, Google Calendar, or Outlook.

## Highlights
- Extracts courses directly from the UW Course Schedule page (`https://mumaaenroll.services.wisc.edu/courses-schedule`).
- Accurate semester handling:
  - Fall 2026 through Summer 2031 from UW–Madison's published academic calendar
  - Dynamic term availability based on the current date in `America/Chicago`
  - Separate 3-week, 4-week, and 8-week Summer sessions
- Smart iCalendar (ICS) generation:
  - Proper timezone (America/Chicago) with VTIMEZONE
  - Weekly RRULEs with correct UTC UNTIL (end-of-day)
  - EXDATEs for term-specific holidays and instructional recesses
  - Final exam events
- Multi-calendar export (Apple, Google, Outlook)
- Inline editing of extracted courses prior to export
- Term selection dropdown (no auto-detection surprises)

## Install (Developer Mode)
1. Clone or download this repository.
2. Open Chrome > Menu > Extensions > Enable “Developer mode”.
3. Click “Load unpacked” and select the project folder.
4. Pin the extension if desired.

## Usage
1. Open the popup and select an available term. For Summer, also select the 3-week, 4-week, or 8-week session.
2. Click the link to open the UW Course Schedule page and ensure you are logged in.
3. Click “Download” (Extract Schedule) in the popup.
4. Review the “Your Schedule for …” view.
   - You can edit any field inline (course name, section, times, location, dates, additional sections, final exam).
   - Changes are applied immediately and will be used for export.
5. Choose your target calendar (Apple, Google, Outlook) and click “Export Schedule”.

## Editing Guidelines (Inline)
- Schedule format example: `Mon, Wed 11:00 AM - 12:15 PM`
- Dates format example: `Sep 2, 2026 - Dec 9, 2026`
- Additional section lines example:
  - `DIS 301: Wed 2:25 PM - 3:15 PM at Engineering Hall Room B209`
- Final exam example:
  - `Dec 17 12:25 PM - 2:25 PM at Hall 101`

## Academic Calendar & Holidays
- `academicCalendar.js` is the single source of truth for all supported academic dates.
- Supported terms begin with Fall 2026 and end with Summer 2031.
- Once a term begins, earlier terms are removed from the picker. Summer becomes current at the earliest Summer session start and remains available until the next Fall begins.
- Holiday EXDATEs are added at the event start time for Labor Day, Thanksgiving recess, Martin Luther King Jr. Day, spring recess, Memorial Day, and observed Independence Day when they intersect the selected term or Summer session.
- Timezone handling uses America/Chicago with DST transitions embedded in ICS.

## Files Overview
- `manifest.json` – Chrome extension manifest
- `academicCalendar.js` – canonical academic calendar class and 2026–2031 date data
- `popup.html`, `popup.css`, `popup.js` – Popup UI, UX, and orchestration
- `content.js` – Message listener and bridge for extraction
- `courseDataExtractor.js` – Robust JSON-based extraction logic
- `ics.js` – ICS creation with timezone and recurrence support

## Permissions
- `activeTab` – to read the current tab for extraction
- `scripting` – to run the content script in the active tab
- Host permissions: `https://mumaaenroll.services.wisc.edu/*` for schedule extraction

## Troubleshooting
- If the Course Schedule tab was already open when the extension was reloaded, click Download again; the extension will inject its current extractor automatically.
- No courses found: confirm you’re signed in and the schedule page is loaded; select the correct term in the popup and retry.
- Recurrences look wrong or never end: ensure you selected the correct term and Summer session.
- Holiday not skipped: verify “Exclude university holidays” is checked before export.

## Privacy
- The extension processes your schedule locally in your browser.
- No personal data is transmitted to external servers.
- Generated ICS files are downloaded locally.

## Development Notes
- The generator uses one weekly RRULE per weekday with a UTC UNTIL at the selected term/session end (end-of-day in America/Chicago), and per-event EXDATEs for holidays.
- Final exam dates are added as single VEVENTs.
- Run the dependency-free test suite with `node --test`.

## License
MIT
