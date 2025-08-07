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
    
    // Academic calendar data for 2025-2026
    // Source: https://secfac.wisc.edu/academic-calendar/
    const calendar = {
      semester: {
        fall: {
          start: "2025-09-03", // Fall semester instruction begins
          end: "2025-12-10"    // Last class day
        },
        spring: {
          start: "2026-01-20", // Spring semester instruction begins
          end: "2026-05-01"    // Last class day
        }
      },
      holidays: [
        { name: "Labor Day", date: "2025-09-01" },
        { name: "Thanksgiving Recess", startDate: "2025-11-27", endDate: "2025-11-30" },
        { name: "Martin Luther King Jr. Day", date: "2026-01-19" },
        { name: "Spring Recess", startDate: "2026-03-21", endDate: "2026-03-29" }
      ],
      finals: {
        fall: {
          start: "2025-12-12",
          end: "2025-12-18"
        },
        spring: {
          start: "2026-05-03",
          end: "2026-05-08"
        }
      },
      commencement: {
        fall: "2025-12-14",
        spring: {
          doctoral: "2026-05-08",
          other: "2026-05-09"
        }
      },

      // When Daylight Saving Time changes occur (2025-2026)
      dstChanges: {
        spring: "2026-03-08", // Spring forward (2nd Sunday in March)
        fall: "2025-11-02"    // Fall back (1st Sunday in November)
      }
    };
    
    academicCalendar = calendar;
    return calendar;
  } catch (error) {
    console.error("Error fetching academic calendar:", error);
    throw error;
  }
} 