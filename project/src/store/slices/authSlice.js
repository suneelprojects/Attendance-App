import { createSlice } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

const initialState = {
  user: null,
  isAdmin: false,
  loading: false,
  error: null,
  lastAction: {
    type: null,
    timestamp: null,
    id: null
  },
  session: {
    id: uuidv4(),
    startedAt: Date.now(),
    lastActivity: Date.now()
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAdmin = action.payload?.email?.endsWith('@admin.com') || false;
      state.lastAction = {
        type: 'LOGIN',
        timestamp: Date.now(),
        id: uuidv4()
      };
      state.session.lastActivity = Date.now();
      state.error = null;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
      state.lastAction = {
        type: 'SET_LOADING',
        timestamp: Date.now(),
        id: uuidv4()
      };
      state.session.lastActivity = Date.now();
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.lastAction = {
        type: 'ERROR',
        timestamp: Date.now(),
        id: uuidv4()
      };
      state.session.lastActivity = Date.now();
    },
    clearError: (state) => {
      state.error = null;
      state.lastAction = {
        type: 'CLEAR_ERROR',
        timestamp: Date.now(),
        id: uuidv4()
      };
      state.session.lastActivity = Date.now();
    },
    logout: (state) => {
      state.user = null;
      state.isAdmin = false;
      state.error = null;
      state.lastAction = {
        type: 'LOGOUT',
        timestamp: Date.now(),
        id: uuidv4()
      };
      state.session = {
        id: uuidv4(),
        startedAt: Date.now(),
        lastActivity: Date.now()
      };
    },
    updateSession: (state) => {
      state.session.lastActivity = Date.now();
      state.lastAction = {
        type: 'SESSION_UPDATE',
        timestamp: Date.now(),
        id: uuidv4()
      };
    }
  }
});

export const { 
  setUser, 
  setLoading, 
  setError, 
  clearError, 
  logout,
  updateSession 
} = authSlice.actions;

export default authSlice.reducer;