import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import batchReducer from './slices/batchSlice';
import attendanceReducer from './slices/attendanceSlice';
import scheduleReducer from './slices/scheduleSlice';
import dashboardReducer from './slices/dashboardSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    batches: batchReducer,
    attendance: attendanceReducer,
    schedule: scheduleReducer,
    dashboard: dashboardReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these actions for serialization checks
        ignoredActions: [
          // Auth actions
          'auth/setUser',
          'auth/updateSession',
          'auth/setLoading',
          'auth/setError',
          'auth/clearError',
          'auth/logout',
          // Attendance actions
          'attendance/addAttendanceRecord',
          'attendance/setAttendance',
          'attendance/clearAttendance',
          'attendance/updateAttendanceStatus/fulfilled',
          'attendance/fetchAllAttendance/fulfilled',
          'attendance/fetchTodayAttendance/fulfilled',
          // Dashboard actions
          'dashboard/fetchData/fulfilled',
          'dashboard/updateStats',
          // Schedule actions
          'schedule/updateHistory',
          'schedule/clearHistory',
          'schedule/fetchStudentHistory/fulfilled',
          // Batch actions
          'batches/addBatch/fulfilled',
          'batches/updateBatch/fulfilled',
          'batches/deleteBatch/fulfilled',
          'batches/setBatches',
          'batches/updateBatchStats'
        ],
        // Ignore these paths in actions
        ignoredActionPaths: [
          'meta.arg',
          'payload.arg',
          'payload.timestamp',
          'payload.createdAt',
          'payload.updatedAt',
          'payload.date',
          'payload.serverTimestamp',
          'payload.location',
          'payload.deviceInfo',
          'payload.updateId',
          'payload.recordId',
          'payload.summaryId',
          'payload.fetchId',
          'payload.session',
          'payload.lastAction'
        ],
        // Ignore these paths in state
        ignoredPaths: [
          'auth.session',
          'auth.lastAction',
          'attendance.allRecords',
          'attendance.todayRecords',
          'attendance.stats.lastUpdateId',
          'dashboard.recentActivities',
          'dashboard.todayAttendance',
          'dashboard.attendanceTrends',
          'dashboard.stats.lastUpdateId',
          'schedule.history',
          'schedule.stats.lastUpdateId',
          'batches.stats.lastUpdateId'
        ]
      },
      immutableCheck: {
        // Ignore these paths for immutability checks
        ignoredPaths: [
          'auth.session',
          'auth.lastAction',
          'attendance.allRecords',
          'attendance.todayRecords',
          'attendance.stats.lastUpdateId',
          'dashboard.recentActivities',
          'dashboard.todayAttendance',
          'dashboard.attendanceTrends',
          'dashboard.stats.lastUpdateId',
          'schedule.history',
          'schedule.stats.lastUpdateId',
          'batches.stats.lastUpdateId'
        ]
      }
    })
});

export default store;