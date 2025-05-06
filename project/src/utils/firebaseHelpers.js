import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

export const fetchBatchAttendance = async (batchId, date) => {
  try {
    const start = startOfDay(date);
    const end = endOfDay(date);
    
    const attendanceRef = collection(db, 'attendance');
    const q = query(
      attendanceRef,
      where('batchId', '==', batchId),
      where('date', '>=', start.toISOString()),
      where('date', '<=', end.toISOString()),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      recordId: doc.data().recordId || uuidv4(),
      updateId: uuidv4()
    }));
  } catch (error) {
    console.error('Error fetching batch attendance:', error);
    throw error;
  }
};

export const fetchStudentAttendance = async (studentId, batchId) => {
  try {
    const attendanceRef = collection(db, 'attendance');
    const q = query(
      attendanceRef,
      where('studentId', '==', studentId),
      where('batchId', '==', batchId),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      recordId: doc.data().recordId || uuidv4(),
      updateId: uuidv4()
    }));
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    throw error;
  }
};

export const fetchRecentActivity = async (limit = 10) => {
  try {
    const attendanceRef = collection(db, 'attendance');
    const q = query(
      attendanceRef,
      orderBy('timestamp', 'desc'),
      limit(limit)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      recordId: doc.data().recordId || uuidv4(),
      updateId: uuidv4()
    }));
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    throw error;
  }
};

export const fetchAttendanceStats = async (batchId) => {
  try {
    const today = new Date();
    const last7Days = subDays(today, 7);
    
    const attendanceRef = collection(db, 'attendance');
    const q = query(
      attendanceRef,
      where('batchId', '==', batchId),
      where('date', '>=', last7Days.toISOString()),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    const records = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      recordId: doc.data().recordId || uuidv4(),
      updateId: uuidv4()
    }));

    return {
      total: records.length,
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      online: records.filter(r => r.mode === 'online').length,
      offline: records.filter(r => r.mode === 'offline').length,
      adminMarked: records.filter(r => r.markedByAdmin).length,
      deviceMarked: records.filter(r => r.deviceId).length,
      locationVerified: records.filter(r => r.location?.lat && r.location?.lng).length,
      updateId: uuidv4()
    };
  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    throw error;
  }
};