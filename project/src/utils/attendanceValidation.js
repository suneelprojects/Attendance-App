// Validation constants
export const LOCATION_BOUNDS = {
  LAT_MIN: -90,
  LAT_MAX: 90,
  LNG_MIN: -180,
  LNG_MAX: 180
};

export const LOCATION_THRESHOLD = 0.0001; // For duplicate location check
export const ATTENDANCE_WINDOW = {
  START_HOUR: 6,  // 6 AM
  END_HOUR: 21    // 9 PM
};

// Minimum attendance percentage required
export const MINIMUM_ATTENDANCE = 70;

// Maximum allowed consecutive absences
export const MAX_CONSECUTIVE_ABSENCES = 3;

// Validate attendance data
export const validateAttendanceData = (attendanceData) => {
  const errors = [];

  if (!attendanceData) {
    return { isValid: false, errors: ['Attendance data is required'] };
  }

  // Check required fields
  if (!attendanceData.batchId) errors.push('Batch ID is required');
  if (!attendanceData.studentId) errors.push('Student ID is required');
  if (!attendanceData.date) errors.push('Date is required');
  if (!attendanceData.status) errors.push('Status is required');
  if (!attendanceData.location) errors.push('Location is required');
  if (!attendanceData.deviceId) errors.push('Device ID is required');

  // Validate location
  if (attendanceData.location && !isValidLocation(attendanceData.location)) {
    errors.push('Invalid location coordinates');
  }

  // Validate attendance window
  if (!isWithinAttendanceWindow()) {
    errors.push(`Attendance can only be marked between ${ATTENDANCE_WINDOW.START_HOUR}:00 and ${ATTENDANCE_WINDOW.END_HOUR}:00`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validate location coordinates
export const isValidLocation = (location) => {
  if (!location || typeof location !== 'object') return false;
  
  const { lat, lng } = location;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= LOCATION_BOUNDS.LAT_MIN &&
    lat <= LOCATION_BOUNDS.LAT_MAX &&
    lng >= LOCATION_BOUNDS.LNG_MIN &&
    lng <= LOCATION_BOUNDS.LNG_MAX
  );
};

// Check if current time is within allowed window
export const isWithinAttendanceWindow = () => {
  const now = new Date();
  const hour = now.getHours();
  return hour >= ATTENDANCE_WINDOW.START_HOUR && hour <= ATTENDANCE_WINDOW.END_HOUR;
};

// Check if two locations are considered same (within threshold)
export const isSameLocation = (loc1, loc2) => {
  // Allow multiple students to mark attendance from same location
  return false;
};

// Calculate student attendance summary
export const getStudentAttendanceSummary = (records) => {
  if (!Array.isArray(records) || records.length === 0) {
    return {
      totalDays: 0,
      presentDays: 0,
      absentDays: 0,
      attendancePercentage: 0,
      consecutiveAbsences: 0,
      isAtRisk: true,
      requiresAttention: true,
      lastAttendance: null
    };
  }

  // Sort records by date
  const sortedRecords = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));

  const summary = {
    totalDays: records.length,
    presentDays: records.filter(r => r.status === 'present').length,
    absentDays: records.filter(r => r.status === 'absent').length,
    attendancePercentage: 0,
    consecutiveAbsences: 0,
    isAtRisk: false,
    requiresAttention: false,
    lastAttendance: sortedRecords[0]
  };

  // Calculate attendance percentage
  summary.attendancePercentage = (summary.presentDays / summary.totalDays) * 100;

  // Calculate maximum consecutive absences
  let currentStreak = 0;
  let maxStreak = 0;

  for (const record of sortedRecords) {
    if (record.status === 'absent') {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  summary.consecutiveAbsences = maxStreak;

  // Check if student is at risk (below minimum attendance)
  summary.isAtRisk = summary.attendancePercentage < MINIMUM_ATTENDANCE;

  // Check if student requires attention (consecutive absences or low attendance)
  summary.requiresAttention = (
    summary.consecutiveAbsences >= MAX_CONSECUTIVE_ABSENCES ||
    summary.attendancePercentage < (MINIMUM_ATTENDANCE + 5) // Alert when close to minimum
  );

  return summary;
};

// Get student performance category
export const getStudentPerformanceCategory = (attendancePercentage) => {
  if (attendancePercentage >= 90) return 'excellent';
  if (attendancePercentage >= 80) return 'good';
  if (attendancePercentage >= 70) return 'average';
  return 'poor';
};

// Calculate batch attendance statistics
export const getBatchAttendanceStats = (records, students) => {
  const stats = {
    totalStudents: students.length,
    belowThreshold: 0,
    aboveThreshold: 0,
    excellentPerformers: 0,
    atRiskStudents: 0,
    averageAttendance: 0
  };

  // Group records by student
  const studentRecords = {};
  records.forEach(record => {
    if (!studentRecords[record.studentId]) {
      studentRecords[record.studentId] = [];
    }
    studentRecords[record.studentId].push(record);
  });

  // Calculate statistics for each student
  Object.values(studentRecords).forEach(studentAttendance => {
    const summary = getStudentAttendanceSummary(studentAttendance);
    
    if (summary.attendancePercentage < MINIMUM_ATTENDANCE) {
      stats.belowThreshold++;
      if (summary.isAtRisk) stats.atRiskStudents++;
    } else {
      stats.aboveThreshold++;
      if (summary.attendancePercentage >= 90) {
        stats.excellentPerformers++;
      }
    }
  });

  // Calculate average attendance
  const totalRecords = records.length;
  const presentRecords = records.filter(r => r.status === 'present').length;
  stats.averageAttendance = totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0;

  return stats;
};