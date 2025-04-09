import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { 
  MapPin, 
  CheckCircle, 
  Users, 
  Calendar,
  Clock,
  BookOpen,
  AlertTriangle,
  Info,
  Smartphone,
  Wifi,
  WifiOff,
  Navigation
} from 'lucide-react';
import { addAttendanceRecord } from '../../store/slices/attendanceSlice';
import { updateHistory } from '../../store/slices/scheduleSlice';
import { db } from '../../firebase/config';
import { 
  collection, 
  doc, 
  getDoc, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs
} from 'firebase/firestore';
import { toast } from 'react-toastify';
import { format, startOfDay, endOfDay } from 'date-fns';

const getDeviceId = () => {
  try {
    const storedId = localStorage.getItem('deviceId');
    if (storedId) return storedId;
    
    const components = [
      navigator.userAgent,
      navigator.platform,
      `${window.screen.width}x${window.screen.height}`,
      window.screen.colorDepth,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.language,
      new Date().toISOString()
    ].filter(Boolean);
    
    const deviceId = btoa(components.join('-'));
    localStorage.setItem('deviceId', deviceId);
    return deviceId;
  } catch (error) {
    console.error('Error generating device ID:', error);
    return `fallback-${Date.now()}-${Math.random()}`;
  }
};

const StudentAttendance = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [batch, setBatch] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [hasMarkedAttendance, setHasMarkedAttendance] = useState(false);
  const [deviceId] = useState(getDeviceId());
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [locationWatchId, setLocationWatchId] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isSecureContext, setIsSecureContext] = useState(window.isSecureContext);
  const [existingAttendance, setExistingAttendance] = useState(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (locationWatchId) {
        navigator.geolocation.clearWatch(locationWatchId);
      }
    };
  }, [locationWatchId]);

  const checkDeviceAttendance = async () => {
    try {
      const today = new Date();
      const startOfDayDate = startOfDay(today);
      const endOfDayDate = endOfDay(today);

      const attendanceRef = collection(db, 'attendance');
      const deviceQuery = query(
        attendanceRef,
        where('batchId', '==', batchId),
        where('deviceId', '==', deviceId),
        where('date', '>=', startOfDayDate.toISOString()),
        where('date', '<=', endOfDayDate.toISOString())
      );

      const deviceSnapshot = await getDocs(deviceQuery);
      if (!deviceSnapshot.empty) {
        const attendanceData = deviceSnapshot.docs[0].data();
        setExistingAttendance(attendanceData);
        setHasMarkedAttendance(true);
        return { exists: true, message: 'This device has already been used to mark attendance today' };
      }
      return { exists: false };
    } catch (error) {
      console.error('Error checking device attendance:', error);
      return { exists: false, error };
    }
  };

  const checkStudentAttendance = async (studentId) => {
    try {
      const today = new Date();
      const startOfDayDate = startOfDay(today);
      const endOfDayDate = endOfDay(today);

      const attendanceRef = collection(db, 'attendance');
      const studentQuery = query(
        attendanceRef,
        where('batchId', '==', batchId),
        where('studentId', '==', studentId),
        where('date', '>=', startOfDayDate.toISOString()),
        where('date', '<=', endOfDayDate.toISOString())
      );

      const studentSnapshot = await getDocs(studentQuery);
      if (!studentSnapshot.empty) {
        const attendanceData = studentSnapshot.docs[0].data();
        setExistingAttendance(attendanceData);
        setHasMarkedAttendance(true);
        return { exists: true, message: 'You have already marked attendance today' };
      }
      return { exists: false };
    } catch (error) {
      console.error('Error checking student attendance:', error);
      return { exists: false, error };
    }
  };

  useEffect(() => {
    const fetchBatchDetails = async () => {
      try {
        if (!batchId) {
          toast.error('Invalid attendance link');
          navigate('/404');
          return;
        }

        const batchRef = doc(db, 'batches', batchId);
        const batchDoc = await getDoc(batchRef);
        
        if (!batchDoc.exists()) {
          toast.error('Invalid batch ID or batch not found');
          navigate('/404');
          return;
        }

        const batchData = { id: batchDoc.id, ...batchDoc.data() };
        setBatch(batchData);

        // Check if device has already marked attendance today
        const deviceCheck = await checkDeviceAttendance();
        if (deviceCheck.exists) {
          toast.error(deviceCheck.message);
        }
      } catch (error) {
        console.error('Error fetching batch:', error);
        toast.error('Error loading batch details');
        navigate('/404');
      } finally {
        setLoading(false);
      }
    };

    fetchBatchDetails();
  }, [batchId, deviceId, navigate]);

  useEffect(() => {
    const checkAttendance = async () => {
      if (selectedStudent) {
        const student = JSON.parse(selectedStudent);
        const studentCheck = await checkStudentAttendance(student.id);
        if (studentCheck.exists) {
          toast.error(studentCheck.message);
        }
      }
    };

    checkAttendance();
  }, [selectedStudent, batchId]);

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    if (!isSecureContext) {
      setLocationError('Location services require a secure (HTTPS) connection');
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    try {
      const permissionResult = await navigator.permissions.query({ name: 'geolocation' });
      
      if (permissionResult.state === 'denied') {
        setLocationError('Location access is blocked. Please enable location services in your browser settings.');
        setIsGettingLocation(false);
        return;
      }
    } catch (error) {
      console.warn('Permission check failed:', error);
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    if (locationWatchId) {
      navigator.geolocation.clearWatch(locationWatchId);
    }

    const handleSuccess = (position) => {
      try {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setLocation(newLocation);
        setLocationAccuracy(position.coords.accuracy);
        setIsGettingLocation(false);
        setLocationError(null);
        
        if (position.coords.accuracy <= 20) {
          if (locationWatchId) {
            navigator.geolocation.clearWatch(locationWatchId);
            setLocationWatchId(null);
          }
          toast.success('Location acquired successfully');
        }
      } catch (error) {
        console.error('Error processing location:', error);
        setLocationError('Error processing location data');
        setIsGettingLocation(false);
      }
    };

    const handleError = (error) => {
      console.error('Geolocation error:', error);
      let errorMessage = 'Error getting location. Please try again.';
      
      switch (error.code) {
        case 1:
          errorMessage = 'Location access denied. Please enable location services in your device and browser settings.';
          toast.info('To enable location: Check your browser\'s site settings and device location services.');
          break;
        case 2:
          errorMessage = 'Location information is unavailable. Please check your GPS signal and try again.';
          break;
        case 3:
          errorMessage = 'Location request timed out. Please try again in a better signal area.';
          break;
      }
      
      setLocationError(errorMessage);
      setIsGettingLocation(false);

      if (error.code === 1 && retryCount < 3) {
        setRetryCount(prev => prev + 1);
      }
    };

    try {
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);

      const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, options);
      setLocationWatchId(watchId);

      setTimeout(() => {
        if (locationWatchId === watchId) {
          navigator.geolocation.clearWatch(watchId);
          setLocationWatchId(null);
          if (location && locationAccuracy > 20) {
            toast.warning('Could not get high accuracy location, but current location can be used');
          }
        }
      }, 30000);
    } catch (error) {
      console.error('Geolocation API error:', error);
      setLocationError('Unexpected error accessing location services');
      setIsGettingLocation(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isOnline) {
      toast.error('Please check your internet connection');
      return;
    }

    if (!selectedStudent) {
      toast.error('Please select your name');
      return;
    }

    if (!location) {
      toast.error('Please enable location access');
      return;
    }

    if (locationAccuracy && locationAccuracy > 100) {
      toast.error('Location accuracy is too low. Please try again in a better location');
      return;
    }

    setSubmitting(true);
    try {
      const student = JSON.parse(selectedStudent);
      const today = new Date();

      // Check both device and student attendance
      const deviceCheck = await checkDeviceAttendance();
      if (deviceCheck.exists) {
        toast.error(deviceCheck.message);
        setHasMarkedAttendance(true);
        setSubmitting(false);
        return;
      }

      const studentCheck = await checkStudentAttendance(student.id);
      if (studentCheck.exists) {
        toast.error(studentCheck.message);
        setHasMarkedAttendance(true);
        setSubmitting(false);
        return;
      }

      const attendanceData = {
        batchId,
        batchName: batch.name,
        studentId: student.id,
        studentName: student.name,
        date: today.toISOString(),
        status: 'present',
        location: location,
        locationAccuracy: locationAccuracy,
        mode: student.mode || 'offline',
        deviceId,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          colorDepth: window.screen.colorDepth,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          isMobile: /Mobile|Android|iOS/.test(navigator.userAgent)
        },
        timestamp: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'attendance'), attendanceData);
      
      const recordForRedux = {
        ...attendanceData,
        id: docRef.id,
        timestamp: Date.now()
      };

      dispatch(addAttendanceRecord(recordForRedux));
      dispatch(updateHistory(recordForRedux));

      setHasMarkedAttendance(true);
      setExistingAttendance(attendanceData);
      
      toast.success('Attendance marked successfully!');
    } catch (error) {
      console.error('Error marking attendance:', error);
      if (error.code === 'permission-denied') {
        toast.error('Attendance already marked');
        const deviceCheck = await checkDeviceAttendance();
        const student = JSON.parse(selectedStudent);
        const studentCheck = await checkStudentAttendance(student.id);
        if (deviceCheck.exists || studentCheck.exists) {
          setHasMarkedAttendance(true);
        }
      } else {
        toast.error('Failed to mark attendance. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center p-4">
        <div className="spinner-border text-primary-600" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
            <p className="text-gray-600">The attendance link is invalid or has expired.</p>
          </div>
        </div>
      </div>
    );
  }

  if (hasMarkedAttendance && existingAttendance) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Attendance Already Marked!</h2>
            <p className="text-gray-600 mb-6">You have already marked your attendance for today.</p>
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Batch:</span>
                <span className="font-medium">{existingAttendance.batchName}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span>Student:</span>
                <span className="font-medium">{existingAttendance.studentName}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span>Date:</span>
                <span className="font-medium">{format(new Date(existingAttendance.date), 'PPP')}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span>Time:</span>
                <span className="font-medium">{format(new Date(existingAttendance.date), 'p')}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span>Status:</span>
                <span className="font-medium text-green-600">Present</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
            <h1 className="text-xl font-bold text-white">Mark Attendance</h1>
            <p className="text-white/80 mt-1">Please fill in your attendance details</p>
          </div>

          {!isSecureContext && (
            <div className="bg-yellow-50 p-4 flex items-center">
              <AlertTriangle className="text-yellow-500 mr-2" size={20} />
              <p className="text-yellow-700">
                This site requires a secure (HTTPS) connection for location services.
              </p>
            </div>
          )}

          {!isOnline && (
            <div className="bg-red-50 p-4 flex items-center">
              <WifiOff className="text-red-500 mr-2" size={20} />
              <p className="text-red-700">You are offline. Please check your internet connection.</p>
            </div>
          )}

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <BookOpen className="text-primary-600 mr-2" size={20} />
                  <h3 className="font-medium">Course</h3>
                </div>
                <p className="text-gray-600">{batch.course}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Users className="text-primary-600 mr-2" size={20} />
                  <h3 className="font-medium">Batch</h3>
                </div>
                <p className="text-gray-600">{batch.name}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Calendar className="text-primary-600 mr-2" size={20} />
                  <h3 className="font-medium">Date</h3>
                </div>
                <p className="text-gray-600">{format(new Date(), 'PPP')}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Clock className="text-primary-600 mr-2" size={20} />
                  <h3 className="font-medium">Time</h3>
                </div>
                <p className="text-gray-600">{format(new Date(), 'p')}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Your Name
                </label>
                <select
                  className="form-control"
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  required
                >
                  <option value="">Choose your name</option>
                  {batch?.students?.map(student => (
                    <option key={student.id} value={JSON.stringify(student)}>
                      {student.name} ({student.rollNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Location Access
                  </label>
                  <button
                    type="button"
                    className={`inline-flex items-center px-3 py-1.5 border border-primary-600 text-primary-600 hover:bg-primary-50 rounded-lg text-sm font-medium transition-colors ${
                      isGettingLocation ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={getCurrentLocation}
                    disabled={isGettingLocation || !isSecureContext}
                  >
                    {isGettingLocation ? (
                      <>
                        <Navigation className="animate-spin mr-2" size={16} />
                        Getting Location...
                      </>
                    ) : (
                      <>
                        <MapPin size={16} className="mr-2" />
                        {location ? 'Update Location' : 'Get Location'}
                      </>
                    )}
                  </button>
                </div>

                {locationError && (
                  <div className="mt-2 p-3 bg-red-50 border-l-4 border-red-500 rounded-md">
                    <div className="flex">
                      <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                      <div>
                        <p className="text-sm text-red-700">{locationError}</p>
                        <p className="text-xs text-red-600 mt-1">
                          Please ensure location services are enabled in your device settings.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {location && (
                  <div className="mt-2 p-3 bg-green-50 border-l-4 border-green-500 rounded-md">
                    <div className="flex flex-col">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <p className="text-sm text-green-700">
                          Location acquired successfully
                        </p>
                      </div>
                      <div className="ml-7 mt-1">
                        <p className="text-xs text-green-600">
                          Coordinates: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                        </p>
                        {locationAccuracy && (
                          <p className="text-xs text-green-600">
                            Accuracy: ±{Math.round(locationAccuracy)}m
                            {locationAccuracy > 50 && (
                              <span className="text-yellow-600 ml-1">
                                (Consider updating location for better accuracy)
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-2 p-3 bg-blue-50 border-l-4 border-blue-500 rounded-md">
                  <div className="flex">
                    <Info className="h-5 w-5 text-blue-500 mr-2" />
                    <div className="text-sm text-blue-700">
                      <p>Important Notes:</p>
                      <ul className="list-disc list-inside mt-1 ml-2">
                        <li>Attendance can only be marked once per day</li>
                        <li>Location services must be enabled</li>
                        <li>GPS accuracy should be within 100 meters</li>
                        <li>Stable internet connection required</li>
                        <li>HTTPS connection required for location services</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className={`btn btn-attendance rounded-xl ${
                  submitting ? 'btn-attendance-loading' : ''
                } ${
                  location && isOnline && isSecureContext 
                    ? 'text-white' 
                    : 'from-gray-400 to-gray-500 text-white/90'
                }`}
                disabled={submitting || !location || !selectedStudent || isGettingLocation || !isOnline || !isSecureContext}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border w-6 h-6 border-3" />
                    <span className="ml-2">Marking Attendance...</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-6 h-6" />
                    <span>Mark Attendance</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAttendance;