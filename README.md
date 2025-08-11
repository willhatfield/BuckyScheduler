# Bucky Scheduler

Convert your UW–Madison Course Schedule into a clean calendar you can import into Apple Calendar, Google Calendar, or Outlook.

## Highlights
- Extracts courses directly from the UW Course Schedule page (`https://mumaaenroll.services.wisc.edu/courses-schedule`).
- Accurate semester handling:
  - Fall 2025 classes: Sep 3 – Dec 10, 2025 (end before finals)
  - Spring 2026 classes: Jan 20 – May 1, 2026
- Smart iCalendar (ICS) generation:
  - Proper timezone (America/Chicago) with VTIMEZONE
  - Weekly RRULEs with correct UTC UNTIL (end-of-day)
  - EXDATEs to skip holidays (Labor Day; Thanksgiving/Day after)
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
1. Open the popup and select the term (Summer 2025, Fall 2025, Spring 2026).
2. Click the link to open the UW Course Schedule page and ensure you are logged in.
3. Click “Download” (Extract Schedule) in the popup.
4. Review the “Your Schedule for …” view.
   - You can edit any field inline (course name, section, times, location, dates, additional sections, final exam).
   - Changes are applied immediately and will be used for export.
5. Choose your target calendar (Apple, Google, Outlook) and click “Export Schedule”.

## Editing Guidelines (Inline)
- Schedule format example: `Mon, Wed 11:00 AM - 12:15 PM`
- Dates format example: `Sep 3, 2025 - Dec 10, 2025`
- Additional section lines example:
  - `DIS 301: Wed 2:25 PM - 3:15 PM at Engineering Hall Room B209`
- Final exam example:
  - `Dec 17 12:25 PM - 2:25 PM at Hall 101`

## Academic Calendar & Holidays
- Fall 2025 classes stop on Dec 10, 2025, before finals.
- Spring 2026 classes stop on May 1, 2026.
- Holiday EXDATEs are added at the event start time for:
  - Labor Day: 2025-09-01 (if the class meets Monday)
  - Thanksgiving Recess: 2025-11-27 – 2025-11-30 (Thu/Fri classes receive EXDATEs)
- Timezone handling uses America/Chicago with DST transitions embedded in ICS.

## Files Overview
- `manifest.json` – Chrome extension manifest
- `popup.html`, `popup.css`, `popup.js` – Popup UI, UX, and orchestration
- `content.js` – Message listener and bridge for extraction
- `courseDataExtractor.js` – Robust JSON-based extraction logic
- `background.js` – Academic calendar data provider
- `ics.js` – ICS creation with timezone and recurrence support

## Permissions
- `activeTab` – to read the current tab for extraction
- `scripting` – to run the content script in the active tab
- Host permissions: `https://mumaaenroll.services.wisc.edu/*` for schedule extraction

## Troubleshooting
- “Receiving end does not exist”: ensure you are on the Course Schedule page and that the tab is active, then click Download again.
- No courses found: confirm you’re signed in and the schedule page is loaded; select the correct term in the popup and retry.
- Recurrences look wrong or never end: ensure you selected the correct term; Fall ends Dec 10, Spring ends May 1.
- Holiday not skipped: verify “Exclude university holidays” is checked before export.

## Privacy
- The extension processes your schedule locally in your browser.
- No personal data is transmitted to external servers.
- Generated ICS files are downloaded locally.

## Development Notes
- The generator uses one weekly RRULE per weekday with a UTC UNTIL at semester end (end-of-day), and per-event EXDATEs for holidays.
- Final exam dates are added as single VEVENTs.

## License
MIT