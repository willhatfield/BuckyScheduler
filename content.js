// Content script to extract course data from the UW-Madison enrollment page

// Minimal initial log, just to confirm the script loaded
console.log("UW-Madison Schedule Extractor loaded");

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Removed verbose logging
  if (request.action === "extractSchedule") {
    try {
      if (typeof extractCourseData !== 'function') {
        throw new Error('Course extraction module not loaded');
      }
      const courseData = extractCourseData();
      // Remove detailed logging of extracted data
      sendResponse({success: true, data: courseData});
    } catch (error) {
      console.error("Error extracting course data:", error);
      sendResponse({success: false, error: error.message});
    }
  }
  return true; // Required for asynchronous response
});
