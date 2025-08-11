// Parsing and extraction logic moved from content.js
function extractCourseData(selectedTerm = null) {
  try {
    console.log("Starting course data extraction...");
    console.log(`Using selected term: ${selectedTerm}`);
    
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
    
    return parseJSONData(jsonData, selectedTerm);
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
function parseJSONData(jsonData, selectedTerm) {
  const courses = [];
  
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
        
        // Get term name from selected term or JSON data
        const termName = selectedTerm || jsonData.terms?.present?.name || jsonData.currentTerm?.name || jsonData.term?.name;
        console.log(`Term name being used: "${termName}"`);
        
        const semesterDates = getSemesterDates(termName);
        console.log(`Semester dates for ${courseInfo[courseId].name}:`, semesterDates);
        console.log(`Course: ${courseInfo[courseId].name}, Term: "${termName}", Dates: ${semesterDates.startDate} - ${semesterDates.endDate}`);
        
        courseInfo[courseId].sections.push({
          type: classItem.type || classItem.sectionType || "LEC",
          number: classItem.sectionNumber || classItem.number || "001",
          schedule: {
            days: convertDaysToICalFormat(dayInitials),
            startTime: formatTime(meeting.start || meeting.startTime),
            endTime: formatTime(meeting.end || meeting.endTime)
          },
          location: meeting.location || classItem.location || "Location not specified",
          dates: semesterDates
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
    
    return `${month} ${day}`;
  } catch (error) {
    console.error("Error formatting exam date:", error);
    return dateStr;
  }
}

function getSemesterDates(termName) {
  // Use the correct academic year dates for 2025-2026
  // Fall 2025: September 3 - December 10, 2025 (last class day)
  // Spring 2026: January 20 - May 1, 2026
  
  console.log(`getSemesterDates called with termName: "${termName}"`);
  
  // Format date strings with month numbers for consistency
  const formatDate = (month, day, year) => {
    return `${monthNumberToName(month)} ${day}, ${year}`;
  };
  
  // If no term name provided, try to detect it from the page
  if (!termName) {
    // Look for term information in the page
    const termSelectors = [
      'select[name*="term"] option[selected]',
      '.term-selector option[selected]',
      '[data-term]',
      '.current-term',
      'h1, h2, h3, h4, h5, h6'
    ];
    
    console.log("No term name provided, searching page for term information...");
    
    for (const selector of termSelectors) {
      const elements = document.querySelectorAll(selector);
      console.log(`Searching selector "${selector}": found ${elements.length} elements`);
      
      for (const element of elements) {
        const text = element.textContent || element.value || '';
        console.log(`Element text: "${text}"`);
        
        if (text.includes('Fall') || text.includes('Spring') || text.includes('Summer')) {
          termName = text;
          console.log(`Detected term from page: "${termName}"`);
          break;
        }
      }
      if (termName) break;
    }
  }
  
  // Use the appropriate academic year
  if (termName) {
    console.log(`Processing term: "${termName}"`);
    
    // Handle new term format (fall2025, spring2026, summer2026)
    if (termName === 'fall2025' || termName.includes('Fall')) {
      console.log('Detected Fall semester');
      // Fall semester dates for 2025 (classes end Dec 10)
      return {
        startDate: formatDate(9, 3, 2025),  // Sep 3, 2025
        endDate: formatDate(12, 10, 2025)  // Dec 10, 2025
      };
    } else if (termName === 'spring2026' || termName.includes('Spring')) {
      console.log('Detected Spring semester');
      // Spring semester dates for 2026
      return {
        startDate: formatDate(1, 20, 2026),  // Jan 20, 2026
        endDate: formatDate(5, 1, 2026)  // May 1, 2026
      };
    } else if (termName === 'summer2026' || termName.includes('Summer')) {
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
          endDate: formatDate(12, 10, 2025)  // Dec 10, 2025
        };
      }
    }
  }
  
  console.log('No term name provided or not recognized, defaulting to Fall 2025');
  // Default to Fall 2025 semester if term name is not recognized (classes end Dec 10)
  return {
    startDate: formatDate(9, 3, 2025),  // Sep 3, 2025
    endDate: formatDate(12, 10, 2025)  // Dec 10, 2025
  };
}

// Helper function to convert month number to name (0-based index to month name)
function monthNumberToName(monthNumber) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[monthNumber - 1] || 'Jan'; // Subtract 1 because months array is 0-indexed but our input is 1-indexed
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
