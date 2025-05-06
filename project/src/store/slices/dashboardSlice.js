import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { getStudentAttendanceSummary } from '../../utils/attendanceValidation';

export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchData',
  async () => {
    try {
      const today = new Date();
      const startToday = startOfDay(today).toISOString();
      const endToday = endOfDay(today).toISOString();
      const last7Days = subDays(today, 7).toISOString();

      // Fetch today's attendance
      const attendanceRef = collection(db, 'attendance');
      const todayQuery = query(
        attendanceRef,
        where('date', '>=', startToday),
        where('date', '<=', endToday)
      );
      const todaySnapshot = await getDocs(todayQuery);
      const todayAttendance = todaySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          recordId: data.recordId || uuidv4(),
          ...data,
          timestamp: data.timestamp?.seconds ? data.timestamp.seconds * 1000 : Date.now(),
          date: data.date || new Date().toISOString(),
          updatedAt: data.updatedAt?.seconds ? new Date(data.updatedAt.seconds * 1000).toISOString() : new Date().toISOString(),
          updateId: uuidv4()
        };
      });

      // Fetch last 7 days attendance
      const trendQuery = query(
        attendanceRef,
        where('date', '>=', last7Days),
        orderBy('date', 'desc')
      );
      const trendSnapshot = await getDocs(trendQuery);
      const attendanceTrends = trendSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          recordId: data.recordId || uuidv4(),
          ...data,
          timestamp: data.timestamp?.seconds ? data.timestamp.seconds * 1000 : Date.now(),
          date: data.date || new Date().toISOString(),
          updatedAt: data.updatedAt?.seconds ? new Date(data.updatedAt.seconds * 1000).toISOString() : new Date().toISOString(),
          updateId: uuidv4()
        };
      });

      // Fetch recent activities
      const recentQuery = query(
        attendanceRef,
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      const recentSnapshot = await getDocs(recentQuery);
      const recentActivities = recentSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          recordId: data.recordId || uuidv4(),
          ...data,
          timestamp: data.timestamp?.seconds ? data.timestamp.seconds * 1000 : Date.now(),
          date: data.date || new Date().toISOString(),
          updatedAt: data.updatedAt?.seconds ? new Date(data.updatedAt.seconds * 1000).toISOString() : new Date().toISOString(),
          updateId: uuidv4()
        };
      });

      // Calculate student summaries
      const studentSummaries = new Map();
      attendanceTrends.forEach(record => {
        if (!studentSummaries.has(record.studentId)) {
          studentSummaries.set(record.studentId, []);
        }
        studentSummaries.get(record.studentId).push(record);
      });

      const studentStats = Array.from(studentSummaries.entries()).map(([studentId, records]) => {
        const summary = getStudentAttendanceSummary(records);
        return {
          studentId,
          studentName: records[0].studentName,
          batchId: records[0].batchId,
          batchName: records[0].batchName,
          ...summary,
          summaryId: uuidv4(),
          updateId: uuidv4()
        };
      });

      return {
        todayAttendance,
        attendanceTrends,
        recentActivities,
        studentStats,
        fetchId: uuidv4()
      };
    } catch (error) {
      throw error;
    }
  }
);

const initialState = {
  todayAttendance: [],
  attendanceTrends: [],
  recentActivities: [],
  studentStats: [],
  loading: false,
  error: null,
  stats: {
    todayPresent: 0,
    todayAbsent: 0,
    todayTotal: 0,
    weeklyAverage: 0,
    onlinePresent: 0,
    offlinePresent: 0,
    atRiskStudents: 0,
    requiresAttention: 0,
    lastUpdateId: null
  }
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    updateStats: (state) => {
      const todayPresent = state.todayAttendance.filter(record => record.status === 'present').length;
      const todayTotal = state.todayAttendance.length;
      
      const onlinePresent = state.todayAttendance.filter(record => 
        record.status === 'present' && record.mode === 'online'
      ).length;
      const offlinePresent = state.todayAttendance.filter(record => 
        record.status === 'present' && record.mode === 'offline'
      ).length;
      
      const weeklyPresent = state.attendanceTrends.filter(record => record.status === 'present').length;
      const weeklyTotal = state.attendanceTrends.length;

      const atRiskStudents = state.studentStats.filter(student => student.isAtRisk).length;
      const requiresAttention = state.studentStats.filter(student => student.requiresAttention).length;
      
      state.stats = {
        todayPresent,
        todayAbsent: todayTotal - todayPresent,
        todayTotal,
        weeklyAverage: weeklyTotal ? (weeklyPresent / weeklyTotal) * 100 : 0,
        onlinePresent,
        offlinePresent,
        atRiskStudents,
        requiresAttention,
        lastUpdateId: uuidv4()
      };
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.todayAttendance = action.payload.todayAttendance;
        state.attendanceTrends = action.payload.attendanceTrends;
        state.recentActivities = action.payload.recentActivities;
        state.studentStats = action.payload.studentStats;
        
        const todayPresent = action.payload.todayAttendance.filter(record => record.status === 'present').length;
        const todayTotal = action.payload.todayAttendance.length;
        const onlinePresent = action.payload.todayAttendance.filter(record => 
          record.status === 'present' && record.mode === 'online'
        ).length;
        const offlinePresent = action.payload.todayAttendance.filter(record => 
          record.status === 'present' && record.mode === 'offline'
        ).length;
        const weeklyPresent = action.payload.attendanceTrends.filter(record => record.status === 'present').length;
        const weeklyTotal = action.payload.attendanceTrends.length;
        
        const atRiskStudents = action.payload.studentStats.filter(student => student.isAtRisk).length;
        const requiresAttention = action.payload.studentStats.filter(student => student.requiresAttention).length;
        
        state.stats = {
          todayPresent,
          todayAbsent: todayTotal - todayPresent,
          todayTotal,
          weeklyAverage: weeklyTotal ? (weeklyPresent / weeklyTotal) * 100 : 0,
          onlinePresent,
          offlinePresent,
          atRiskStudents,
          requiresAttention,
          lastUpdateId: action.payload.fetchId
        };
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});

export const { updateStats } = dashboardSlice.actions;
export default dashboardSlice.reducer;