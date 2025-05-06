import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import { ATTENDANCE_WINDOW } from '../../utils/attendanceValidation';

const AttendanceTimer = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isWindowOpen, setIsWindowOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      const currentHour = now.getHours();
      setIsWindowOpen(
        currentHour >= ATTENDANCE_WINDOW.START_HOUR && 
        currentHour < ATTENDANCE_WINDOW.END_HOUR
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`
      fixed top-4 right-4 z-50 
      bg-white rounded-lg shadow-lg 
      p-4 min-w-[200px]
      transform transition-all duration-300
      hover:scale-105
      ${isWindowOpen ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'}
    `}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-gray-600">
          {format(currentTime, 'EEEE, MMMM d')}
        </div>
        <Clock 
          className={`w-5 h-5 ${
            isWindowOpen ? 'text-green-500 animate-pulse' : 'text-red-500'
          }`} 
        />
      </div>
      
      <div className="text-2xl font-bold font-mono">
        {format(currentTime, 'HH:mm:ss')}
      </div>
      
      <div className={`
        mt-2 text-xs font-medium
        ${isWindowOpen ? 'text-green-600' : 'text-red-600'}
      `}>
        {isWindowOpen ? (
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Window Open
          </div>
        ) : (
          <div className="flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
            Window Closed
          </div>
        )}
      </div>
      
      <div className="mt-1 text-xs text-gray-500">
        {`${ATTENDANCE_WINDOW.START_HOUR}:00 - ${ATTENDANCE_WINDOW.END_HOUR}:00`}
      </div>
    </div>
  );
};

export default AttendanceTimer;