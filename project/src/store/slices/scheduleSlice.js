import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { v4 as uuidv4 } from 'uuid';

export const fetchStudentHistory = createAsyncThunk(
  'schedule/fetchStudentHistory',
  async ({ batchId, studentId }, { rejectWithValue }) => {
    try {
      const attendanceRef = collection(db, 'attendance');
      const q = query(
        attendanceRef,
        where('batchId', '==', batchId),
        where('studentId', '==', studentId)
      );

      const querySnapshot = await getDocs(q);
      const history = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          recordId: data.recordId || uuidv4(),
          ...data,
          timestamp: data.timestamp?.toMillis() || Date.now(),
          studentId: data.studentId,
          batchId: data.batchId,
          updateId: uuidv4()
        };
      }).sort((a, b) => new Date(b.date) - new Date(a.date));

      // Calculate stats
      const total = history.length;
      const present = history.filter(record => record.status === 'present').length;
      const adminMarked = history.filter(record => record.markedByAdmin).length;
      const offline = history.filter(record => record.mode === 'offline' && record.status === 'present').length;

      return {
        history,
        stats: {
          total,
          present,
          absent: total - present,
          percentage: total > 0 ? (present / total) * 100 : 0,
          adminMarked,
          offline,
          summaryId: uuidv4(),
          studentId,
          batchId,
          fetchId: uuidv4()
        }
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  history: [],
  loading: false,
  error: null,
  stats: {
    total: 0,
    present: 0,
    absent: 0,
    percentage: 0,
    adminMarked: 0,
    offline: 0,
    summaryId: null,
    studentId: null,
    batchId: null,
    lastUpdateId: null
  }
};

const scheduleSlice = createSlice({
  name: 'schedule',
  initialState,
  reducers: {
    clearHistory: (state) => {
      state.history = [];
      state.stats = { ...initialState.stats };
      state.error = null;
    },
    updateHistory: (state, action) => {
      const newRecord = {
        ...action.payload,
        recordId: action.payload.recordId || uuidv4(),
        updateId: uuidv4()
      };
      
      if (!state.history.some(record => record.id === newRecord.id)) {
        state.history.unshift(newRecord);
        
        // Recalculate stats
        const total = state.history.length;
        const present = state.history.filter(record => record.status === 'present').length;
        const adminMarked = state.history.filter(record => record.markedByAdmin).length;
        const offline = state.history.filter(record => record.mode === 'offline' && record.status === 'present').length;

        state.stats = {
          total,
          present,
          absent: total - present,
          percentage: total > 0 ? (present / total) * 100 : 0,
          adminMarked,
          offline,
          summaryId: uuidv4(),
          studentId: newRecord.studentId,
          batchId: newRecord.batchId,
          lastUpdateId: newRecord.updateId
        };
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudentHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStudentHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.history = action.payload.history;
        state.stats = {
          ...action.payload.stats,
          lastUpdateId: action.payload.stats.fetchId
        };
      })
      .addCase(fetchStudentHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.history = [];
        state.stats = { ...initialState.stats };
      });
  }
});

export const { clearHistory, updateHistory } = scheduleSlice.actions;
export default scheduleSlice.reducer;