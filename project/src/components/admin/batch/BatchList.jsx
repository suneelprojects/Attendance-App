import React from 'react';
import { 
  Users, 
  Monitor, 
  Building,
  Calendar,
  ChevronDown,
  ChevronUp,
  Share2,
  QrCode,
  Copy,
  Trash2,
  Edit,
  Pencil,
  UserPlus
} from 'lucide-react';
import { format } from 'date-fns';

const BatchList = ({
  filteredBatches,
  expandedBatch,
  setExpandedBatch,
  onDeleteBatch,
  onEditBatch,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onShowQRCode,
  onCopyRegistrationLink,
  onCopyAttendanceLink,
  handleStudentToggle,
  selectedStudents
}) => {
  return (
    <div className="space-y-4">
      {filteredBatches.map((batch, batchIndex) => (
        <div key={`${batch.id}-${batchIndex}`} className="bg-white rounded-lg shadow-md overflow-hidden">
          <div 
            className="bg-primary-600 px-6 py-4 cursor-pointer"
            onClick={() => setExpandedBatch(expandedBatch === batch.id ? null : batch.id)}
          >
            <div className="flex justify-between items-center">
              <div className="text-white">
                <h3 className="text-xl font-semibold">{batch.name}</h3>
                <p className="text-white/80 mt-1">{batch.course.toUpperCase()}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center text-white/80">
                  <Calendar size={16} className="mr-1" />
                  Started: {format(new Date(batch.startDate), 'dd/MM/yyyy')}
                </div>
                <div className="flex items-center text-white/80">
                  <Users size={16} className="mr-1" />
                  {batch.students?.length || 0} Students
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-white/80">
                    <Building size={16} className="mr-1" />
                    {batch.students?.filter(s => s.mode === 'offline').length || 0} Offline
                  </div>
                  <div className="flex items-center text-white/80">
                    <Monitor size={16} className="mr-1" />
                    {batch.students?.filter(s => s.mode === 'online').length || 0} Online
                  </div>
                </div>
                {expandedBatch === batch.id ? (
                  <ChevronUp className="text-white" size={24} />
                ) : (
                  <ChevronDown className="text-white" size={24} />
                )}
              </div>
            </div>
          </div>

          {expandedBatch === batch.id && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold">Students</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => onAddStudent(batch)}
                    className="btn bg-primary-600 text-white hover:bg-primary-700"
                  >
                    <UserPlus size={16} />
                    Add Student
                  </button>
                  <button
                    onClick={() => onCopyRegistrationLink(batch)}
                    className="btn bg-green-600 text-white hover:bg-green-700"
                  >
                    <Share2 size={16} />
                    Registration Link
                  </button>
                  <button
                    onClick={() => onCopyAttendanceLink(batch.id)}
                    className="btn bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Copy size={16} />
                    Attendance Link
                  </button>
                  <button
                    onClick={() => onShowQRCode(batch)}
                    className="btn bg-purple-600 text-white hover:bg-purple-700"
                  >
                    <QrCode size={16} />
                    QR Codes
                  </button>
                  <button
                    onClick={() => onDeleteBatch(batch.id)}
                    className="btn bg-red-600 text-white hover:bg-red-700"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                  <button
                    onClick={() => onEditBatch(batch)}
                    className="btn bg-yellow-600 text-white hover:bg-yellow-700"
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Offline Students</h5>
                  <div className="space-y-2">
                    {batch.students?.filter(s => s.mode === 'offline').map((student, studentIndex) => (
                      <div key={`${student.id}-${studentIndex}-offline`} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-gray-600">{student.rollNumber}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onEditStudent(student)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit student"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => onDeleteStudent(student)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Delete student"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {!batch.students?.filter(s => s.mode === 'offline').length && (
                      <p className="text-sm text-gray-500 p-3">No offline students</p>
                    )}
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Online Students</h5>
                  <div className="space-y-2">
                    {batch.students?.filter(s => s.mode === 'online').map((student, studentIndex) => (
                      <div key={`${student.id}-${studentIndex}-online`} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-gray-600">{student.rollNumber}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onEditStudent(student)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit student"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => onDeleteStudent(student)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Delete student"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {!batch.students?.filter(s => s.mode === 'online').length && (
                      <p className="text-sm text-gray-500 p-3">No online students</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {filteredBatches.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No batches found</p>
        </div>
      )}
    </div>
  );
};

export default BatchList;