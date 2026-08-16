// Content script to extract course data from the UW-Madison enrollment page

console.log("Bucky Scheduler 2.0 academic-calendar extractor loaded");

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractSchedule") {
    try {
      const termConfig = request.termConfig || null;
      console.log(`Content script received selected term: ${termConfig?.label || 'none'}`);
      
      const courseData = extractCourseData(termConfig);
      sendResponse({success: true, data: courseData});
    } catch (error) {
      console.error("Error extracting course data:", error);
      sendResponse({success: false, error: error.message});
    }
  }
  return true; // Required for asynchronous response
});
