import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { startOfDay, endOfDay } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

export const updateAttendanceStatus = createAsyncThunk(
  'attendance/updateStatus',
  async ({ attendanceId, newStatus }) => {
    try {
      const attendanceRef = doc(db, 'attendance', attendanceId);
      const updateData = {
        status: newStatus,
        markedByAdmin: true,
        updatedAt: serverTimestamp(),
        updateId: uuidv4(),
        modifiedAt: new Date().toISOString()
      };
      
      await updateDoc(attendanceRef, updateData);
      
      return {
        id: attendanceId,
        ...updateData,
        updatedAt: new Date().toISOString(),
        timestamp: Date.now(),
        recordId: uuidv4()
      };
    } catch (error) {
      throw new Error(`Failed to update attendance: ${error.message}`);
    }
  }
);

export const fetchAllAttendance = createAsyncThunk(
  'attendance/fetchAll',
  async () => {
    try {
      const attendanceRef = collection(db, 'attendance');
      const q = query(attendanceRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          timestamp: data.timestamp?.seconds ? data.timestamp.seconds * 1000 : Date.now(),
          date: data.date?.toDate?.()?.toISOString() || data.date || new Date().toISOString(),
          recordId: data.recordId || uuidv4(),
          updateId: uuidv4()
        };
      });
    } catch (error) {
      throw new Error(`Failed to fetch attendance: ${error.message}`);
    }
  }
);

export const fetchTodayAttendance = createAsyncThunk(
  'attendance/fetchToday',
  async (batchId) => {
    try {
      const attendanceRef = collection(db, 'attendance');
      const today = startOfDay(new Date());
      const tomorrow = endOfDay(new Date());

      const q = query(
        attendanceRef,
        where('batchId', '==', batchId),
        where('date', '>=', today.toISOString()),
        where('date', '<=', tomorrow.toISOString())
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          timestamp: data.timestamp?.seconds ? data.timestamp.seconds * 1000 : Date.now(),
          date: data.date?.toDate?.()?.toISOString() || data.date || new Date().toISOString(),
          recordId: data.recordId || uuidv4(),
          updateId: uuidv4()
        };
      });
    } catch (error) {
      throw new Error(`Failed to fetch today's attendance: ${error.message}`);
    }
  }
);

const initialState = {
  allRecords: [],
  todayRecords: [],
  loading: false,
  error: null,
  stats: {
    present: 0,
    absent: 0,
    total: 0,
    percentage: 0,
    adminMarked: 0,
    deviceMarked: 0,
    locationVerified: 0,
    lastUpdateId: null
  }
};

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    addAttendanceRecord: (state, action) => {
      const newRecord = {
        ...action.payload,
        recordId: uuidv4(),
        updateId: uuidv4(),
        timestamp: Date.now(),
        date: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      state.allRecords.unshift(newRecord);
      state.todayRecords.unshift(newRecord);
      
      state.stats = {
        ...state.stats,
        total: state.stats.total + 1,
        present: newRecord.status === 'present' ? state.stats.present + 1 : state.stats.present,
        absent: newRecord.status === 'absent' ? state.stats.absent + 1 : state.stats.absent,
        adminMarked: newRecord.markedByAdmin ? state.stats.adminMarked + 1 : state.stats.adminMarked,
        deviceMarked: newRecord.deviceId ? state.stats.deviceMarked + 1 : state.stats.deviceMarked,
        locationVerified: (newRecord.location?.lat && newRecord.location?.lng) ? 
          state.stats.locationVerified + 1 : state.stats.locationVerified,
        percentage: ((state.stats.present + (newRecord.status === 'present' ? 1 : 0)) / 
          (state.stats.total + 1)) * 100,
        lastUpdateId: newRecord.updateId
      };
    },
    clearAttendance: (state) => {
      state.todayRecords = [];
      state.stats = { 
        ...initialState.stats,
        lastUpdateId: uuidv4()
      };
    },
    setAttendance: (state, action) => {
      const records = action.payload.map(record => ({
        ...record,
        recordId: record.recordId || uuidv4(),
        updateId: uuidv4(),
        timestamp: record.timestamp || Date.now(),
        date: record.date || new Date().toISOString(),
        updatedAt: record.updatedAt || new Date().toISOString()
      }));

      state.allRecords = records;
      state.loading = false;
      state.error = null;
      
      state.stats = {
        total: records.length,
        present: records.filter(r => r.status === 'present').length,
        absent: records.filter(r => r.status === 'absent').length,
        adminMarked: records.filter(r => r.markedByAdmin).length,
        deviceMarked: records.filter(r => r.deviceId).length,
        locationVerified: records.filter(r => r.location?.lat && r.location?.lng).length,
        percentage: records.length ? 
          (records.filter(r => r.status === 'present').length / records.length) * 100 : 0,
        lastUpdateId: uuidv4()
      };
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllAttendance.fulfilled, (state, action) => {
        const records = action.payload.map(record => ({
          ...record,
          recordId: record.recordId || uuidv4(),
          updateId: uuidv4()
        }));

        state.loading = false;
        state.allRecords = records;
        
        state.stats = {
          total: records.length,
          present: records.filter(r => r.status === 'present').length,
          absent: records.filter(r => r.status === 'absent').length,
          adminMarked: records.filter(r => r.markedByAdmin).length,
          deviceMarked: records.filter(r => r.deviceId).length,
          locationVerified: records.filter(r => r.location?.lat && r.location?.lng).length,
          percentage: records.length ? 
            (records.filter(r => r.status === 'present').length / records.length) * 100 : 0,
          lastUpdateId: uuidv4()
        };
      })
      .addCase(fetchAllAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchTodayAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTodayAttendance.fulfilled, (state, action) => {
        const records = action.payload.map(record => ({
          ...record,
          recordId: record.recordId || uuidv4(),
          updateId: uuidv4()
        }));

        state.loading = false;
        state.todayRecords = records;
        
        state.stats = {
          total: records.length,
          present: records.filter(r => r.status === 'present').length,
          absent: records.filter(r => r.status === 'absent').length,
          adminMarked: records.filter(r => r.markedByAdmin).length,
          deviceMarked: records.filter(r => r.deviceId).length,
          locationVerified: records.filter(r => r.location?.lat && r.location?.lng).length,
          percentage: records.length ? 
            (records.filter(r => r.status === 'present').length / records.length) * 100 : 0,
          lastUpdateId: uuidv4()
        };
      })
      .addCase(fetchTodayAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(updateAttendanceStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAttendanceStatus.fulfilled, (state, action) => {
        state.loading = false;
        
        const updateRecordInList = (records) => {
          const index = records.findIndex(r => r.id === action.payload.id);
          if (index !== -1) {
            records[index] = {
              ...records[index],
              ...action.payload,
              markedByAdmin: true,
              updateId: action.payload.updateId
            };
          }
        };
        
        updateRecordInList(state.allRecords);
        updateRecordInList(state.todayRecords);
        
        const records = state.todayRecords;
        state.stats = {
          total: records.length,
          present: records.filter(r => r.status === 'present').length,
          absent: records.filter(r => r.status === 'absent').length,
          adminMarked: records.filter(r => r.markedByAdmin).length,
          deviceMarked: records.filter(r => r.deviceId).length,
          locationVerified: records.filter(r => r.location?.lat && r.location?.lng).length,
          percentage: records.length ? 
            (records.filter(r => r.status === 'present').length / records.length) * 100 : 0,
          lastUpdateId: action.payload.updateId
        };
      })
      .addCase(updateAttendanceStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});

export const { addAttendanceRecord, clearAttendance, setAttendance } = attendanceSlice.actions;

export default attendanceSlice.reducer;