import { utils, write } from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

export const exportToExcel = (data, fileName) => {
  const ws = utils.json_to_sheet(data);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Attendance');
  const excelBuffer = write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, fileName);
};

export const formatAttendanceForExcel = (records, type = 'batch', batchData = null) => {
  if (!records || records.length === 0) return [];

  return records.map(record => {
    // Find student in batch data to get roll number
    const student = batchData?.students?.find(s => s.id === record.studentId);
    
    return {
      Date: format(new Date(record.date), 'PPP'),
      Time: format(new Date(record.date), 'p'),
      'Student Name': record.studentName,
      'Roll Number': student?.rollNumber || 'N/A',
      Status: record.status.charAt(0).toUpperCase() + record.status.slice(1),
      Mode: record.mode.charAt(0).toUpperCase() + record.mode.slice(1),
      'Marked By': record.markedByAdmin ? 'Admin' : 'Self',
      Location: record.location ? `${record.location.lat.toFixed(6)}, ${record.location.lng.toFixed(6)}` : 'N/A',
      ...(type === 'batch' && {
        'Batch Name': record.batchName
      })
    };
  });
};