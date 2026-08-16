// Parsing and extraction logic moved from content.js
function extractCourseData(termConfig = null) {
  try {
    console.log("Starting course data extraction...");
    console.log(`Using selected term: ${termConfig?.label || 'none'}`);
    
    // Extract the JSON data from the page
    const jsonData = extractJSONDataFromPage();
    
    if (!jsonData) {
      console.error("No JSON data found - extraction failed");
      throw new Error("No course data found on the page. Please make sure you're on the correct UW-Madison course schedule page.");
    }
    
    console.log("Found JSON course data in the page");
    console.log("JSON data structure:", Object.keys(jsonData));
    
    if (jsonData.terms) {
      console.log("Terms data found:", jsonData.terms);
    }
    
    return parseJSONData(jsonData, termConfig);
  } catch (error) {
    console.error("Error extracting course data:", error);
    throw new Error("Failed to extract course data. Error: " + error.message);
  }
}

// Extract JSON data from the page script tags
function extractJSONDataFromPage() {
  try {
    // Look for JSON data in various script tags
    const scripts = document.querySelectorAll('script');
    let jsonData = null;
    
    console.log("Searching for JSON data in", scripts.length, "script tags");
    
    for (const script of scripts) {
      const content = script.textContent || script.innerHTML;
      
      // Try multiple patterns to find JSON data
      const patterns = [
        // Pattern 1: const data = {...};
        /const\s+data\s*=\s*(\{.*?\});/s,
        // Pattern 2: window.data = {...};
        /window\.data\s*=\s*(\{.*?\});/s,
        // Pattern 3: var data = {...};
        /var\s+data\s*=\s*(\{.*?\});/s,
        // Pattern 4: let data = {...};
        /let\s+data\s*=\s*(\{.*?\});/s,
        // Pattern 5: data = {...};
        /data\s*=\s*(\{.*?\});/s,
        // Pattern 6: Look for any object with courses property
        /(\{[^}]*"courses"[^}]*\{[^}]*\})/s
      ];
      
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          try {
            // Parse the JSON data
            jsonData = JSON.parse(match[1]);
            
            // Verify it has the expected structure
            if (jsonData && (jsonData.courses || jsonData.classes || jsonData.terms)) {
              console.log("Found valid JSON data with course information");
              console.log("JSON data keys:", Object.keys(jsonData));
              if (jsonData.terms) {
                console.log("Terms data:", jsonData.terms);
              }
              return jsonData;
            }
          } catch (e) {
            console.error("Failed to parse JSON data with pattern:", pattern, e);
            continue;
          }
        }
      }
    }
    
    // If no JSON found in scripts, try to find it in the page's global variables
    if (typeof window !== 'undefined') {
      const globalVars = ['data', 'courseData', 'scheduleData', 'enrollmentData'];
      for (const varName of globalVars) {
        if (window[varName] && typeof window[varName] === 'object') {
          const data = window[varName];
          if (data.courses || data.classes || data.terms) {
            console.log(`Found course data in global variable: ${varName}`);
            return data;
          }
        }
      }
    }
    
    console.error("No valid JSON course data found on the page");
    return null;
  } catch (error) {
    console.error("Error extracting JSON data:", error);
    return null;
  }
}

// Parse the extracted JSON data into course objects
function parseJSONData(jsonData, termConfig) {
  const courses = [];
  const semesterDates = getConfiguredTermDates(termConfig);
  
  console.log("Parsing JSON data:", jsonData);
  
  // Debug: Check for term information in JSON
  console.log("Checking for term information in JSON data...");
  if (jsonData.terms) {
    console.log("jsonData.terms:", jsonData.terms);
  }
  if (jsonData.currentTerm) {
    console.log("jsonData.currentTerm:", jsonData.currentTerm);
  }
  if (jsonData.term) {
    console.log("jsonData.term:", jsonData.term);
  }
  
  // First gather all course information
  const courseInfo = {};
  
  // Extract course details - handle different possible structures
  const coursesData = jsonData.courses || jsonData.courseData || jsonData.enrolledCourses || [];
  
  if (coursesData && coursesData.length > 0) {
    coursesData.forEach(course => {
      const subject = course.subjectShortDesc || course.subjectCode || course.subject || '';
      const catalog = course.catalogNumber || course.number || '';
      const title = course.title || course.courseTitle || '';
      const fullName = `${subject ? subject : ''}${subject && catalog ? ' ' : ''}${catalog ? catalog : ''}${(subject || catalog) && title ? ': ' : ''}${title}`.trim();

      const courseId = course.id || course.courseId || (subject + catalog);
      courseInfo[courseId] = {
        courseId: courseId,
        name: fullName || title || courseId,
        sections: [],
        finalExam: null
      };
      
      // Add exams if available
      if (course.exams && course.exams.length > 0) {
        const exam = course.exams[0];
        courseInfo[courseId].finalExam = {
          date: formatExamDate(exam.start || exam.date),
          time: `${formatTime(exam.start || exam.date)} - ${formatTime(exam.end || exam.endTime)}`,
          location: exam.location || "Location not specified"
        };
      }
    });
  }
  
  // Extract class/section details - handle different possible structures
  const classesData = jsonData.classes || jsonData.sections || jsonData.enrolledSections || [];
  
  if (classesData && classesData.length > 0) {
    classesData.forEach(classItem => {
      // Try different ways to find the course ID
      let courseId = null;
      if (jsonData.courseForClassId && jsonData.courseForClassId[classItem.id]) {
        courseId = jsonData.courseForClassId[classItem.id].id;
      } else if (classItem.courseId) {
        courseId = classItem.courseId;
      } else if (classItem.subjectCode && classItem.catalogNumber) {
        courseId = classItem.subjectCode + classItem.catalogNumber;
      }
      
      if (!courseId || !courseInfo[courseId]) {
        console.warn(`Could not find course info for class: ${classItem.id}`);
        return;
      }
      
      // Extract meeting information
      const meetings = classItem.meetings || classItem.schedule || [];
      if (meetings && meetings.length > 0) {
        const meeting = meetings[0];
        
        // Convert day initials - ensuring UW-Madison format is properly handled (R = Thursday, T = Tuesday)
        const dayInitials = meeting.dayInitials || meeting.days || "";
        
        console.log(`Course: ${courseInfo[courseId].name}, Term: "${termConfig.label}", Dates: ${semesterDates.startDate} - ${semesterDates.endDate}`);
        
        courseInfo[courseId].sections.push({
          type: classItem.type || classItem.sectionType || "LEC",
          number: classItem.sectionNumber || classItem.number || "001",
          schedule: {
            days: convertDaysToICalFormat(dayInitials),
            startTime: formatTime(meeting.start || meeting.startTime),
            endTime: formatTime(meeting.end || meeting.endTime)
          },
          location: meeting.location || classItem.location || "Location not specified",
          dates: { ...semesterDates }
        });
      }
      
      // Additional exams at the section level if available
      if (classItem.exams && classItem.exams.length > 0 && !courseInfo[courseId].finalExam) {
        const exam = classItem.exams[0];
        courseInfo[courseId].finalExam = {
          date: formatExamDate(exam.start || exam.date),
          time: `${formatTime(exam.start || exam.date)} - ${formatTime(exam.end || exam.endTime)}`,
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
  
  console.log(`Parsed ${courses.length} courses from JSON data`);
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
    const year = date.getFullYear();
    
    return `${month} ${day}, ${year}`;
  } catch (error) {
    console.error("Error formatting exam date:", error);
    return dateStr;
  }
}

function getConfiguredTermDates(termConfig) {
  if (!termConfig || !termConfig.startDate || !termConfig.endDate) {
    throw new Error('The selected academic term does not have a valid date range.');
  }

  return {
    startDate: formatISODateForDisplay(termConfig.startDate),
    endDate: formatISODateForDisplay(termConfig.endDate)
  };
}

function formatISODateForDisplay(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new Error(`Invalid academic calendar date: ${isoDate}`);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return `${months[month - 1]} ${day}, ${year}`;
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
