import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { startOfDay, endOfDay } from 'date-fns';
import { ATTENDANCE_WINDOW } from './attendanceValidation';
import { toast } from 'react-toastify';

export const markAbsentStudents = async () => {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Only run after attendance window closes
    if (currentHour < ATTENDANCE_WINDOW.END_HOUR) {
      return {
        success: false,
        error: `Can only mark absent after ${ATTENDANCE_WINDOW.END_HOUR}:00`
      };
    }

    const today = startOfDay(now);
    const todayEnd = endOfDay(now);

    // Get all batches
    const batchesRef = collection(db, 'batches');
    const batchesSnapshot = await getDocs(batchesRef);
    const batches = batchesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).filter(batch => batch.students?.length > 0);

    if (batches.length === 0) {
      return {
        success: false,
        error: 'No active batches found'
      };
    }

    // Get today's attendance records
    const attendanceRef = collection(db, 'attendance');
    const attendanceQuery = query(
      attendanceRef,
      where('date', '>=', today.toISOString()),
      where('date', '<=', todayEnd.toISOString())
    );
    const attendanceSnapshot = await getDocs(attendanceQuery);
    const attendanceRecords = attendanceSnapshot.docs.map(doc => doc.data());

    let markedCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process each batch
    for (const batch of batches) {
      // Get students who already have attendance
      const studentsWithAttendance = new Set(
        attendanceRecords
          .filter(record => record.batchId === batch.id)
          .map(record => record.studentId)
      );

      // Find students without attendance
      const absentStudents = batch.students.filter(
        student => !studentsWithAttendance.has(student.id)
      );

      if (absentStudents.length === 0) continue;

      // Mark absent for each student
      for (const student of absentStudents) {
        try {
          const attendanceData = {
            batchId: batch.id,
            batchName: batch.name,
            studentId: student.id,
            studentName: student.name,
            date: now.toISOString(),
            status: 'absent',
            mode: student.mode || 'offline',
            markedBySystem: true,
            autoMarked: true,
            timestamp: serverTimestamp(),
            reason: 'No attendance marked during window hours',
            markedAt: {
              hour: currentHour,
              minute: now.getMinutes()
            }
          };

          await addDoc(collection(db, 'attendance'), attendanceData);
          markedCount++;
        } catch (error) {
          errorCount++;
          errors.push({
            student: student.name,
            error: error.message
          });
          console.error(`Failed to mark absent for student ${student.name}:`, error);
        }
      }
    }

    if (markedCount === 0 && errorCount === 0) {
      return {
        success: true,
        message: 'All students have already been marked for attendance'
      };
    }

    if (errorCount > 0) {
      return {
        success: false,
        error: `Marked ${markedCount} students, but failed for ${errorCount} students`,
        details: errors
      };
    }

    return {
      success: true,
      message: `Successfully marked ${markedCount} students as absent`
    };
  } catch (error) {
    console.error('Error in markAbsentStudents:', error);
    return {
      success: false,
      error: 'Failed to process auto-absent marking',
      details: error.message
    };
  }
};

// Function to check and mark absent students periodically
export const startAutoAbsentMarking = () => {
  const checkAndMarkAbsent = async () => {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Only run after attendance window closes
    if (currentHour === ATTENDANCE_WINDOW.END_HOUR) {
      const result = await markAbsentStudents();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error);
      }
    }
  };

  // Check every hour
  setInterval(checkAndMarkAbsent, 60 * 60 * 1000);
  
  // Also check immediately in case we're starting right at the end of window
  checkAndMarkAbsent();
};