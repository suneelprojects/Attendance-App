import React, { Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useDispatch, useSelector } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { auth, db } from './firebase/config';
import { setUser, setLoading } from './store/slices/authSlice';
import { setBatches } from './store/slices/batchSlice';
import { setAttendance } from './store/slices/attendanceSlice';
import { fetchDashboardData } from './store/slices/dashboardSlice';
import { startAutoAbsentMarking } from './utils/autoAbsentMarking';
import AdminLayout from './layouts/AdminLayout';
import Login from './components/auth/Login';
import PrivateRoute from './components/auth/PrivateRoute';
import CustomLoader from './components/shared/CustomLoader';

// Lazy load components
const AdminDashboard = React.lazy(() => import('./components/admin/Dashboard'));
const BatchManagement = React.lazy(() => import('./components/admin/BatchManagement'));
const Courses = React.lazy(() => import('./components/admin/Courses'));
const Schedule = React.lazy(() => import('./components/admin/Schedule'));
const Attendance = React.lazy(() => import('./components/admin/Attendance'));
const SharedDeviceAttendance = React.lazy(() => import('./components/student/SharedDeviceAttendance'));
const StudentAttendance = React.lazy(() => import('./components/student/StudentAttendance'));
const StudentRegistration = React.lazy(() => import('./components/student/Registration'));
const AttendanceHistory = React.lazy(() => import('./components/student/AttendanceHistory'));
const ResetData = React.lazy(() => import('./components/admin/ResetData'));
const NotFound = React.lazy(() => import('./components/shared/NotFound'));

// Error Boundary
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Lazy load error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600">Please try refreshing the page.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const dispatch = useDispatch();
  const { user, loading } = useSelector(state => state.auth);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    // Start auto absent marking when app initializes
    startAutoAbsentMarking();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      try {
        if (currentUser && currentUser.email.endsWith('@admin.com')) {
          dispatch(setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            isAdmin: true
          }));
        } else {
          dispatch(setUser(null));
        }
      } catch (error) {
        console.error('Auth error:', error);
        toast.error('Authentication failed. Please try again.');
      } finally {
        dispatch(setLoading(false));
        setAuthInitialized(true);
      }
    }, (error) => {
      console.error('Auth listener error:', error);
      toast.error('Authentication error. Please check your connection.');
      dispatch(setLoading(false));
      setAuthInitialized(true);
    });

    return () => unsubscribe();
  }, [dispatch]);

  useEffect(() => {
    if (user?.isAdmin && authInitialized) {
      const batchesRef = collection(db, 'batches');
      const attendanceRef = collection(db, 'attendance');

      const batchesUnsubscribe = onSnapshot(
        query(batchesRef, orderBy('createdAt', 'desc')),
        (snapshot) => {
          try {
            const batches = snapshot.docs.map(doc => {
              const data = doc.data();
              if (!data.createdAt || !data.updatedAt) {
                console.warn(`Batch ${doc.id} missing timestamps`);
              }
              return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now(),
                updatedAt: data.updatedAt?.seconds ? data.updatedAt.seconds * 1000 : Date.now()
              };
            });
            dispatch(setBatches(batches));
          } catch (error) {
            console.error('Error processing batches:', error);
            toast.error('Failed to sync batches.');
          }
        },
        (error) => {
          console.error('Batches listener error:', error);
          toast.error('Error syncing batches.');
        }
      );

      const attendanceUnsubscribe = onSnapshot(
        query(attendanceRef, orderBy('timestamp', 'desc')),
        (snapshot) => {
          try {
            const records = snapshot.docs.map(doc => {
              const data = doc.data();
              if (!data.timestamp) {
                console.warn(`Attendance ${doc.id} missing timestamp`);
              }
              return {
                id: doc.id,
                ...data,
                timestamp: data.timestamp?.seconds ? data.timestamp.seconds * 1000 : Date.now()
              };
            });
            dispatch(setAttendance(records));
            dispatch(fetchDashboardData());
          } catch (error) {
            console.error('Error processing attendance:', error);
            toast.error('Failed to sync attendance.');
          }
        },
        (error) => {
          console.error('Attendance listener error:', error);
          toast.error('Error syncing attendance.');
        }
      );

      return () => {
        batchesUnsubscribe();
        attendanceUnsubscribe();
      };
    }
  }, [user?.isAdmin, authInitialized, dispatch]);

  if (loading || !authInitialized) {
    return <CustomLoader />;
  }

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        limit={3}
        enableMultiContainer={false}
        containerId="default"
      />
      <Suspense fallback={<CustomLoader />}>
        <ErrorBoundary>
          <Routes>
            {/* Public routes */}
            <Route
              path="/login"
              element={
                user?.isAdmin ? <Navigate to="/admin" replace /> : <Login />
              }
            />

            {/* Student routes - Public */}
            <Route path="/student/attendance/:batchId" element={<StudentAttendance />} />
            <Route path="/student/shared-attendance/:batchId" element={<SharedDeviceAttendance />} />
            <Route path="/student/register/:batchId/:registrationToken" element={<StudentRegistration />} />
            <Route path="/student/attendance/history/:studentId" element={<AttendanceHistory />} />

            {/* Admin routes - Private */}
            <Route
              path="/admin"
              element={
                <PrivateRoute>
                  <AdminLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="batches" element={<BatchManagement />} />
              <Route path="courses" element={<Courses />} />
              <Route path="schedule" element={<Schedule />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="shared-attendance" element={<SharedDeviceAttendance />} />
              <Route path="reset" element={<ResetData />} />
            </Route>

            {/* Root redirect */}
            <Route
              path="/"
              element={
                <Navigate
                  to={user?.isAdmin ? "/admin" : "/login"}
                  replace
                />
              }
            />

            {/* 404 route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </Suspense>
    </>
  );
}

export default App;