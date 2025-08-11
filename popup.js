// Initialize variables to store the course data and calendar
let extractedCourses = [];
let academicCalendar = null;
let cal = null;
let selectedCalendarType = "apple"; // Default to Apple Calendar

// DOM elements
const extractBtn = document.getElementById('extract-btn');
const exportBtn = document.getElementById('export-btn');
const resetBtn = document.getElementById('reset-btn');
const statusEl = document.getElementById('status');
const initialView = document.getElementById('initial-view');
const resultsView = document.getElementById('results-view');
const coursesListEl = document.getElementById('courses-list');
const addAlertsCheckbox = document.getElementById('add-alerts');
const respectHolidaysCheckbox = document.getElementById('respect-holidays');
const fallbackDownloadSection = document.getElementById('fallback-download');
const fallbackDownloadBtn = document.getElementById('fallback-download-btn');

// Calendar option elements
const appleCalendarOption = document.getElementById('apple-calendar');
const googleCalendarOption = document.getElementById('google-calendar');
const outlookCalendarOption = document.getElementById('outlook-calendar');

// Store calendar data for fallback
let generatedCalendarData = null;

// Event listeners
document.addEventListener('DOMContentLoaded', init);
extractBtn.addEventListener('click', extractSchedule);
exportBtn.addEventListener('click', exportCalendar);
resetBtn.addEventListener('click', resetApp);
fallbackDownloadBtn.addEventListener('click', manualDownload);

// Calendar option selection listeners
appleCalendarOption.addEventListener('click', () => selectCalendarType('apple'));
googleCalendarOption.addEventListener('click', () => selectCalendarType('google'));
outlookCalendarOption.addEventListener('click', () => selectCalendarType('outlook'));

// Initialize the application
async function init() {
  try {
    // Set default calendar selection
    selectCalendarType('apple');
    
    // Fetch academic calendar data from background script
    const response = await sendMessageToBackground({action: "getAcademicCalendar"});
    
    if (response.success) {
      academicCalendar = response.data;
      console.log("Academic calendar loaded:", academicCalendar);
    } else {
      showError("Failed to load academic calendar: " + response.error);
    }
  } catch (error) {
    console.error("Error initializing app:", error);
    showError("Error initializing extension: " + error.message);
  }
}

// Function to handle calendar type selection
function selectCalendarType(type) {
  // Remove selected class from all options
  appleCalendarOption.classList.remove('selected');
  googleCalendarOption.classList.remove('selected');
  outlookCalendarOption.classList.remove('selected');
  
  // Add selected class to the chosen option
  selectedCalendarType = type;
  
  switch(type) {
    case 'apple':
      appleCalendarOption.classList.add('selected');
      break;
    case 'google':
      googleCalendarOption.classList.add('selected');
      break;
    case 'outlook':
      outlookCalendarOption.classList.add('selected');
      break;
  }
  
  // Update the instructions
  updateInstructionsPanel(type);
  
  console.log(`Selected calendar type: ${type}`);
}

// Function to update the instructions panel based on selected calendar type
function updateInstructionsPanel(type) {
  // Get all instruction panels
  const appleInstructions = document.getElementById('apple-instructions');
  const googleInstructions = document.getElementById('google-instructions');
  const outlookInstructions = document.getElementById('outlook-instructions');
  
  // Hide all panels first
  appleInstructions.classList.add('hidden');
  googleInstructions.classList.add('hidden');
  outlookInstructions.classList.add('hidden');
  
  // Show the selected panel
  switch(type) {
    case 'apple':
      appleInstructions.classList.remove('hidden');
      break;
    case 'google':
      googleInstructions.classList.remove('hidden');
      break;
    case 'outlook':
      outlookInstructions.classList.remove('hidden');
      break;
  }
}

// Export calendar based on selected type
function exportCalendar() {
  try {
    console.log(`Exporting to ${selectedCalendarType} calendar...`);
    statusEl.textContent = `Preparing export for ${getCalendarTypeName(selectedCalendarType)}...`;
    
    // Hide fallback section if it was previously shown
    fallbackDownloadSection.classList.add('hidden');
    
    // Generate the calendar data if needed
    if (!generatedCalendarData) {
      generateCalendarData();
    }
    
    // Export based on selected calendar type
    switch(selectedCalendarType) {
      case 'apple':
        exportToAppleCalendar();
        break;
      case 'google':
        exportToGoogleCalendar();
        break;
      case 'outlook':
        exportToOutlookCalendar();
        break;
    }
  } catch (error) {
    console.error(`Error exporting to ${selectedCalendarType} calendar:`, error);
    showError(`Error exporting to ${getCalendarTypeName(selectedCalendarType)}: ${error.message}`);
  }
}

// Helper to get calendar type display name
function getCalendarTypeName(type) {
  switch(type) {
    case 'apple': return 'Apple Calendar';
    case 'google': return 'Google Calendar';
    case 'outlook': return 'Outlook';
    default: return 'Calendar';
  }
}

// Generate the calendar data
function generateCalendarData() {
  console.log("Generating calendar data...");
  
  // Check if we have extracted courses
  if (!extractedCourses || extractedCourses.length === 0) {
    throw new Error("No courses extracted yet. Please extract your schedule first.");
  }
  
  // Create a new calendar instance
  cal = new ics();
  console.log("Calendar object created");
  
  // Get academic calendar data
  const academicCalendar = getAcademicCalendar();
  
  // Get user options
  const respectHolidays = respectHolidaysCheckbox.checked;
  const addAlerts = addAlertsCheckbox.checked;
  const selectedTerm = document.getElementById('term-select').value;
  const selectedTermLabel = document.getElementById('selected-term-label');
  if (selectedTermLabel) {
    const labelMap = { fall2025: 'Fall 2025', spring2026: 'Spring 2026', summer2025: 'Summer 2025', summer2026: 'Summer 2026' };
    selectedTermLabel.textContent = labelMap[selectedTerm] || selectedTerm;
  }
  
  console.log(`Selected term: ${selectedTerm}`);
  
  // Process each course
  extractedCourses.forEach(course => {
    
    
    // Process the main section if available
    if (course.schedule && course.dates) {
      processSection(course, course.schedule, course.location, course.dates, addAlerts, respectHolidays, academicCalendar);
    } else {
      console.warn(`Course ${course.name} has incomplete schedule data`);
    }
    
    // Process any additional sections (discussion, lab, etc.)
    if (course.additionalSections && course.additionalSections.length > 0) {
      course.additionalSections.forEach(section => {
        if (section.schedule) {
  
          
          // Create a location string that includes section type for better labeling
          const sectionLocation = section.location ? 
            `${section.type} ${section.number} - ${section.location}` : 
            `${section.type} ${section.number}`;
            
          processSection(course, section.schedule, sectionLocation, section.dates || course.dates, addAlerts, respectHolidays, academicCalendar);
        }
      });
    }
    
    // Add final exam if available
    if (course.finalExam) {
      processFinalExam(course, academicCalendar, addAlerts);
    }
  });
  
  // Check if any events were added to the calendar
  const eventCount = cal.events().length;
  // Count events by title for detailed breakdown
  const eventsByTitle = {};
  cal.events().forEach(event => {
    const title = event.title;
    if (!eventsByTitle[title]) {
      eventsByTitle[title] = 0;
    }
    eventsByTitle[title]++;
  });
  
  if (eventCount === 0) {
    throw new Error("No valid events could be generated from your schedule.");
  }
  
  // Store the calendar data for reuse
  generatedCalendarData = cal.calendar();
  
  return generatedCalendarData;
}

// Export to Apple Calendar (download ICS file)
function exportToAppleCalendar() {
  
  
  try {
    // Show fallback download option
    fallbackDownloadSection.classList.remove('hidden');
    
    // Try to download the calendar file
    const calendarData = cal.download('UW_Madison_Courses');
    
    showSuccess(`
      Apple Calendar file generated! 
      
      If the calendar doesn't open automatically:
      1. Locate the downloaded UW_Madison_Courses.ics file
      2. Double-click to open it with Apple Calendar
      3. Choose which calendar to add these events to
      
      If the download didn't start, use the Manual Download button below.
    `);
  } catch (dlError) {
    console.error("Error during download, trying fallback method:", dlError);
    
    // Fallback method for downloading
    manualDownload();
  }
}

// Export to Google Calendar (generate URL)
function exportToGoogleCalendar() {

  
  try {
    // Create a temporary download for the ICS file
    const blob = new Blob([generatedCalendarData], { type: 'text/calendar;charset=utf-8' });
    const fileUrl = URL.createObjectURL(blob);
    
    // Create a temporary link element to trigger download
    const tempLink = document.createElement('a');
    tempLink.href = fileUrl;
    tempLink.download = 'UW_Madison_Courses.ics';
    tempLink.style.display = 'none';
    document.body.appendChild(tempLink);
    
    // First download the file locally
    tempLink.click();
    
    // Then open Google Calendar import page in a new tab
    setTimeout(() => {
      const googleCalendarImportUrl = 'https://calendar.google.com/calendar/r/settings/export';
      window.open(googleCalendarImportUrl, '_blank');
      
      // Show instructions
      showSuccess(`
        Schedule exported! To import to Google Calendar:
        
        1. Save the downloaded ICS file
        2. In the Google Calendar tab that opened:
           - Click the settings gear icon in the top right
           - Select "Settings"
           - Select "Import & Export" from the left menu
        3. Click "Select file from your computer"
        4. Choose the UW_Madison_Courses.ics file you just downloaded
        5. Select the destination calendar
        6. Click "Import"
      `);
      
      // Clean up
      document.body.removeChild(tempLink);
      URL.revokeObjectURL(fileUrl);
    }, 500);
  } catch (error) {
    console.error("Error exporting to Google Calendar:", error);
    showError("Error exporting to Google Calendar: " + error.message);
  }
}

// Export to Outlook Calendar (generate URL or download)
function exportToOutlookCalendar() {

  
  try {
    // Create a temporary download for the ICS file
    const blob = new Blob([generatedCalendarData], { type: 'text/calendar;charset=utf-8' });
    const fileUrl = URL.createObjectURL(blob);
    
    // Create a temporary link element to trigger download
    const tempLink = document.createElement('a');
    tempLink.href = fileUrl;
    tempLink.download = 'UW_Madison_Courses.ics';
    tempLink.style.display = 'none';
    document.body.appendChild(tempLink);
    
    // First download the file locally
    tempLink.click();
    
    // Then open Outlook Calendar in a new tab
    setTimeout(() => {
      // For web version of Outlook
      const outlookCalendarUrl = 'https://outlook.live.com/calendar/0/view/month';
      window.open(outlookCalendarUrl, '_blank');
      
      // Show instructions
      showSuccess(`
        Schedule exported! To import to Outlook Calendar:
        
        1. Save the downloaded UW_Madison_Courses.ics file
        2. In the Outlook Calendar tab that opened:
           - Click "Add calendar" at the top of the page
           - Select "Upload from file"
        3. Browse to the downloaded ICS file and select it
        4. Click "Open"
        5. Follow the remaining prompts to complete the import
        
        For Outlook Desktop App:
        1. In Outlook, go to File > Open & Export > Import/Export
        2. Select "Import an iCalendar (.ics) or vCalendar file"
        3. Browse to the downloaded ICS file and click "Import"
      `);
      
      // Clean up
      document.body.removeChild(tempLink);
      URL.revokeObjectURL(fileUrl);
    }, 500);
  } catch (error) {
    console.error("Error exporting to Outlook Calendar:", error);
    showError("Error exporting to Outlook Calendar: " + error.message);
  }
}

// Function to handle manual download (Apple Calendar fallback)
function manualDownload() {
  try {

    
    if (!generatedCalendarData) {
      // Generate the data if it doesn't exist
      if (cal && typeof cal.calendar === 'function') {
        generatedCalendarData = cal.calendar();
      }
      
      if (!generatedCalendarData) {
        throw new Error("No calendar data available");
      }
    }
    
    // Create blob and download link
    const blob = new Blob([generatedCalendarData], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'UW_Madison_Courses.ics';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(function() {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(a.href);
    }, 100);
    
    showSuccess("Manual download initiated!");
  } catch (error) {
    console.error("Error with manual download:", error);
    showError("Error with manual download: " + error.message);
  }
}

// Update the success message display to handle multi-line messages
function showSuccess(message) {
  statusEl.innerHTML = message.replace(/\n/g, '<br>');
  statusEl.className = "status success";
}

// Extract course schedule from the current page
async function extractSchedule() {
  statusEl.textContent = "Extracting schedule...";
  statusEl.className = "status";
  extractBtn.disabled = true;
  
  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    
    // Check if we're on the right page
    if (!tab.url.includes("mumaaenroll.services.wisc.edu")) {
      throw new Error("Please navigate to the UW-Madison enrollment page first.");
    }
    
    // Content scripts are already loaded via manifest.json

    
    // Send message to content script with error handling
    try {
      const selectedTerm = document.getElementById('term-select').value;
      console.log(`Sending selected term to content script: ${selectedTerm}`);
      
      const response = await sendMessageToTab(tab.id, {
        action: "extractSchedule",
        selectedTerm: selectedTerm
      });
      
      if (response.success) {
        extractedCourses = response.data;
        showSuccess(`Successfully extracted ${extractedCourses.length} courses.`);
        
        // Display the courses
        displayCourses(extractedCourses);
        
        // Update selected term heading label
        const selectedTermLabel = document.getElementById('selected-term-label');
        if (selectedTermLabel) {
          const labelMap = { fall2025: 'Fall 2025', spring2026: 'Spring 2026', summer2025: 'Summer 2025', summer2026: 'Summer 2026' };
          selectedTermLabel.textContent = labelMap[selectedTerm] || selectedTerm;
        }
        
        // Show results view
        initialView.classList.add('hidden');
        resultsView.classList.remove('hidden');
      } else {
        showError("Failed to extract schedule: " + response.error);
        extractBtn.disabled = false;
      }
    } catch (error) {
      if (error.message.includes("receiving end does not exist")) {
        showError("Cannot connect to the page. Please ensure you're on the UW-Madison course schedule page and reload the extension.");
      } else {
        showError("Error: " + error.message);
      }
      extractBtn.disabled = false;
    }
  } catch (error) {
    console.error("Error extracting schedule:", error);
    showError("Error: " + error.message);
    extractBtn.disabled = false;
  }
}

// Display the extracted courses in the UI
function displayCourses(courses) {
  coursesListEl.innerHTML = '';

  courses.forEach((course, idx) => {
    const courseEl = document.createElement('div');
    courseEl.className = 'course-item';

    // Course name (editable)
    const nameEl = document.createElement('div');
    nameEl.className = 'course-name course-field';
    nameEl.contentEditable = 'true';
    nameEl.textContent = course.name;
    nameEl.addEventListener('input', () => {
      extractedCourses[idx].name = nameEl.textContent.trim();
    });

    // Details wrapper
    const detailsEl = document.createElement('div');
    detailsEl.className = 'course-details';

    // Section (editable)
    const sectionEl = document.createElement('div');
    sectionEl.className = 'course-field';
    sectionEl.contentEditable = 'true';
    sectionEl.textContent = course.section ? `Section: ${course.section}` : 'Section: ';
    sectionEl.addEventListener('input', () => {
      const v = sectionEl.textContent.replace(/^Section:\s*/i, '').trim();
      extractedCourses[idx].section = v;
    });

    // Instructor (editable)
    const instructorEl = document.createElement('div');
    instructorEl.className = 'course-field';
    instructorEl.contentEditable = 'true';
    instructorEl.textContent = course.instructor ? `Instructor: ${course.instructor}` : 'Instructor: ';
    instructorEl.addEventListener('input', () => {
      const v = instructorEl.textContent.replace(/^Instructor:\s*/i, '').trim();
      extractedCourses[idx].instructor = v;
    });

    // Schedule (editable: days, start, end)
    const scheduleEl = document.createElement('div');
    scheduleEl.className = 'course-field';
    scheduleEl.contentEditable = 'true';
    const daysText = (course.schedule?.days || []).map(d => (
      d === 'MO' ? 'Mon' : d === 'TU' ? 'Tue' : d === 'WE' ? 'Wed' : d === 'TH' ? 'Thu' : d === 'FR' ? 'Fri' : d === 'SA' ? 'Sat' : d === 'SU' ? 'Sun' : d
    )).join(', ');
    scheduleEl.textContent = course.schedule ? `Schedule: ${daysText} ${course.schedule.startTime} - ${course.schedule.endTime}` : 'Schedule: ';
    scheduleEl.addEventListener('input', () => {
      const raw = scheduleEl.textContent.replace(/^Schedule:\s*/i, '').trim();
      // Expect format: "Mon, Wed 11:00 AM - 12:15 PM"
      // Split days and times
      const match = raw.match(/^(.*)\s+(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)$/i);
      if (match) {
        const daysPart = match[1].trim();
        const startTime = match[2].toUpperCase();
        const endTime = match[3].toUpperCase();
        const dayMap = { Mon: 'MO', Tue: 'TU', Wed: 'WE', Thu: 'TH', Fri: 'FR', Sat: 'SA', Sun: 'SU' };
        const days = daysPart.split(',').map(s => dayMap[s.trim()] || s.trim()).filter(Boolean);
        if (!extractedCourses[idx].schedule) extractedCourses[idx].schedule = {};
        extractedCourses[idx].schedule.days = days;
        extractedCourses[idx].schedule.startTime = startTime;
        extractedCourses[idx].schedule.endTime = endTime;
      }
    });

    // Location (editable)
    const locationEl = document.createElement('div');
    locationEl.className = 'course-field';
    locationEl.contentEditable = 'true';
    locationEl.textContent = course.location ? `Location: ${course.location}` : 'Location: ';
    locationEl.addEventListener('input', () => {
      const v = locationEl.textContent.replace(/^Location:\s*/i, '').trim();
      extractedCourses[idx].location = v;
    });

    // Dates (editable: start - end)
    const datesEl = document.createElement('div');
    datesEl.className = 'course-field';
    datesEl.contentEditable = 'true';
    datesEl.textContent = course.dates ? `Dates: ${course.dates.startDate} - ${course.dates.endDate}` : 'Dates: ';
    datesEl.addEventListener('input', () => {
      const raw = datesEl.textContent.replace(/^Dates:\s*/i, '').trim();
      const m = raw.match(/^(.*)\s*-\s*(.*)$/);
      if (m) {
        const start = m[1].trim();
        const end = m[2].trim();
        if (!extractedCourses[idx].dates) extractedCourses[idx].dates = {};
        extractedCourses[idx].dates.startDate = start;
        extractedCourses[idx].dates.endDate = end;
      }
    });

    // Additional sections - render simple editable lines
    const additionalEl = document.createElement('div');
    additionalEl.className = 'course-field';
    additionalEl.contentEditable = 'true';
    let additionalText = '';
    if (course.additionalSections && course.additionalSections.length > 0) {
      additionalText += 'Additional Sections:\n';
      course.additionalSections.forEach((section, sidx) => {
        const sDays = (section.schedule?.days || []).map(d => (
          d === 'MO' ? 'Mon' : d === 'TU' ? 'Tue' : d === 'WE' ? 'Wed' : d === 'TH' ? 'Thu' : d === 'FR' ? 'Fri' : d === 'SA' ? 'Sat' : d === 'SU' ? 'Sun' : d
        )).join(', ');
        const sTime = section.schedule ? `${section.schedule.startTime} - ${section.schedule.endTime}` : '';
        const sLoc = section.location ? ` at ${section.location}` : '';
        additionalText += `${section.type} ${section.number}: ${sDays} ${sTime}${sLoc}\n`;
      });
    }
    if (additionalText) additionalEl.textContent = additionalText.trim();
    additionalEl.addEventListener('input', () => {
      // Very light parser: each line like "DIS 301: Wed 2:25 PM - 3:15 PM at Location"
      const lines = additionalEl.textContent.split(/\n+/).filter(Boolean);
      const out = [];
      lines.forEach(line => {
        const m = line.match(/^(\w+)\s+(\d+):\s*(.*)$/);
        if (!m) return;
        const type = m[1];
        const number = m[2];
        const rest = m[3];
        const m2 = rest.match(/^(.*)\s+(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)(?:\s+at\s+(.*))?$/i);
        const dayMap = { Mon: 'MO', Tue: 'TU', Wed: 'WE', Thu: 'TH', Fri: 'FR', Sat: 'SA', Sun: 'SU' };
        let days = [] , startTime = '', endTime = '', location = '';
        if (m2) {
          days = m2[1].split(',').map(s => dayMap[s.trim()] || s.trim()).filter(Boolean);
          startTime = m2[2].toUpperCase();
          endTime = m2[3].toUpperCase();
          location = (m2[4] || '').trim();
        }
        out.push({ type, number, schedule: days.length ? { days, startTime, endTime } : null, location });
      });
      extractedCourses[idx].additionalSections = out;
    });

    // Final exam (editable)
    const finalEl = document.createElement('div');
    finalEl.className = 'course-field';
    finalEl.contentEditable = 'true';
    const finalText = course.finalExam ? `Final Exam: ${course.finalExam.date} ${course.finalExam.time}${course.finalExam.location ? ` at ${course.finalExam.location}` : ''}` : 'Final Exam: ';
    finalEl.textContent = finalText;
    finalEl.addEventListener('input', () => {
      const raw = finalEl.textContent.replace(/^Final Exam:\s*/i, '').trim();
      // Expect like: "Dec 15 2:45 PM - 4:45 PM at Hall 101" OR just date/time
      const m = raw.match(/^(\w+\s+\d{1,2})(?:,?\s*(\d{4}))?\s+(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)(?:\s+at\s+(.*))?$/i);
      if (!extractedCourses[idx].finalExam) extractedCourses[idx].finalExam = {};
      if (m) {
        extractedCourses[idx].finalExam.date = m[1] + (m[2] ? `, ${m[2]}` : '');
        extractedCourses[idx].finalExam.time = `${m[3].toUpperCase()} - ${m[4].toUpperCase()}`;
        extractedCourses[idx].finalExam.location = (m[5] || '').trim();
      } else {
        extractedCourses[idx].finalExam.date = raw;
      }
    });

    // Append fields
    detailsEl.appendChild(sectionEl);
    detailsEl.appendChild(instructorEl);
    detailsEl.appendChild(scheduleEl);
    detailsEl.appendChild(locationEl);
    detailsEl.appendChild(datesEl);
    if (additionalText) detailsEl.appendChild(additionalEl);
    if (course.finalExam) detailsEl.appendChild(finalEl);

    // Visual affordance: set whole item editable on click (with dashed outline)
    courseEl.addEventListener('click', () => {
      courseEl.setAttribute('contenteditable', 'true');
      setTimeout(() => courseEl.focus(), 0);
    });

    courseEl.appendChild(nameEl);
    courseEl.appendChild(detailsEl);
    coursesListEl.appendChild(courseEl);
  });
}

// Helper to compute exclude dates (EXDATE) at event start time for matching holidays
function computeExcludeDates(academicCalendar, dayNumber, startHour, startMinute) {
  const excludeDates = [];
  if (!academicCalendar || !academicCalendar.holidays) return excludeDates;

  academicCalendar.holidays.forEach(holiday => {
    if (holiday.date) {
      const d = new Date(holiday.date);
      if (d.getDay() === dayNumber) {
        d.setHours(startHour, startMinute, 0, 0);
        excludeDates.push(new Date(d));
      }
    } else if (holiday.startDate && holiday.endDate) {
      const start = new Date(holiday.startDate);
      const end = new Date(holiday.endDate);
      const cursor = new Date(start);
      while (cursor <= end) {
        if (cursor.getDay() === dayNumber) {
          const ex = new Date(cursor);
          ex.setHours(startHour, startMinute, 0, 0);
          excludeDates.push(ex);
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  });

  return excludeDates;
}

// Process a course section and add it to the calendar
function processSection(course, schedule, location, dates, addAlerts, respectHolidays, academicCalendar) {
  try {
    if (!schedule || !schedule.days || !schedule.startTime || !schedule.endTime || !dates) {
      console.warn(`Skipping section of ${course.name} due to incomplete data`);
      return;
    }

    // Parse dates
    const courseStartDate = parseDateString(dates.startDate);
    const courseEndDate = parseDateString(dates.endDate);

    // Parse times
    const timeRegex = /(\d+):(\d+)\s+(AM|PM)/i;
    const startTimeParts = schedule.startTime.match(timeRegex);
    const endTimeParts = schedule.endTime.match(timeRegex);
    if (!startTimeParts || !endTimeParts) return;

    let startHour = parseInt(startTimeParts[1], 10);
    const startMinute = parseInt(startTimeParts[2], 10);
    const startMeridiem = startTimeParts[3].toUpperCase();

    let endHour = parseInt(endTimeParts[1], 10);
    const endMinute = parseInt(endTimeParts[2], 10);
    const endMeridiem = endTimeParts[3].toUpperCase();

    if (startMeridiem === 'PM' && startHour < 12) startHour += 12;
    if (startMeridiem === 'AM' && startHour === 12) startHour = 0;
    if (endMeridiem === 'PM' && endHour < 12) endHour += 12;
    if (endMeridiem === 'AM' && endHour === 12) endHour = 0;

    // Determine section type label
    let sectionType = 'LEC';
    if (course.additionalSections) {
      for (const section of course.additionalSections) {
        if (section.schedule === schedule) {
          sectionType = section.type || 'DIS';
          break;
        }
      }
    } else if (course.section) {
      if (course.section.includes('DIS')) sectionType = 'DIS';
      else if (course.section.includes('LAB')) sectionType = 'LAB';
      else if (course.section.includes('SEM')) sectionType = 'SEM';
    }

    const eventTitle = `${sectionType}: ${course.name}`;

    // For each weekday in this section, add one recurring event with EXDATEs (if enabled)
    schedule.days.forEach(dayOfWeek => {
      const dayNumber = getDayNumber(dayOfWeek);

      const excludeDates = respectHolidays
        ? computeExcludeDates(academicCalendar, dayNumber, startHour, startMinute)
        : [];

      addRecurringEvent(
        cal, eventTitle, course.instructor, location || 'No location specified',
        courseStartDate, courseEndDate, dayNumber, dayOfWeek,
        startHour, startMinute, endHour, endMinute, addAlerts, excludeDates
      );
    });
  } catch (error) {
    console.error(`Error processing section for course ${course.name}:`, error);
  }
}

// Helper function to add a recurring event
function addRecurringEvent(
  cal, title, instructor, location,
  rangeStart, rangeEnd, dayNumber, dayOfWeek,
  startHour, startMinute, endHour, endMinute, addAlerts, excludeDates
) {
  try {
    const firstDate = findFirstDayOccurrence(rangeStart, dayNumber);
    if (firstDate > rangeEnd) {
      return;
    }

    const eventStart = new Date(firstDate);
    eventStart.setHours(startHour, startMinute, 0);

    const eventEnd = new Date(firstDate);
    eventEnd.setHours(endHour, endMinute, 0);

    const eventOptions = {
      recurrenceRule: {
        freq: 'WEEKLY',
        until: rangeEnd,
        byday: [dayOfWeek]
      },
      excludeDates: excludeDates && excludeDates.length ? excludeDates : null,
      alarms: addAlerts ? [{ action: 'display', trigger: { minutes: 15, before: true } }] : null
    };

    cal.addEvent(
      title,
      instructor ? `Instructor: ${instructor}` : '',
      location,
      eventStart,
      eventEnd,
      eventOptions
    );
  } catch (error) {
    console.error('Error adding recurring event:', error);
  }
}

// Reset the application state
function resetApp() {
  extractedCourses = [];
  initialView.classList.remove('hidden');
  resultsView.classList.add('hidden');
  statusEl.textContent = '';
  statusEl.className = 'status';
  extractBtn.disabled = false;
}

// Helper function to get month number from name
function getMonthNumber(monthName) {
  const months = {
    'jan': 0, 'january': 0,
    'feb': 1, 'february': 1,
    'mar': 2, 'march': 2,
    'apr': 3, 'april': 3,
    'may': 4,
    'jun': 5, 'june': 5,
    'jul': 6, 'july': 6,
    'aug': 7, 'august': 7,
    'sep': 8, 'september': 8,
    'oct': 9, 'october': 9,
    'nov': 10, 'november': 10,
    'dec': 11, 'december': 11
  };
  
  return months[monthName.toLowerCase()] || 0;
}

// Helper function to get day number from ICAL day code
function getDayNumber(icalDay) {
  switch(icalDay) {
    case 'MO': return 1;
    case 'TU': return 2;
    case 'WE': return 3;
    case 'TH': return 4;
    case 'FR': return 5;
    case 'SA': return 6;
    case 'SU': return 0;
    default: return 1;
  }
}

// Find the first occurrence of a day of the week on or after a given date
function findFirstDayOccurrence(startDate, dayNumber) {
  
  
  const result = new Date(startDate);
  
  // If the start date is already the right day, use it
  if (result.getDay() === dayNumber) {

    return result;
  }
  
  // Otherwise search forward until we find the day
  let daysChecked = 0;
  while (result.getDay() !== dayNumber && daysChecked < 7) {
    result.setDate(result.getDate() + 1);
    daysChecked++;
  }
  
  
  return result;
}

// Helper to get day name from number
function getDayName(dayNumber) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber] || 'Unknown';
}

// Show an error message
function showError(message) {
  statusEl.textContent = message;
  statusEl.className = "status error";
}

// Helper function to send a message to the background script
function sendMessageToBackground(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

// Helper function to send a message to a tab
function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, response => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

// Helper function to parse exam date
function parseExamDate(dateStr) {
  try {
    // Handle various date formats
    // Example: "Dec 15, 2023" or "12/15/2023"
    
    // Check if date is in MM/DD/YYYY format
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      const month = parseInt(parts[0]) - 1;
      const day = parseInt(parts[1]);
      const year = parts[2] ? parseInt(parts[2]) : new Date().getFullYear();
      return new Date(year, month, day);
    } 
    // Otherwise assume it's in Month DD, YYYY format
    else {
      const dateParts = dateStr.split(/[,\s]+/);
      const month = getMonthNumber(dateParts[0]);
      const day = parseInt(dateParts[1]);
      const year = dateParts[2] ? parseInt(dateParts[2]) : new Date().getFullYear();
      return new Date(year, month, day);
    }
  } catch (error) {
    console.error("Error parsing exam date:", error);
    throw error;
  }
}

// Helper function to check if a date falls within a range
function isInDateRange(date, startDate, endDate) {
  if (!date || !startDate || !endDate) return false;
  return date >= startDate && date <= endDate;
}

function processFinalExam(course, academicCalendar, addAlerts) {
  try {
    // Skip if no final exam data
    if (!course.finalExam || !course.finalExam.date || !course.finalExam.time) {
      return;
    }
    
    // Parse the exam date
    const examDateParts = course.finalExam.date.trim().split(/[,\s]+/);
    const examMonth = getMonthNumber(examDateParts[0]);
    const examDay = parseInt(examDateParts[1]);
    
    // Find current or next year's exam based on month
    const now = new Date();
    const currentYear = now.getFullYear();
    const nextYear = currentYear + 1;
    
    // Use next year if the exam is in January-May and current month is after July
    const examYear = (examMonth <= 5 && now.getMonth() > 6) ? nextYear : currentYear;
    
    // Parse the exam time
    // Format: "10:05 AM - 12:05 PM"
    const examTimeParts = course.finalExam.time.split('-');
    if (examTimeParts.length < 2) {
      console.warn(`Invalid final exam time format for ${course.name}`);
      return;
    }
    
    // Parse start time
    const examStartMatch = examTimeParts[0].trim().match(/(\d+):(\d+)\s?(AM|PM)/i);
    if (!examStartMatch) {
      console.warn(`Could not parse final exam start time for ${course.name}`);
      return;
    }
    
    let examStartHour = parseInt(examStartMatch[1]);
    const examStartMinute = parseInt(examStartMatch[2]);
    const examStartMeridiem = examStartMatch[3].toUpperCase();
    
    // Convert to 24-hour format
    if (examStartMeridiem === 'PM' && examStartHour < 12) examStartHour += 12;
    if (examStartMeridiem === 'AM' && examStartHour === 12) examStartHour = 0;
    
    // Parse end time
    let examEndHour, examEndMinute;
    const examEndMatch = examTimeParts[1].trim().match(/(\d+):(\d+)\s?(AM|PM)/i);
    
    if (examEndMatch) {
      // End time is specified
      examEndHour = parseInt(examEndMatch[1]);
      examEndMinute = parseInt(examEndMatch[2]);
      const examEndMeridiem = examEndMatch[3].toUpperCase();
      
      // Convert to 24-hour format
      if (examEndMeridiem === 'PM' && examEndHour < 12) examEndHour += 12;
      if (examEndMeridiem === 'AM' && examEndHour === 12) examEndHour = 0;
    } else {
      // If no end time, assume 2 hours after start
      examEndHour = examStartHour + 2;
      examEndMinute = examStartMinute;
      
      // Handle overflow to next day
      if (examEndHour >= 24) {
        examEndHour -= 24;
      }
    }
    
    // Create the exam date
    const examDate = new Date(examYear, examMonth, examDay);
    
    // Create event objects with time in local time
    const examStart = new Date(examDate);
    examStart.setHours(examStartHour, examStartMinute, 0);
    
    const examEnd = new Date(examDate);
    examEnd.setHours(examEndHour, examEndMinute, 0);
    
    // Add the final exam to the calendar
    cal.addEvent(
      `FINAL EXAM: ${course.name}`,
      course.instructor ? `Instructor: ${course.instructor}` : '',
      course.finalExam.location || 'No location specified',
      examStart,
      examEnd,
      {
        alarms: addAlerts ? [{action: 'display', trigger: {minutes: 60, before: true}}] : null
      }
    );
  } catch (error) {
    console.error(`Error processing final exam for ${course.name}:`, error);
  }
}

// Helper function to get the academic calendar data
function getAcademicCalendar() {
  // If we already have the academic calendar from initialization, return that
  if (academicCalendar) {

    
    return academicCalendar;
  }
  
  console.log("Using default academic calendar data");
  
  // Create the default calendar with the provided dates
  const defaultCalendar = {
    semester: {
      fall: {
        start: "2025-09-03",
        end: "2025-12-10"
      },
      spring: {
        start: "2026-01-20",
        end: "2026-05-01"
      }
    },
    holidays: [
      {
        name: "Labor Day",
        date: "2025-09-01"
      },
      {
        name: "Thanksgiving Recess",
        startDate: "2025-11-27",
        endDate: "2025-11-30"
      },
      {
        name: "Spring Break",
        startDate: "2026-03-21",
        endDate: "2026-03-29"
      },
      {
        name: "Martin Luther King Jr. Day",
        date: "2026-01-19"
      }
    ],
    dstChanges: {
      fall: "2025-11-02",
      spring: "2026-03-09"
    }
  };
  

  
  return defaultCalendar;
} 

// Helper function to parse date strings like "Sep 3, 2025"
function parseDateString(dateStr) {
  try {
    // Handle format like "Sep 3, 2025"
    const match = dateStr.match(/(\w+)\s+(\d+),\s+(\d+)/);
    if (match) {
      const monthName = match[1];
      const day = parseInt(match[2]);
      const year = parseInt(match[3]);
      
      const monthMap = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      
      const month = monthMap[monthName];
      if (month !== undefined) {
        return new Date(year, month, day);
      }
    }
    
    // Fallback to standard Date parsing
    return new Date(dateStr);
  } catch (error) {
    console.error("Error parsing date string:", dateStr, error);
    return new Date(dateStr);
  }
} 