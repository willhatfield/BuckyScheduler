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
  console.log("Processing", extractedCourses.length, "courses...");
  console.log(`Respect holidays option: ${respectHolidays}`);
  
  // Process each course
  extractedCourses.forEach(course => {
    console.log(`Starting to process course: ${course.name}`);
    
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
          console.log(`Processing additional section: ${section.type} ${section.number} for ${course.name}`);
          
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
  console.log("TOTAL EVENTS added to calendar:", eventCount);
  console.log("Event breakdown by title:");
  
  // Count events by title for detailed breakdown
  const eventsByTitle = {};
  cal.events().forEach(event => {
    const title = event.title;
    if (!eventsByTitle[title]) {
      eventsByTitle[title] = 0;
    }
    eventsByTitle[title]++;
  });
  
  // Log breakdown
  Object.keys(eventsByTitle).forEach(title => {
    console.log(`  - ${title}: ${eventsByTitle[title]} events`);
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
  console.log("Exporting to Apple Calendar...");
  
  try {
    // Show fallback download option
    fallbackDownloadSection.classList.remove('hidden');
    
    // Try to download the calendar file
    console.log("Attempting to download ICS file...");
    const calendarData = cal.download('UW_Madison_Courses');
    console.log("Download function called, calendar data generated:", calendarData ? "yes" : "no");
    
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
  console.log("Exporting to Google Calendar...");
  
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
  console.log("Exporting to Outlook Calendar...");
  
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
    console.log("Manual download triggered");
    
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
    
    // First, inject the content script if it's not already there
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      console.log("Content script injected successfully");
    } catch (error) {
      console.warn("Content script may already be loaded:", error);
      // Continue anyway as the script might already be there
    }
    
    // Send message to content script with error handling
    try {
      const response = await sendMessageToTab(tab.id, {action: "extractSchedule"});
      
      if (response.success) {
        extractedCourses = response.data;
        showSuccess(`Successfully extracted ${extractedCourses.length} courses.`);
        
        // Display the courses
        displayCourses(extractedCourses);
        
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
  
  courses.forEach(course => {
    const courseEl = document.createElement('div');
    courseEl.className = 'course-item';
    
    const nameEl = document.createElement('div');
    nameEl.className = 'course-name';
    nameEl.textContent = course.name;
    
    const detailsEl = document.createElement('div');
    detailsEl.className = 'course-details';
    
    let detailsText = '';
    
    // Main section info
    if (course.section) {
      detailsText += `Section: ${course.section}<br>`;
    }
    
    if (course.instructor) {
      detailsText += `Instructor: ${course.instructor}<br>`;
    }
    
    if (course.schedule) {
      const days = course.schedule.days.map(day => {
        if (day === 'MO') return 'Mon';
        if (day === 'TU') return 'Tue';
        if (day === 'WE') return 'Wed';
        if (day === 'TH') return 'Thu';
        if (day === 'FR') return 'Fri';
        if (day === 'SA') return 'Sat';
        if (day === 'SU') return 'Sun';
        return day;
      }).join(', ');
      
      detailsText += `Schedule: ${days} ${course.schedule.startTime} - ${course.schedule.endTime}<br>`;
    }
    
    if (course.location) {
      detailsText += `Location: ${course.location}<br>`;
    }
    
    if (course.dates) {
      detailsText += `Dates: ${course.dates.startDate} - ${course.dates.endDate}<br>`;
    }
    
    // Additional sections
    if (course.additionalSections && course.additionalSections.length > 0) {
      detailsText += `<br><strong>Additional Sections:</strong><br>`;
      
      course.additionalSections.forEach(section => {
        detailsText += `${section.type} ${section.number}: `;
        
        if (section.schedule) {
          const days = section.schedule.days.map(day => {
            if (day === 'MO') return 'Mon';
            if (day === 'TU') return 'Tue';
            if (day === 'WE') return 'Wed';
            if (day === 'TH') return 'Thu';
            if (day === 'FR') return 'Fri';
            if (day === 'SA') return 'Sat';
            if (day === 'SU') return 'Sun';
            return day;
          }).join(', ');
          
          detailsText += `${days} ${section.schedule.startTime} - ${section.schedule.endTime}`;
        }
        
        if (section.location) {
          detailsText += ` at ${section.location}`;
        }
        
        detailsText += `<br>`;
      });
    }
    
    // Add final exam information if available
    if (course.finalExam) {
      detailsText += `<br><strong>Final Exam:</strong> ${course.finalExam.date} ${course.finalExam.time}`;
      if (course.finalExam.location && course.finalExam.location !== 'Location not specified') {
        detailsText += ` at ${course.finalExam.location}`;
      }
    }
    
    detailsEl.innerHTML = detailsText;
    
    courseEl.appendChild(nameEl);
    courseEl.appendChild(detailsEl);
    coursesListEl.appendChild(courseEl);
  });
}

// Process a course section and add it to the calendar
function processSection(course, schedule, location, dates, addAlerts, respectHolidays, academicCalendar) {
  try {
    // Skip if missing required data
    if (!schedule || !schedule.days || !schedule.startTime || !schedule.endTime || !dates) {
      console.warn(`Skipping section of ${course.name} due to incomplete data`);
      return;
    }
    
    // Parse the date strings to Date objects
    const courseStartDate = new Date(dates.startDate);
    const courseEndDate = new Date(dates.endDate);
    
    console.log(`Processing section for ${course.name} from ${courseStartDate.toDateString()} to ${courseEndDate.toDateString()}`);
    console.log(`This course meets on days: ${JSON.stringify(schedule.days)}`);
    
    // Parse the time strings
    // Match patterns like "9:30 AM" or "2:45 PM"
    const startTimeRegex = /(\d+):(\d+)\s+(AM|PM)/i;
    const endTimeRegex = /(\d+):(\d+)\s+(AM|PM)/i;
    
    const startTimeParts = schedule.startTime.match(startTimeRegex);
    const endTimeParts = schedule.endTime.match(endTimeRegex);
    
    if (!startTimeParts || !endTimeParts) {
      console.warn(`Skipping ${course.name} due to invalid time format`);
      return;
    }
    
    // Get hours and minutes
    let startHour = parseInt(startTimeParts[1]);
    const startMinute = parseInt(startTimeParts[2]);
    const startMeridiem = startTimeParts[3].toUpperCase();
    
    let endHour = parseInt(endTimeParts[1]);
    const endMinute = parseInt(endTimeParts[2]);
    const endMeridiem = endTimeParts[3].toUpperCase();
    
    // Convert to 24-hour format
    if (startMeridiem === 'PM' && startHour < 12) startHour += 12;
    if (startMeridiem === 'AM' && startHour === 12) startHour = 0;
    
    if (endMeridiem === 'PM' && endHour < 12) endHour += 12;
    if (endMeridiem === 'AM' && endHour === 12) endHour = 0;
    
    // Determine section type label
    let sectionType = "LEC";
    
    // Check if this is being called for a specific additional section
    if (course.additionalSections) {
      for (const section of course.additionalSections) {
        // Compare schedule objects
        if (section.schedule === schedule) {
          // Use the section type from the additional section
          sectionType = section.type || "DIS";
          break;
        }
      }
    } else if (course.section) {
      // Check main section type
      if (course.section.includes("DIS")) {
        sectionType = "DIS";
      } else if (course.section.includes("LAB")) {
        sectionType = "LAB";
      } else if (course.section.includes("SEM")) {
        sectionType = "SEM";
      }
    } 
    
    // If a section type was passed directly
    if (location && location.includes(" - ")) {
      const locationParts = location.split(" - ");
      if (locationParts[0].includes("DIS")) {
        sectionType = "DIS";
      } else if (locationParts[0].includes("LAB")) {
        sectionType = "LAB";
      } else if (locationParts[0].includes("SEM")) {
        sectionType = "SEM";
      }
    }
    
    console.log(`Section type determined as: ${sectionType} for ${course.name}`);
    
    // Create the formatted event title with section type
    const eventTitle = `${sectionType}: ${course.name}`;
    
    // Count events created for debugging
    let eventsCreatedForCourse = 0;
    
    // For each day of the week this class occurs
    schedule.days.forEach(dayOfWeek => {
      console.log(`Processing day ${dayOfWeek} for ${course.name}`);
      
      // Get the numeric day of week (0 = Sunday, 1 = Monday, etc.)
      const dayNumber = getDayNumber(dayOfWeek);
      
      // If we're not respecting holidays, create a single recurring event
      if (!respectHolidays || !academicCalendar || !academicCalendar.holidays) {
        console.log(`Not respecting holidays for ${course.name} on ${dayOfWeek}`);
        
        addRecurringEvent(
          cal, eventTitle, course.instructor, location || 'No location specified',
          courseStartDate, courseEndDate, dayNumber, dayOfWeek,
          startHour, startMinute, endHour, endMinute, addAlerts
        );
        
        eventsCreatedForCourse++;
      }
      
      // Sort holidays by start date
      const sortedHolidays = [...academicCalendar.holidays]
        .filter(holiday => {
          // Convert dates for comparison
          const holidayStartDate = holiday.date ? new Date(holiday.date) : new Date(holiday.startDate);
          const holidayEndDate = holiday.date ? new Date(holiday.date) : new Date(holiday.endDate);
          
          // Debug logs
          console.log(`Checking if holiday affects course: ${holiday.name}`);
          console.log(`  Holiday: ${holidayStartDate.toDateString()} - ${holidayEndDate.toDateString()}`);
          console.log(`  Course: ${courseStartDate.toDateString()} - ${courseEndDate.toDateString()}`);
          
          // Only include holidays that might affect this course
          const affects = (
            holidayEndDate >= courseStartDate && holidayStartDate <= courseEndDate
          );
          console.log(`  Affects course: ${affects}`);
          return affects;
        })
        .map(holiday => {
          if (holiday.date) {
            return {
              name: holiday.name,
              start: new Date(holiday.date),
              end: new Date(holiday.date)
            };
          } else {
            return {
              name: holiday.name,
              start: new Date(holiday.startDate),
              end: new Date(holiday.endDate)
            };
          }
        })
        .sort((a, b) => a.start.getTime() - b.start.getTime());
        
      console.log(`Found ${sortedHolidays.length} potential holidays for ${course.name} on ${dayOfWeek}:`);
      sortedHolidays.forEach(h => console.log(`  - ${h.name}: ${h.start.toDateString()} to ${h.end.toDateString()}`));
      
      // Identify break points for this day of the week
      const breakPoints = [];
      
      for (const holiday of sortedHolidays) {
        // For single-day holidays, only break if they fall on this day of week
        if (holiday.start.getTime() === holiday.end.getTime()) {
          if (holiday.start.getDay() === dayNumber) {
            breakPoints.push({
              name: holiday.name,
              lastDayBefore: new Date(holiday.start.getTime() - 86400000), // Day before holiday
              firstDayAfter: new Date(holiday.end.getTime() + 86400000) // Day after holiday
            });
          }
          continue;
        }
        
        // For multi-day holidays, check if they include this day of week
        let affectsThisDay = false;
        const tempDate = new Date(holiday.start);
        
        // Check each day in the holiday period
        while (tempDate <= holiday.end) {
          if (tempDate.getDay() === dayNumber) {
            affectsThisDay = true;
            break;
          }
          tempDate.setDate(tempDate.getDate() + 1);
        }
        
        if (affectsThisDay) {
          breakPoints.push({
            name: holiday.name,
            lastDayBefore: new Date(holiday.start.getTime() - 86400000), // Day before holiday starts
            firstDayAfter: new Date(holiday.end.getTime() + 86400000) // Day after holiday ends
          });
        }
      }
      
      console.log(`Found ${breakPoints.length} break points for ${course.name} on day ${dayOfWeek}:`);
      breakPoints.forEach(bp => console.log(`  - ${bp.name}: Last day before: ${bp.lastDayBefore.toDateString()}, First day after: ${bp.firstDayAfter.toDateString()}`));
      
      if (breakPoints.length === 0) {
        // No breaks affect this class, create a single recurring event
        console.log(`No breaks affect ${course.name} on ${dayOfWeek}, creating single recurring event`);
        
        addRecurringEvent(
          cal, eventTitle, course.instructor, location || 'No location specified',
          courseStartDate, courseEndDate, dayNumber, dayOfWeek,
          startHour, startMinute, endHour, endMinute, addAlerts
        );
        
        eventsCreatedForCourse++;
      } else {
        // Create separate events for each segment
        let currentStartDate = new Date(courseStartDate);
        
        // For each break, create an event that ends right before the break
        for (const breakPoint of breakPoints) {
          // Skip if this break is entirely before our current position
          if (breakPoint.lastDayBefore < currentStartDate) {
            console.log(`Skipping ${breakPoint.name} as it's before our current start date ${currentStartDate.toDateString()}`);
            continue;
          }
          
          // Create event from current start to day before break
          console.log(`Creating event from ${currentStartDate.toDateString()} to ${breakPoint.lastDayBefore.toDateString()} (before ${breakPoint.name})`);
          
          addRecurringEvent(
            cal, eventTitle, course.instructor, location || 'No location specified',
            currentStartDate, breakPoint.lastDayBefore, dayNumber, dayOfWeek,
            startHour, startMinute, endHour, endMinute, addAlerts
          );
          
          eventsCreatedForCourse++;
          
          // Move current start to day after break
          currentStartDate = new Date(breakPoint.firstDayAfter);
          console.log(`Setting new start date to ${currentStartDate.toDateString()} (after ${breakPoint.name})`);
        }
        
        // Create final event from last break to end of semester
        if (currentStartDate <= courseEndDate) {
          console.log(`Creating final event from ${currentStartDate.toDateString()} to ${courseEndDate.toDateString()}`);
          
          addRecurringEvent(
            cal, eventTitle, course.instructor, location || 'No location specified',
            currentStartDate, courseEndDate, dayNumber, dayOfWeek,
            startHour, startMinute, endHour, endMinute, addAlerts
          );
          
          eventsCreatedForCourse++;
        } else {
          console.log(`No final event needed as last break extends beyond course end date`);
        }
      }
    });
    
    console.log(`Created ${eventsCreatedForCourse} events for ${course.name}`);
  } catch (error) {
    console.error(`Error processing section for course ${course.name}:`, error);
  }
}

// Helper function to add a recurring event
function addRecurringEvent(
  cal, title, instructor, location, 
  rangeStart, rangeEnd, dayNumber, dayOfWeek,
  startHour, startMinute, endHour, endMinute, addAlerts
) {
  try {
    // Find first occurrence of this day of week after rangeStart
    const firstDate = findFirstDayOccurrence(rangeStart, dayNumber);
    
    // If first occurrence is after rangeEnd, no event to create
    if (firstDate > rangeEnd) {
      console.log(`No occurrences of ${dayOfWeek} between ${rangeStart.toDateString()} and ${rangeEnd.toDateString()}`);
      return;
    }
    
    // Set event times
    const eventStart = new Date(firstDate);
    eventStart.setHours(startHour, startMinute, 0);
    
    const eventEnd = new Date(firstDate);
    eventEnd.setHours(endHour, endMinute, 0);
    
    // Create event options
    const eventOptions = {
      recurrenceRule: {
        freq: 'WEEKLY',
        until: rangeEnd,
        byday: [dayOfWeek]
      },
      alarms: addAlerts ? [{action: 'display', trigger: {minutes: 15, before: true}}] : null
    };
    
    // Add event to calendar
    cal.addEvent(
      title,
      instructor ? `Instructor: ${instructor}` : '',
      location,
      eventStart,
      eventEnd,
      eventOptions
    );
    
    console.log(`Added recurring event: ${title} on ${dayOfWeek} from ${eventStart.toLocaleString()} starting on ${firstDate.toDateString()} until ${rangeEnd.toDateString()}`);
  } catch (error) {
    console.error("Error adding recurring event:", error);
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
  console.log(`Finding first ${getDayName(dayNumber)} on or after ${startDate.toDateString()}`);
  
  const result = new Date(startDate);
  
  // If the start date is already the right day, use it
  if (result.getDay() === dayNumber) {
    console.log(`Start date ${result.toDateString()} is already a ${getDayName(dayNumber)}`);
    return result;
  }
  
  // Otherwise search forward until we find the day
  let daysChecked = 0;
  while (result.getDay() !== dayNumber && daysChecked < 7) {
    result.setDate(result.getDate() + 1);
    daysChecked++;
  }
  
  console.log(`First ${getDayName(dayNumber)} found: ${result.toDateString()}`);
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
    console.log("Using fetched academic calendar data");
    
    // Log all holidays in the fetched calendar
    console.log("Fetched academic calendar holidays:");
    if (academicCalendar.holidays) {
      academicCalendar.holidays.forEach(holiday => {
        if (holiday.date) {
          console.log(`  - ${holiday.name}: ${holiday.date}`);
        } else {
          console.log(`  - ${holiday.name}: ${holiday.startDate} - ${holiday.endDate}`);
        }
      });
    }
    
    return academicCalendar;
  }
  
  console.log("Using default academic calendar data");
  
  // Create the default calendar with the provided dates
  const defaultCalendar = {
    semester: {
      fall: {
        start: "2025-09-03",
        end: "2025-12-19"
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
        name: "Thanksgiving",
        startDate: "2025-11-27",
        endDate: "2025-11-30"
      },
      {
        name: "Spring Break",
        startDate: "2025-03-28",
        endDate: "2025-04-05"
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
  
  // Log all default holidays
  console.log("Default academic calendar holidays:");
  defaultCalendar.holidays.forEach(holiday => {
    if (holiday.date) {
      console.log(`  - ${holiday.name}: ${holiday.date}`);
    } else {
      console.log(`  - ${holiday.name}: ${holiday.startDate} - ${holiday.endDate}`);
    }
  });
  
  return defaultCalendar;
} 