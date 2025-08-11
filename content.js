// Content script to extract course data from the UW-Madison enrollment page

console.log("UW-Madison Schedule Extractor loaded");

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractSchedule") {
    try {
      // Extract course data with selected term
      const selectedTerm = request.selectedTerm || null;
      console.log(`Content script received selected term: ${selectedTerm}`);
      
      const courseData = extractCourseData(selectedTerm);
      sendResponse({success: true, data: courseData});
    } catch (error) {
      console.error("Error extracting course data:", error);
      sendResponse({success: false, error: error.message});
    }
  }
  return true; // Required for asynchronous response
});
