// Background script to handle data processing and academic calendar integration

// Store for holidays/academic calendar data
let academicCalendar = null;

// Fetch the academic calendar data when the extension is loaded
fetchAcademicCalendar()
  .catch(error => console.error("Failed to load academic calendar:", error));

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getAcademicCalendar") {
    if (academicCalendar) {
      sendResponse({success: true, data: academicCalendar});
    } else {
      fetchAcademicCalendar()
        .then(data => sendResponse({success: true, data: data}))
        .catch(error => sendResponse({success: false, error: error.message}));
    }
    return true; // Required for asynchronous response
  }
  return true; // Always return true for async responses
});

// Only add this listener if the API exists in this Chrome version
if (chrome.scripting && chrome.scripting.onScriptExecuted) {
  chrome.scripting.onScriptExecuted.addListener(() => {
    // Script has been injected - minimal logging
  });
}

// Function to fetch and parse the academic calendar
async function fetchAcademicCalendar() {
  try {
    // In a production extension, you would fetch the data directly from the website
    // For now, we're using the data from https://secfac.wisc.edu/academic-calendar/
    
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    // Determines which academic year to use based on current month
    // After July, use the upcoming academic year
    const isAfterJuly = new Date().getMonth() >= 6; // 0-indexed, so 6 = July
    const academicYearStart = isAfterJuly ? currentYear : currentYear - 1;
    const academicYearEnd = academicYearStart + 1;
    
    // Academic calendar data for 2024-2025
    // Source: https://secfac.wisc.edu/academic-calendar/
    const calendar = {
      semester: {
        fall: {
          start: "2024-09-04", // Fall semester instruction begins
          end: "2024-12-11"    // Last class day
        },
        spring: {
          start: "2025-01-21", // Spring semester instruction begins
          end: "2025-05-02"    // Last class day
        }
      },
      holidays: [
        { name: "Labor Day", date: "2024-09-02" },
        { name: "Thanksgiving Recess", startDate: "2024-11-28", endDate: "2024-12-01" },
        { name: "Martin Luther King Jr. Day", date: "2025-01-20" },
        { name: "Spring Recess", startDate: "2025-03-22", endDate: "2025-03-30" }
      ],
      finals: {
        fall: {
          start: "2024-12-13",
          end: "2024-12-19"
        },
        spring: {
          start: "2025-05-04",
          end: "2025-05-09"
        }
      },
      commencement: {
        fall: "2024-12-15",
        spring: {
          doctoral: "2025-05-09",
          other: "2025-05-10"
        }
      },
      // Religious observances are also available on the calendar page
      // These could be added for a more comprehensive calendar
      
      // When Daylight Saving Time changes occur (2024-2025)
      dstChanges: {
        spring: "2025-03-09", // Spring forward (2nd Sunday in March)
        fall: "2024-11-03"    // Fall back (1st Sunday in November)
      }
    };
    
    academicCalendar = calendar;
    return calendar;
  } catch (error) {
    console.error("Error fetching academic calendar:", error);
    throw error;
  }
} 