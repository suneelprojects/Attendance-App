import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { collection, getDocs, query, orderBy, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { v4 as uuidv4 } from 'uuid';

// Fetch all batches
export const fetchBatches = createAsyncThunk(
  'batches/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const batchesRef = collection(db, 'batches');
      const q = query(batchesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          batchId: data.batchId || uuidv4(),
          ...data,
          createdAt: data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now(),
          updatedAt: data.updatedAt?.seconds ? data.updatedAt.seconds * 1000 : Date.now(),
          students: (data.students || []).map(student => ({
            ...student,
            studentId: student.studentId || uuidv4(),
            registrationId: student.registrationId || uuidv4(),
            updateId: uuidv4()
          })),
          tutor: data.tutor || null,
          updateId: uuidv4()
        };
      });
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Add a new batch
export const addNewBatch = createAsyncThunk(
  'batches/addBatch',
  async (batchData, { rejectWithValue }) => {
    try {
      const timestamp = serverTimestamp();
      const newBatch = {
        ...batchData,
        batchId: uuidv4(),
        registrationToken: uuidv4(),
        createdAt: timestamp,
        updatedAt: timestamp,
        students: (batchData.students || []).map(student => ({
          ...student,
          studentId: student.studentId || uuidv4(),
          registrationId: uuidv4(),
          registeredAt: new Date().toISOString(),
          updateId: uuidv4()
        })),
        tutor: batchData.tutor || null
      };
      const docRef = await addDoc(collection(db, 'batches'), newBatch);
      return { 
        ...newBatch, 
        id: docRef.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        updateId: uuidv4()
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Update an existing batch
export const updateExistingBatch = createAsyncThunk(
  'batches/updateBatch',
  async ({ id, batchData }, { rejectWithValue }) => {
    try {
      const batchRef = doc(db, 'batches', id);
      
      // Create a serializable version for Redux store
      const reduxData = {
        ...batchData,
        updatedAt: Date.now(),
        students: (batchData.students || []).map(student => ({
          ...student,
          studentId: student.studentId || uuidv4(),
          registrationId: student.registrationId || uuidv4(),
          updateId: uuidv4()
        })),
        tutor: batchData.tutor || null,
        updateId: uuidv4()
      };

      // Create Firestore version with serverTimestamp
      const firestoreData = {
        ...batchData,
        updatedAt: serverTimestamp(),
        students: reduxData.students,
        tutor: reduxData.tutor
      };

      await updateDoc(batchRef, firestoreData);
      
      return { 
        id,
        ...reduxData,
        createdAt: batchData.createdAt || Date.now()
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Delete a batch
export const deleteExistingBatch = createAsyncThunk(
  'batches/deleteBatch',
  async (batchId, { rejectWithValue }) => {
    try {
      const batchRef = doc(db, 'batches', batchId);
      await deleteDoc(batchRef);
      return { batchId, deleteId: uuidv4() };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  batches: [],
  loading: false,
  error: null,
  stats: {
    totalBatches: 0,
    totalStudents: 0,
    onlineStudents: 0,
    offlineStudents: 0,
    activeBatches: 0,
    lastUpdateId: null
  }
};

const batchSlice = createSlice({
  name: 'batches',
  initialState,
  reducers: {
    updateBatchStats: (state) => {
      state.stats = {
        totalBatches: state.batches.length,
        totalStudents: state.batches.reduce((acc, batch) => acc + (batch.students?.length || 0), 0),
        onlineStudents: state.batches.reduce((acc, batch) => 
          acc + (batch.students?.filter(s => s.mode === 'online').length || 0), 0),
        offlineStudents: state.batches.reduce((acc, batch) => 
          acc + (batch.students?.filter(s => s.mode === 'offline').length || 0), 0),
        activeBatches: state.batches.filter(batch => batch.students?.length > 0).length,
        lastUpdateId: uuidv4()
      };
    },
    setBatches: (state, action) => {
      state.batches = action.payload.map(batch => ({
        ...batch,
        batchId: batch.batchId || uuidv4(),
        students: (batch.students || []).map(student => ({
          ...student,
          studentId: student.studentId || uuidv4(),
          registrationId: student.registrationId || uuidv4(),
          updateId: uuidv4()
        })),
        tutor: batch.tutor || null,
        updateId: uuidv4()
      }));
      state.loading = false;
      state.error = null;
      state.stats = {
        totalBatches: action.payload.length,
        totalStudents: action.payload.reduce((acc, batch) => acc + (batch.students?.length || 0), 0),
        onlineStudents: action.payload.reduce((acc, batch) => 
          acc + (batch.students?.filter(s => s.mode === 'online').length || 0), 0),
        offlineStudents: action.payload.reduce((acc, batch) => 
          acc + (batch.students?.filter(s => s.mode === 'offline').length || 0), 0),
        activeBatches: action.payload.filter(batch => batch.students?.length > 0).length,
        lastUpdateId: uuidv4()
      };
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBatches.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBatches.fulfilled, (state, action) => {
        state.loading = false;
        state.batches = action.payload;
        state.stats = {
          totalBatches: action.payload.length,
          totalStudents: action.payload.reduce((acc, batch) => acc + (batch.students?.length || 0), 0),
          onlineStudents: action.payload.reduce((acc, batch) => 
            acc + (batch.students?.filter(s => s.mode === 'online').length || 0), 0),
          offlineStudents: action.payload.reduce((acc, batch) => 
            acc + (batch.students?.filter(s => s.mode === 'offline').length || 0), 0),
          activeBatches: action.payload.filter(batch => batch.students?.length > 0).length,
          lastUpdateId: uuidv4()
        };
      })
      .addCase(fetchBatches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addNewBatch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addNewBatch.fulfilled, (state, action) => {
        state.loading = false;
        state.batches.unshift(action.payload);
        state.stats = {
          totalBatches: state.batches.length,
          totalStudents: state.batches.reduce((acc, batch) => acc + (batch.students?.length || 0), 0),
          onlineStudents: state.batches.reduce((acc, batch) => 
            acc + (batch.students?.filter(s => s.mode === 'online').length || 0), 0),
          offlineStudents: state.batches.reduce((acc, batch) => 
            acc + (batch.students?.filter(s => s.mode === 'offline').length || 0), 0),
          activeBatches: state.batches.filter(batch => batch.students?.length > 0).length,
          lastUpdateId: action.payload.updateId
        };
      })
      .addCase(addNewBatch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateExistingBatch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateExistingBatch.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.batches.findIndex(batch => batch.id === action.payload.id);
        if (index !== -1) {
          state.batches[index] = action.payload;
        }
        state.stats = {
          totalBatches: state.batches.length,
          totalStudents: state.batches.reduce((acc, batch) => acc + (batch.students?.length || 0), 0),
          onlineStudents: state.batches.reduce((acc, batch) => 
            acc + (batch.students?.filter(s => s.mode === 'online').length || 0), 0),
          offlineStudents: state.batches.reduce((acc, batch) => 
            acc + (batch.students?.filter(s => s.mode === 'offline').length || 0), 0),
          activeBatches: state.batches.filter(batch => batch.students?.length > 0).length,
          lastUpdateId: action.payload.updateId
        };
      })
      .addCase(updateExistingBatch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteExistingBatch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteExistingBatch.fulfilled, (state, action) => {
        state.loading = false;
        state.batches = state.batches.filter(batch => batch.id !== action.payload.batchId);
        state.stats = {
          totalBatches: state.batches.length,
          totalStudents: state.batches.reduce((acc, batch) => acc + (batch.students?.length || 0), 0),
          onlineStudents: state.batches.reduce((acc, batch) => 
            acc + (batch.students?.filter(s => s.mode === 'online').length || 0), 0),
          offlineStudents: state.batches.reduce((acc, batch) => 
            acc + (batch.students?.filter(s => s.mode === 'offline').length || 0), 0),
          activeBatches: state.batches.filter(batch => batch.students?.length > 0).length,
          lastUpdateId: action.payload.deleteId
        };
      })
      .addCase(deleteExistingBatch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { updateBatchStats, setBatches } = batchSlice.actions;
export default batchSlice.reducer;