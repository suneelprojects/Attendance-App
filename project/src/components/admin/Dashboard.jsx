import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { BarChart, Users, Calendar, Clock, Trophy } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import Confetti from 'react-confetti';
import AttendanceTimer from '../shared/AttendanceTimer';
import 'react-toastify/dist/ReactToastify.css';

const Dashboard = () => {
  const { batches } = useSelector(state => state.batches);
  const { attendanceRecords } = useSelector(state => state.attendance);
  const [showConfetti, setShowConfetti] = useState(false);

  const totalBatches = batches?.length || 0;
  const totalStudents =
    batches?.reduce((acc, batch) => acc + (batch.students?.length || 0), 0) || 0;

  const stats = {
    totalBatches,
    totalStudents,
    totalAttendance: attendanceRecords?.length
      ? [...new Set(attendanceRecords.map(r => new Date(r.date).toDateString()))].length
      : 0,
    averageAttendance: attendanceRecords?.length
      ? Math.round(
          (attendanceRecords.filter(r => r.status === 'present').length /
            attendanceRecords.length) *
            100
        )
      : 0
  };

  const getStudentAttendanceData = () => {
    if (!attendanceRecords?.length || !batches?.length) return [];

    const studentAttendance = {};
    attendanceRecords.forEach(record => {
      if (!studentAttendance[record.studentId]) {
        studentAttendance[record.studentId] = {
          name: record.studentName,
          batchName: record.batchName,
          total: 0,
          present: 0
        };
      }
      studentAttendance[record.studentId].total += 1;
      if (record.status === 'present') {
        studentAttendance[record.studentId].present += 1;
      }
    });

    return Object.entries(studentAttendance).map(([studentId, data]) => ({
      studentId,
      studentName: data.name,
      batchName: data.batchName,
      percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
      lastRecord: attendanceRecords
        .filter(record => record.studentId === studentId)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    }));
  };

  const allStudents = getStudentAttendanceData();
  const lowAttendanceStudents = allStudents
    .filter(s => s.percentage < 70)
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 5);

  const topAttendanceStudents = allStudents
    .filter(s => s.percentage >= 90)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 5);

  useEffect(() => {
    if (topAttendanceStudents.length > 0) {
      toast.success('🎉 Leaderboard Loaded with Top Performers!');
      setShowConfetti(true);

      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [topAttendanceStudents]);

  const badgeColors = ['gold', 'silver', 'bronze'];

  return (
    <div className="container mx-auto p-6">
      <AttendanceTimer />
      {showConfetti && <Confetti />}
      <ToastContainer />
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-blue-100 p-4 rounded-lg shadow-md flex items-center gap-4">
          <Users className="w-8 h-8 text-blue-600" />
          <div>
            <p className="text-sm text-gray-600">Total Students</p>
            <p className="text-xl font-semibold text-blue-800">{stats.totalStudents}</p>
          </div>
        </div>

        <div className="bg-green-100 p-4 rounded-lg shadow-md flex items-center gap-4">
          <BarChart className="w-8 h-8 text-green-600" />
          <div>
            <p className="text-sm text-gray-600">Average Attendance</p>
            <p className="text-xl font-semibold text-green-800">{stats.averageAttendance}%</p>
          </div>
        </div>

        <div className="bg-yellow-100 p-4 rounded-lg shadow-md flex items-center gap-4">
          <Calendar className="w-8 h-8 text-yellow-600" />
          <div>
            <p className="text-sm text-gray-600">Days with Attendance</p>
            <p className="text-xl font-semibold text-yellow-800">{stats.totalAttendance}</p>
          </div>
        </div>

        <div className="bg-purple-100 p-4 rounded-lg shadow-md flex items-center gap-4">
          <Clock className="w-8 h-8 text-purple-600" />
          <div>
            <p className="text-sm text-gray-600">Total Batches</p>
            <p className="text-xl font-semibold text-purple-800">{stats.totalBatches}</p>
          </div>
        </div>
      </div>

      {/* Low Attendance Table */}
      <div className="mt-8">
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Students Below 70% Attendance</h2>
            {lowAttendanceStudents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Batch</th>
                      <th className="text-left py-3 px-4">Student</th>
                      <th className="text-left py-3 px-4">Attendance %</th>
                      <th className="text-left py-3 px-4">Last Status</th>
                      <th className="text-left py-3 px-4">Last Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowAttendanceStudents.map((student, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3 px-4">{student.batchName}</td>
                        <td className="py-3 px-4">{student.studentName}</td>
                        <td className="py-3 px-4">{student.percentage}%</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              student.lastRecord.status === 'present'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {student.lastRecord.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {new Date(student.lastRecord.date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No students with attendance below 70%
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="mt-10">
        <div className="bg-white rounded-lg shadow-md border-l-8 border-yellow-400">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              Attendance Leaderboard (90%+)
            </h2>
            {topAttendanceStudents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-900">
                      <th className="text-left py-3 px-4">Rank</th>
                      <th className="text-left py-3 px-4">Student</th>
                      <th className="text-left py-3 px-4">Batch</th>
                      <th className="text-left py-3 px-4">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topAttendanceStudents.map((student, index) => {
                      const initials = student.studentName
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase();
                      const badge =
                        index < 3
                          ? badgeColors[index]
                          : null;

                      return (
                        <tr
                          key={index}
                          className={`hover:bg-yellow-50 transition-colors`}
                        >
                          <td className="py-3 px-4 font-bold text-yellow-700">
                            #{index + 1}
                          </td>
                          <td className="py-3 px-4 flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white font-bold flex items-center justify-center shadow`}
                            >
                              {initials}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium">{student.studentName}</span>
                              {badge && (
                                <span
                                  className={`text-xs font-semibold uppercase text-${
                                    badge === 'gold'
                                      ? 'yellow-500'
                                      : badge === 'silver'
                                      ? 'gray-400'
                                      : 'orange-400'
                                  }`}
                                >
                                  {badge} 🏅
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">{student.batchName}</td>
                          <td className="py-3 px-4">{student.percentage}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No students with 90% or above attendance
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;