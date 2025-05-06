import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { 
  Users, 
  CheckCircle, 
  XCircle,
  Search,
  Monitor,
  Building,
  MapPin,
  Clock,
  AlertTriangle,
  Info,
  Smartphone,
  Filter,
  Calendar,
  UserCheck,
  UserX,
  Map
} from 'lucide-react';
import { format } from 'date-fns';
import { collection, addDoc, query, where, getDocs, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import { validateAttendanceData, isWithinAttendanceWindow } from '../../utils/attendanceValidation';
import CustomLoader from '../shared/CustomLoader';
import AttendanceTimer from '../shared/AttendanceTimer';
import Swal from 'sweetalert2';

const SharedDeviceAttendance = () => {
  const { batches } = useSelector(state => state.batches);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deviceId] = useState(uuidv4());
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [markedStudents, setMarkedStudents] = useState([]);
  const [deviceHistory, setDeviceHistory] = useState([]);
  const [proxyStudents, setProxyStudents] = useState([]);
  const [locationGroups, setLocationGroups] = useState([]);
  const [showLocationStats, setShowLocationStats] = useState(false);

  const courses = [...new Set(batches.map(batch => batch.course))];
  const courseBatches = selectedCourse 
    ? batches.filter(batch => batch.course === selectedCourse)
    : [];

  const groupByLocation = (records) => {
    const groups = {};
    
    records.forEach(record => {
      if (!record.location?.lat || !record.location?.lng) return;
      
      const locationKey = `${record.location.lat.toFixed(3)},${record.location.lng.toFixed(3)}`;
      
      if (!groups[locationKey]) {
        groups[locationKey] = {
          location: {
            lat: record.location.lat,
            lng: record.location.lng
          },
          students: [],
          count: 0
        };
      }
      
      groups[locationKey].students.push({
        id: record.id,
        studentId: record.studentId,
        name: record.studentName,
        time: format(new Date(record.date), 'HH:mm:ss'),
        deviceId: record.deviceId
      });
      groups[locationKey].count++;
    });

    return Object.values(groups).sort((a, b) => b.count - a.count);
  };

  useEffect(() => {
    const getLocation = async () => {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });

        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      } catch (error) {
        console.error('Location error:', error);
        toast.error('Please enable location services');
      }
    };

    getLocation();
  }, []);

  useEffect(() => {
    const fetchBatchDetails = async () => {
      try {
        if (!selectedBatch) {
          setBatch(null);
          setMarkedStudents([]);
          setProxyStudents([]);
          setLocationGroups([]);
          return;
        }

        const selectedBatchData = batches.find(b => b.id === selectedBatch);
        if (!selectedBatchData) {
          throw new Error('Batch not found');
        }

        setBatch(selectedBatchData);

        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        const attendanceRef = collection(db, 'attendance');
        const q = query(
          attendanceRef,
          where('batchId', '==', selectedBatch),
          where('date', '>=', startOfDay),
          where('date', '<=', endOfDay)
        );

        const snapshot = await getDocs(q);
        const records = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        const markedToday = records.map(record => record.studentId);
        setMarkedStudents(markedToday);

        const locationGroups = groupByLocation(records);
        setLocationGroups(locationGroups);

        const deviceRecords = records.filter(record => record.deviceId);
        const groupedByDevice = deviceRecords.reduce((acc, record) => {
          if (!acc[record.deviceId]) {
            acc[record.deviceId] = [];
          }
          acc[record.deviceId].push(record);
          return acc;
        }, {});

        const proxyList = [];
        Object.values(groupedByDevice).forEach(deviceRecords => {
          if (deviceRecords.length > 1) {
            deviceRecords.forEach(record => {
              proxyList.push({
                studentId: record.studentId,
                recordId: record.id,
                deviceId: record.deviceId,
                time: record.date,
                count: deviceRecords.length
              });
            });
          }
        });
        setProxyStudents(proxyList);

        setDeviceHistory(Object.entries(groupedByDevice).map(([deviceId, records]) => ({
          deviceId,
          count: records.length,
          students: records.map(r => ({
            id: r.id,
            studentId: r.studentId,
            name: r.studentName,
            time: format(new Date(r.date), 'HH:mm:ss'),
            location: r.location
          }))
        })));

      } catch (error) {
        console.error('Error fetching batch:', error);
        toast.error(error.message);
        setBatch(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBatchDetails();
  }, [selectedBatch, batches]);

  const handleMarkAbsent = async (students) => {
    try {
      const result = await Swal.fire({
        title: 'Mark Students Absent',
        text: `Are you sure you want to mark ${students.length} students as absent? This will override their current attendance status.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Mark Absent',
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          try {
            const timestamp = serverTimestamp();
            const updatedStudents = [];
            
            for (const student of students) {
              const attendanceRef = doc(db, 'attendance', student.recordId);
              await updateDoc(attendanceRef, {
                status: 'absent',
                markedByAdmin: true,
                updatedAt: timestamp,
                reason: 'Marked absent due to proxy detection'
              });
              updatedStudents.push(student.studentId);
            }

            return { success: true, updatedStudents };
          } catch (error) {
            return { success: false, error };
          }
        }
      });

      if (result.isConfirmed) {
        if (result.value.success) {
          setProxyStudents(prev => 
            prev.filter(p => !result.value.updatedStudents.includes(p.studentId))
          );
          setDeviceHistory(prev => 
            prev.map(device => ({
              ...device,
              students: device.students.filter(s => 
                !result.value.updatedStudents.includes(s.studentId)
              )
            })).filter(device => device.students.length > 0)
          );

          await Swal.fire({
            icon: 'success',
            title: 'Students Marked Absent',
            text: `Successfully marked ${result.value.updatedStudents.length} student(s) as absent`,
            timer: 2000,
            showConfirmButton: false
          });

          const selectedBatchData = batches.find(b => b.id === selectedBatch);
          setBatch(selectedBatchData);
        } else {
          toast.error('Failed to mark students absent');
        }
      }
    } catch (error) {
      console.error('Error marking absent:', error);
      toast.error('Failed to mark students absent');
    }
  };

  const filteredStudents = batch?.students?.filter(student => {
    const searchLower = searchTerm.toLowerCase();
    const notMarkedYet = !markedStudents.includes(student.id);
    return (
      notMarkedYet &&
      (student.name.toLowerCase().includes(searchLower) ||
       student.rollNumber?.toLowerCase().includes(searchLower))
    );
  }) || [];

  const markedStudentsList = batch?.students?.filter(student => 
    markedStudents.includes(student.id) &&
    proxyStudents.some(p => p.studentId === student.id)
  ) || [];

  const isProxyStudent = (studentId) => {
    return proxyStudents.some(p => p.studentId === studentId);
  };

  const getProxyInfo = (studentId) => {
    return proxyStudents.find(p => p.studentId === studentId);
  };

  if (loading) {
    return <CustomLoader />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <AttendanceTimer />
      
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
            <h1 className="text-xl font-bold text-white">Shared Device Attendance</h1>
            <p className="text-white/80 mt-1">Monitor and manage attendance marked from shared devices</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Course
                </label>
                <select
                  className="form-control"
                  value={selectedCourse}
                  onChange={(e) => {
                    setSelectedCourse(e.target.value);
                    setSelectedBatch('');
                  }}
                >
                  <option value="">Choose a course</option>
                  {courses.map(course => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Batch
                </label>
                <select
                  className="form-control"
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  disabled={!selectedCourse}
                >
                  <option value="">Choose a batch</option>
                  {courseBatches.map(batch => (
                    <option key={batch.id} value={batch.id}>{batch.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {batch && (
              <>
                {proxyStudents.length > 0 && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-6">
                    <div className="flex items-start">
                      <AlertTriangle className="text-red-500 mt-0.5 mr-3" />
                      <div>
                        <h3 className="text-sm font-medium text-red-800">Proxy Detection Alert</h3>
                        <p className="text-sm text-red-700 mb-2">
                          {proxyStudents.length} students have been marked from shared devices
                        </p>
                        <button
                          onClick={() => handleMarkAbsent(proxyStudents)}
                          className="btn bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
                        >
                          <UserX size={16} />
                          Mark All as Absent
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold flex items-center">
                        <Map className="mr-2" />
                        Location Statistics
                      </h3>
                      <button
                        onClick={() => setShowLocationStats(!showLocationStats)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {showLocationStats ? 'Hide Details' : 'Show Details'}
                      </button>
                    </div>

                    {showLocationStats && (
                      <div className="space-y-4">
                        {locationGroups.map((group, index) => (
                          <div
                            key={index}
                            className={`p-4 rounded-lg ${
                              group.count > 1 
                                ? 'bg-yellow-50 border border-yellow-200'
                                : 'bg-gray-50 border border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center">
                                <MapPin className={`${
                                  group.count > 1 ? 'text-yellow-600' : 'text-gray-600'
                                } mr-2`} size={20} />
                                <span className="font-medium">Location {index + 1}</span>
                              </div>
                              <span className={`text-sm font-medium ${
                                group.count > 1 ? 'text-yellow-600' : 'text-gray-600'
                              }`}>
                                {group.count} students
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-600 mb-2">
                              Coordinates: {group.location.lat.toFixed(6)}, {group.location.lng.toFixed(6)}
                            </div>

                            <div className="space-y-2">
                              {group.students.map((student, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm bg-white p-2 rounded">
                                  <div className="flex items-center">
                                    <span className="font-medium">{student.name}</span>
                                    <span className="ml-2 text-gray-500">{student.time}</span>
                                  </div>
                                  <div className="flex items-center text-gray-500">
                                    <Smartphone className="w-4 h-4 mr-1" />
                                    <span className="text-xs font-mono">
                                      {student.deviceId.slice(0, 8)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {locationGroups.length === 0 && (
                          <p className="text-gray-500 text-center py-4">
                            No location data available
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-lg border p-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Smartphone className="mr-2" />
                      Device History
                    </h3>
                    
                    {deviceHistory.map(device => (
                      <div 
                        key={device.deviceId} 
                        className={`mb-4 last:mb-0 p-4 rounded-lg ${
                          device.count > 1 ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <span className="text-sm font-mono text-purple-600">
                              {device.deviceId.slice(0, 8)}
                            </span>
                            <span className={`ml-2 text-sm ${
                              device.count > 1 ? 'text-red-600 font-medium' : 'text-gray-500'
                            }`}>
                              ({device.count} students)
                            </span>
                          </div>
                          {device.count > 1 && (
                            <button
                              onClick={() => handleMarkAbsent(
                                device.students.map(s => ({
                                  studentId: s.studentId,
                                  recordId: s.id
                                }))
                              )}
                              className="btn bg-red-600 text-white hover:bg-red-700 text-xs"
                            >
                              <UserX size={14} />
                              Mark All Absent
                            </button>
                          )}
                        </div>
                        <div className="pl-4 border-l-2 border-gray-200">
                          {device.students.map((student, idx) => (
                            <div key={idx} className="text-sm py-1 flex items-center justify-between">
                              <span>{student.name}</span>
                              <span className="text-gray-500">{student.time}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {deviceHistory.length === 0 && (
                      <p className="text-gray-500 text-center py-4">
                        No device history available for today
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedDeviceAttendance;