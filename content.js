// Content script to extract course data from the UW-Madison enrollment page

// Minimal initial log, just to confirm the script loaded
console.log("UW-Madison Schedule Extractor loaded");

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Removed verbose logging
  if (request.action === "extractSchedule") {
    try {
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

// Function to extract course data from the page
function extractCourseData() {
  try {
    // First try to extract the JSON data from the page
    const jsonData = extractJSONDataFromPage();
    
    if (jsonData) {
      console.log("Found JSON course data in the page");
      return parseJSONData(jsonData);
    }
    
    // If JSON extraction fails, try the DOM-based extraction methods
    console.log("No JSON data found, falling back to DOM parsing");
    const courses = [];
    
    // First try the specialized approach for the common format we're seeing
    // Convert NodeList to array before filtering
    const courseElements = Array.from(document.querySelectorAll('div, section, article')).filter(el => {
      // Look for headings or elements that likely contain course names
      const heading = el.querySelector('h1, h2, h3, h4, h5, strong');
      if (!heading) return false;
      
      // Check if heading text matches course pattern (e.g., "CHEM 329: Fundamentals...")
      const text = heading.textContent.trim();
      return /[A-Z]+ \d+:/.test(text) || /[A-Z]+ [A-Z]+ \d+:/.test(text);
    });
    
    // If we found structured course elements, extract from those
    if (courseElements && courseElements.length > 0) {
      courseElements.forEach(courseEl => {
        const courseData = extractStructuredCourseData(courseEl);
        if (courseData) courses.push(courseData);
      });
    } else {
      // Otherwise, try to parse from text content in a more general way
      const coursesText = document.body.textContent;
      const parsedCourses = parseCoursesFromText(coursesText);
      courses.push(...parsedCourses);
    }
    
    // If still no courses found, try the older methods
    if (courses.length === 0) {
      return fallbackExtractCourseData();
    }
    
    return courses;
  } catch (error) {
    console.error("Error extracting course data:", error);
    throw new Error("Failed to extract course data. Error: " + error.message);
  }
}

// Extract JSON data from the page script tags
function extractJSONDataFromPage() {
  try {
    // Look for the script tag containing the course data
    const scripts = document.querySelectorAll('script[type="module"]');
    let jsonData = null;
    
    for (const script of scripts) {
      if (!script.textContent.includes('loadTimeline')) continue;
      
      // Extract the JSON data object
      const match = script.textContent.match(/const data = (\{.*?\});/s);
      if (match && match[1]) {
        try {
          // Parse the JSON data
          jsonData = JSON.parse(match[1]);
          break;
        } catch (e) {
          console.error("Failed to parse JSON data:", e);
        }
      }
    }
    
    return jsonData;
  } catch (error) {
    console.error("Error extracting JSON data:", error);
    return null;
  }
}

// Parse the extracted JSON data into course objects
function parseJSONData(jsonData) {
  const courses = [];
  
  // First gather all course information
  const courseInfo = {};
  
  // Extract course details
  if (jsonData.courses) {
    jsonData.courses.forEach(course => {
      courseInfo[course.id] = {
        courseId: course.id,
        name: `${course.subjectShortDesc} ${course.catalogNumber}: ${course.title}`,
        sections: [],
        finalExam: null
      };
      
      // Add exams if available
      if (course.exams && course.exams.length > 0) {
        const exam = course.exams[0];
        courseInfo[course.id].finalExam = {
          date: formatExamDate(exam.start),
          time: `${formatTime(exam.start)} - ${formatTime(exam.end)}`,
          location: exam.location || "Location not specified"
        };
      }
    });
  }
  
  // Extract class/section details
  if (jsonData.classes && jsonData.courseForClassId) {
    jsonData.classes.forEach(classItem => {
      const courseId = jsonData.courseForClassId[classItem.id]?.id;
      
      if (!courseId || !courseInfo[courseId]) return;
      
      // Extract meeting information
      if (classItem.meetings && classItem.meetings.length > 0) {
        const meeting = classItem.meetings[0];
        
        // Convert day initials - ensuring UW-Madison format is properly handled (R = Thursday, T = Tuesday)
        // Make sure we pass this through our enhanced conversion function
        const dayInitials = meeting.dayInitials || "";
        
        // Debug: Log the term name being used
        const termName = jsonData.terms?.present?.name;
        console.log(`Term name from JSON: "${termName}"`);
        
        courseInfo[courseId].sections.push({
          type: classItem.type,
          number: classItem.sectionNumber,
          schedule: {
            days: convertDaysToICalFormat(dayInitials),
            startTime: formatTime(meeting.start),
            endTime: formatTime(meeting.end)
          },
          location: meeting.location || "Location not specified",
          dates: getSemesterDates(termName)
        });
      }
      
      // Additional exams at the section level if available
      if (classItem.exams && classItem.exams.length > 0 && !courseInfo[courseId].finalExam) {
        const exam = classItem.exams[0];
        courseInfo[courseId].finalExam = {
          date: formatExamDate(exam.start),
          time: `${formatTime(exam.start)} - ${formatTime(exam.end)}`,
          location: exam.location || "Location not specified"
        };
      }
    });
  }
  
  // Convert to the format expected by the popup
  for (const id in courseInfo) {
    if (courseInfo[id].sections.length === 0) continue;
    
    // Find the primary section (usually LEC)
    const mainSection = courseInfo[id].sections.find(s => s.type === 'LEC') || courseInfo[id].sections[0];
    
    courses.push({
      name: courseInfo[id].name,
      courseId: courseInfo[id].courseId,
      section: `${mainSection.type} ${mainSection.number}`,
      instructor: '', // Not available in the JSON data
      schedule: mainSection.schedule,
      location: mainSection.location,
      dates: mainSection.dates,
      finalExam: courseInfo[id].finalExam,
      additionalSections: courseInfo[id].sections.filter(s => s !== mainSection)
    });
  }
  
  return courses;
}

// Helper functions for JSON data parsing
function formatTime(timeStr) {
  try {
    // Create date object from the time string
    const date = new Date(timeStr);
    
    // Extract local time components (not UTC-adjusted)
    const localDate = new Date(date.getTime());
    let hours = localDate.getHours();
    const minutes = localDate.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12 for 12 AM
    
    return `${hours}:${minutes} ${ampm}`;
  } catch (error) {
    console.error("Error formatting time:", error);
    return timeStr;
  }
}

function formatExamDate(dateStr) {
  try {
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const month = months[date.getMonth()];
    const day = date.getDate();
    
    return `${month} ${day}`;
  } catch (error) {
    console.error("Error formatting exam date:", error);
    return dateStr;
  }
}

function getSemesterDates(termName) {
  // Use the correct academic year dates for 2025-2026
  // Fall 2025: September 3 - December 19, 2025
  // Spring 2026: January 20 - May 1, 2026
  
  console.log(`getSemesterDates called with termName: "${termName}"`);
  
  // Format date strings with month numbers for consistency
  const formatDate = (month, day, year) => {
    return `${monthNumberToName(month)} ${day}, ${year}`;
  };
  
  // Use the appropriate academic year
  if (termName) {
    console.log(`Processing term: "${termName}"`);
    if (termName.includes('Spring')) {
      console.log('Detected Spring semester');
      // Spring semester dates for 2026
      return {
        startDate: formatDate(1, 20, 2026),  // Jan 20, 2026
        endDate: formatDate(5, 1, 2026)  // May 1, 2026
      };
    } else if (termName.includes('Fall')) {
      console.log('Detected Fall semester');
      // Fall semester dates for 2025
      return {
        startDate: formatDate(9, 3, 2025),  // Sep 3, 2025
        endDate: formatDate(12, 19, 2025)  // Dec 19, 2025
      };
    } else if (termName.includes('Summer')) {
      console.log('Detected Summer semester');
      // Summer semester dates for 2026
      return {
        startDate: formatDate(5, 19, 2026),  // May 19, 2026
        endDate: formatDate(8, 8, 2026)  // Aug 8, 2026
      };
    } else {
      console.log(`Term "${termName}" not recognized, checking for other patterns...`);
      // Try to detect based on other patterns
      if (termName.toLowerCase().includes('fall') || termName.toLowerCase().includes('autumn')) {
        console.log('Detected Fall semester via alternative pattern');
        return {
          startDate: formatDate(9, 3, 2025),  // Sep 3, 2025
          endDate: formatDate(12, 19, 2025)  // Dec 19, 2025
        };
      }
    }
  }
  
  console.log('No term name provided or not recognized, defaulting to Fall 2025');
  // Default to Fall 2025 semester if term name is not recognized
  return {
    startDate: formatDate(9, 3, 2025),  // Sep 3, 2025
    endDate: formatDate(12, 19, 2025)  // Dec 19, 2025
  };
}

// Helper function to convert month number to name (0-based index to month name)
function monthNumberToName(monthNumber) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[monthNumber - 1] || 'Jan'; // Subtract 1 because months array is 0-indexed but our input is 1-indexed
}

// Parse courses from text content when structured elements are not easily identifiable
function parseCoursesFromText(text) {
  const courses = [];
  
  // Split text into lines and look for course sections
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  let currentCourse = null;
  let inWeeklyMeetings = false;
  let inExams = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for course header (e.g., "CHEM 329: Fundamentals of Analytical Science")
    const courseMatch = line.match(/([A-Z]+ \d+):\s*(.*)/);
    if (courseMatch) {
      // Save previous course if exists
      if (currentCourse) {
        courses.push(currentCourse);
      }
      
      // Start new course
      currentCourse = {
        courseId: courseMatch[1],
        name: `${courseMatch[1]}: ${courseMatch[2]}`,
        sections: []
      };
      
      inWeeklyMeetings = false;
      inExams = false;
      continue;
    }
    
    if (!currentCourse) continue;
    
    // Check for section markers
    if (line === "Weekly Meetings") {
      inWeeklyMeetings = true;
      inExams = false;
      continue;
    } else if (line === "Exams") {
      inWeeklyMeetings = false;
      inExams = true;
      continue;
    }
    
    // Parse weekly meeting information
    if (inWeeklyMeetings) {
      // Match patterns like "LEC 001 MW 8:50 AM - 9:40 AM Chemistry Building Room 1315"
      const meetingMatch = line.match(/(LEC|DIS|LAB|SEM)\s+(\d+)\s+([MTWRFS]+)\s+(\d+:\d+\s+[AP]M)\s+-\s+(\d+:\d+\s+[AP]M)\s+(.*)/);
      if (meetingMatch) {
        const sectionType = meetingMatch[1];
        const sectionNumber = meetingMatch[2];
        const days = meetingMatch[3];
        const startTime = meetingMatch[4];
        const endTime = meetingMatch[5];
        const location = meetingMatch[6] || "Location not specified";
        
        // Add the section to the course
        currentCourse.sections.push({
          type: sectionType,
          number: sectionNumber,
          schedule: {
            days: convertDaysToICalFormat(days),
            startTime: startTime,
            endTime: endTime
          },
          location: location,
          dates: { // Default semester dates - will be updated from academic calendar
            startDate: "Jan 22, 2025",
            endDate: "May 9, 2025"
          }
        });
      }
    }
    
    // Parse exam information
    if (inExams) {
      // Match patterns like "May 6, 5:05 PM - 7:05 PM - Location not specified"
      const examMatch = line.match(/(.*\d+),\s+(\d+:\d+\s+[AP]M)\s+-\s+(\d+:\d+\s+[AP]M)\s+-\s+(.*)/);
      if (examMatch) {
        const date = examMatch[1];
        const startTime = examMatch[2];
        const endTime = examMatch[3];
        const location = examMatch[4];
        
        currentCourse.finalExam = {
          date: date,
          time: `${startTime} - ${endTime}`,
          location: location
        };
      }
    }
  }
  
  // Add the last course if exists
  if (currentCourse) {
    courses.push(currentCourse);
  }
  
  // Convert to the format expected by the popup
  return courses.map(course => {
    // Find the primary section (usually LEC)
    const mainSection = course.sections.find(s => s.type === 'LEC') || course.sections[0];
    
    return {
      name: course.name,
      courseId: course.courseId,
      section: mainSection ? `${mainSection.type} ${mainSection.number}` : '',
      instructor: '', // Not available in the text
      schedule: mainSection ? mainSection.schedule : null,
      location: mainSection ? mainSection.location : '',
      dates: mainSection ? mainSection.dates : null,
      finalExam: course.finalExam,
      additionalSections: course.sections.filter(s => s !== mainSection)
    };
  });
}

// Extract course data from a structured element
function extractStructuredCourseData(courseElement) {
  try {
    // Find the course name/title
    const titleEl = courseElement.querySelector('h1, h2, h3, h4, h5, strong');
    if (!titleEl) return null;
    
    const titleText = titleEl.textContent.trim();
    const courseMatch = titleText.match(/([A-Z]+ \d+):\s*(.*)/);
    if (!courseMatch) return null;
    
    const courseId = courseMatch[1];
    const courseName = `${courseMatch[1]}: ${courseMatch[2]}`;
    
    // Initialize course object
    const course = {
      name: courseName,
      courseId: courseId,
      sections: []
    };
    
    // Extract meeting information
    const meetingSections = Array.from(courseElement.querySelectorAll('p, div, li')).filter(el => {
      const text = el.textContent.trim();
      return text.includes('LEC') || text.includes('DIS') || text.includes('LAB') || text.includes('SEM');
    });
    
    meetingSections.forEach(section => {
      const sectionText = section.textContent.trim();
      const meetingMatch = sectionText.match(/(LEC|DIS|LAB|SEM)\s+(\d+)\s+([MTWRFS]+)\s+(\d+:\d+\s+[AP]M)\s+-\s+(\d+:\d+\s+[AP]M)\s+(.*)/);
      
      if (meetingMatch) {
        const sectionType = meetingMatch[1];
        const sectionNumber = meetingMatch[2];
        const days = meetingMatch[3];
        const startTime = meetingMatch[4];
        const endTime = meetingMatch[5];
        const location = meetingMatch[6] || "Location not specified";
        
        // Add the section to the course
        course.sections.push({
          type: sectionType,
          number: sectionNumber,
          schedule: {
            days: convertDaysToICalFormat(days),
            startTime: startTime,
            endTime: endTime
          },
          location: location,
          dates: { // Default semester dates - will be updated from academic calendar
            startDate: "Jan 22, 2025",
            endDate: "May 9, 2025"
          }
        });
      }
    });
    
    // Extract exam information
    const examSections = Array.from(courseElement.querySelectorAll('p, div, li')).filter(el => {
      const text = el.textContent.trim();
      return text.includes('Exam') || text.includes('PM - ');
    });
    
    if (examSections.length > 0) {
      const examText = examSections[0].textContent.trim();
      const examMatch = examText.match(/(.*\d+),\s+(\d+:\d+\s+[AP]M)\s+-\s+(\d+:\d+\s+[AP]M)\s+-\s+(.*)/);
      
      if (examMatch) {
        const date = examMatch[1];
        const startTime = examMatch[2];
        const endTime = examMatch[3];
        const location = examMatch[4];
        
        course.finalExam = {
          date: date,
          time: `${startTime} - ${endTime}`,
          location: location
        };
      }
    }
    
    // Convert to the format expected by the popup
    const mainSection = course.sections.find(s => s.type === 'LEC') || course.sections[0];
    
    return {
      name: course.name,
      courseId: course.courseId,
      section: mainSection ? `${mainSection.type} ${mainSection.number}` : '',
      instructor: '', // Not available in the text
      schedule: mainSection ? mainSection.schedule : null,
      location: mainSection ? mainSection.location : '',
      dates: mainSection ? mainSection.dates : null,
      finalExam: course.finalExam,
      additionalSections: course.sections.filter(s => s !== mainSection)
    };
  } catch (error) {
    console.error("Error extracting structured course data:", error);
    return null;
  }
}

// Convert a schedule days string to iCal format (e.g., "TuTh" -> ["TU","TH"])
function convertDaysToICalFormat(daysStr) {
  const map = {
    M: 'MO', Mo: 'MO', Mon: 'MO',
    T: 'TU', Tu: 'TU', Tue: 'TU',
    W: 'WE', We: 'WE', Wed: 'WE',
    R: 'TH', Th: 'TH', Thu: 'TH',
    F: 'FR', Fr: 'FR', Fri: 'FR',
    S: 'SA', Sa: 'SA', Sat: 'SA',
    U: 'SU', Su: 'SU', Sun: 'SU'
  };

  const tokens = String(daysStr || '')
    .replace(/[^a-zA-Z]/g, '')
    .match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Mo|Tu|We|Th|Fr|Sa|Su|M|T|W|R|F|S|U)/gi);

  if (!tokens) return [];

  const result = [];
  tokens.forEach(token => {
    const key = token.length > 1
      ? token[0].toUpperCase() + token.slice(1).toLowerCase()
      : token.toUpperCase();
    const dayCode = map[key];
    if (dayCode && !result.includes(dayCode)) {
      result.push(dayCode);
    }
  });

  console.debug(`Day conversion: "${daysStr}" → ${JSON.stringify(result)}`);
  return result;
}

// Original extraction methods as fallback
function fallbackExtractCourseData() {
  const courses = [];
  
  // Assuming each course is in a container with a class like 'course-container'
  const courseElements = document.querySelectorAll('.course-container, .course-row, .enrolled-course');
  
  // If no courses found, try a more generic approach
  if (courseElements.length === 0) {
    console.warn("No courses found with specific selectors, trying generic table approach");
    const tableCourses = extractCoursesFromTables();
    if (tableCourses && tableCourses.length > 0) {
      return tableCourses;
    }
  }
  
  courseElements.forEach(courseEl => {
    try {
      // Example extraction - adjust based on actual page structure
      const courseNameEl = courseEl.querySelector('.course-name, .course-title, h3, strong');
      const sectionEl = courseEl.querySelector('.section-number, .section');
      const instructorEl = courseEl.querySelector('.instructor, .professor');
      const scheduleEl = courseEl.querySelector('.schedule, .meeting-time');
      const locationEl = courseEl.querySelector('.location, .room');
      const datesEl = courseEl.querySelector('.dates, .course-dates');
      
      if (!courseNameEl) return; // Skip if no course name found
      
      const courseInfo = {
        name: courseNameEl.textContent.trim(),
        section: sectionEl ? sectionEl.textContent.trim() : '',
        instructor: instructorEl ? instructorEl.textContent.trim() : '',
        schedule: scheduleEl ? parseSchedule(scheduleEl.textContent.trim()) : null,
        location: locationEl ? locationEl.textContent.trim() : '',
        dates: datesEl ? parseDates(datesEl.textContent.trim()) : null
      };
      
      courses.push(courseInfo);
    } catch (error) {
      console.error("Error extracting course data:", error);
    }
  });
  
  // If no courses were extracted, throw an error
  if (courses.length === 0) {
    throw new Error("No course data found on the page. Please make sure you're on the correct page and try again.");
  }
  
  // Now also look for final exam information
  extractFinalExams(courses);
  
  return courses;
}

// Try to extract courses from any tables on the page
function extractCoursesFromTables() {
  const tables = document.querySelectorAll('table');
  const courses = [];
  
  tables.forEach(table => {
    const rows = table.querySelectorAll('tr');
    
    // Skip the header row
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll('td');
      if (cells.length >= 5) {
        // Assuming a table structure like: Course Name | Section | Schedule | Location | Dates
        const courseInfo = {
          name: cells[0].textContent.trim(),
          section: cells[1].textContent.trim(),
          instructor: cells.length > 5 ? cells[2].textContent.trim() : '',
          schedule: parseSchedule(cells[cells.length > 5 ? 3 : 2].textContent.trim()),
          location: cells[cells.length > 5 ? 4 : 3].textContent.trim(),
          dates: parseDates(cells[cells.length > 5 ? 5 : 4].textContent.trim())
        };
        
        courses.push(courseInfo);
      }
    }
  });
  
  return courses;
}

// Parse schedule string like "MWF 9:00 AM - 9:50 AM"
function parseSchedule(scheduleStr) {
  try {
    const scheduleParts = scheduleStr.trim().split(' ');
    
    if (scheduleParts.length < 3) return null;
    
    // Extract days of week (using UW-Madison format: M=Monday, T=Tuesday, W=Wednesday, R=Thursday, F=Friday)
    const daysStr = scheduleParts[0].toUpperCase();
    
    // Use our improved function to convert days correctly
    const days = convertDaysToICalFormat(daysStr);
    
    // Find start and end times
    let startTimeStr = '', endTimeStr = '';
    let foundStartTime = false;
    
    // Look for time pattern like "9:00 AM - 9:50 AM"
    for (let i = 1; i < scheduleParts.length; i++) {
      const part = scheduleParts[i];
      
      // Time pattern: digits:digits
      if (part.match(/\d+:\d+/)) {
        // Combine the time with its AM/PM designator
        const timeWithMeridiem = part + ' ' + scheduleParts[i+1];
        
        if (!foundStartTime) {
          startTimeStr = timeWithMeridiem;
          foundStartTime = true;
        } else if (foundStartTime && part !== '-') {
          endTimeStr = timeWithMeridiem;
          break;
        }
      }
      
      // Handle the dash between times
      if (part === '-') {
        foundStartTime = true;
      }
    }
    
    return {
      days: days,
      startTime: startTimeStr,
      endTime: endTimeStr
    };
  } catch (error) {
    console.error("Error parsing schedule:", error);
    return null;
  }
}

// Parse date string like "Jan 23, 2023 - May 5, 2023"
function parseDates(dateStr) {
  try {
    const dateParts = dateStr.split('-');
    if (dateParts.length === 2) {
      return {
        startDate: dateParts[0].trim(),
        endDate: dateParts[1].trim()
      };
    }
    return null;
  } catch (error) {
    console.error("Error parsing dates:", error);
    return null;
  }
}

// Function to extract final exam information and add it to course objects
function extractFinalExams(courses) {
  try {
    // Look for final exam information
    // This will depend on the actual structure of the page
    const examElements = document.querySelectorAll('.final-exam, .exam-info, table:contains("Final Exam")');
    
    if (examElements.length === 0) {
      console.warn("No final exam information found on the page");
      return;
    }
    
    examElements.forEach(examEl => {
      // Try to associate the exam with a course
      // This might be based on course number, section, or other identifiers
      const courseIdentifier = examEl.querySelector('.course-id, .course-number')?.textContent.trim();
      const examDate = examEl.querySelector('.exam-date')?.textContent.trim();
      const examTime = examEl.querySelector('.exam-time')?.textContent.trim();
      const examLocation = examEl.querySelector('.exam-location')?.textContent.trim();
      
      if (!courseIdentifier || !examDate || !examTime) {
        console.warn("Incomplete exam information found, skipping");
        return;
      }
      
      // Find the matching course
      const matchingCourse = courses.find(course => {
        // Match by course number/ID if available
        if (course.courseId && course.courseId === courseIdentifier) {
          return true;
        }
        // If no direct ID match, try matching by course name containing the identifier
        return course.name.includes(courseIdentifier);
      });
      
      if (matchingCourse) {
        matchingCourse.finalExam = {
          date: examDate,
          time: examTime,
          location: examLocation || ''
        };
      } else {
        console.warn(`Could not find matching course for exam: ${courseIdentifier}`);
        // Add as a standalone exam event if no matching course
        courses.push({
          name: `Final Exam: ${courseIdentifier}`,
          finalExam: {
            date: examDate,
            time: examTime,
            location: examLocation || ''
          }
        });
      }
    });
  } catch (error) {
    console.error("Error extracting final exam data:", error);
  }
} 