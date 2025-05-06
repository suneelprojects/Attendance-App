import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Search } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { addNewBatch, updateExistingBatch, deleteExistingBatch } from '../../store/slices/batchSlice';
import BatchList from './batch/BatchList';
import BatchForm from './batch/BatchForm';
import StudentForm from './batch/StudentForm';

const BatchManagement = () => {
  const dispatch = useDispatch();
  const { batches, loading } = useSelector(state => state.batches);
  const [showModal, setShowModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [expandedBatch, setExpandedBatch] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    course: '',
    startDate: '',
    students: [],
    tutor: {
      name: '',
      phone: '',
      experience: ''
    }
  });
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentFormData, setStudentFormData] = useState({
    name: '',
    email: '',
    phone: '',
    mode: 'offline',
    rollNumber: ''
  });
  const [qrBatch, setQrBatch] = useState(null);
  const regQRRef = useRef(null);
  const attQRRef = useRef(null);

  const filteredBatches = batches.filter(batch => {
    const searchLower = searchTerm.toLowerCase();
    return (
      batch.name.toLowerCase().includes(searchLower) ||
      batch.course.toLowerCase().includes(searchLower)
    );
  });

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!selectedBatch) {
        toast.error('No batch selected');
        return;
      }

      const batch = batches.find(b => b.id === selectedBatch.id);
      if (!batch) {
        throw new Error('Batch not found');
      }

      let updatedStudents;
      if (editingStudent) {
        // Update existing student
        updatedStudents = batch.students.map(student =>
          student.id === editingStudent.id
            ? { ...student, ...studentFormData }
            : student
        );
      } else {
        // Add new student
        const newStudent = {
          ...studentFormData,
          id: crypto.randomUUID(),
          registeredAt: new Date().toISOString()
        };
        updatedStudents = [...(batch.students || []), newStudent];
      }

      const updatedBatch = {
        ...batch,
        students: updatedStudents
      };

      await dispatch(updateExistingBatch({
        id: batch.id,
        batchData: updatedBatch
      })).unwrap();

      toast.success(`Student ${editingStudent ? 'updated' : 'added'} successfully`);
      setShowStudentModal(false);
      setEditingStudent(null);
      setStudentFormData({
        name: '',
        email: '',
        phone: '',
        mode: 'offline',
        rollNumber: ''
      });
    } catch (error) {
      console.error('Student management error:', error);
      toast.error(`Failed to ${editingStudent ? 'update' : 'add'} student: ${error.message}`);
    }
  };

  const handleDeleteStudent = async (student) => {
    try {
      const result = await Swal.fire({
        title: 'Delete Student',
        html: `
          <div class="text-center">
            <div class="mb-4">
              <div class="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
            </div>
            <p class="text-gray-900 font-medium mb-2">Are you sure you want to delete this student?</p>
            <p class="text-gray-600 text-sm mb-4">${student.name} (${student.rollNumber})</p>
            <p class="text-red-600 text-sm">This action cannot be undone!</p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        const batch = batches.find(b => b.students?.some(s => s.id === student.id));
        if (!batch) {
          throw new Error('Batch not found');
        }

        const updatedBatch = {
          ...batch,
          students: batch.students.filter(s => s.id !== student.id)
        };

        await dispatch(updateExistingBatch({
          id: batch.id,
          batchData: updatedBatch
        })).unwrap();

        toast.success('Student deleted successfully');
      }
    } catch (error) {
      console.error('Delete student error:', error);
      toast.error('Failed to delete student');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedBatch) {
        await dispatch(updateExistingBatch({ id: selectedBatch.id, batchData: formData })).unwrap();
        toast.success('Batch updated successfully');
      } else {
        const result = await dispatch(addNewBatch(formData)).unwrap();
        setQrBatch(result);
        await handleShowQRCodes(result);
      }
      setShowModal(false);
      setSelectedBatch(null);
      setFormData({
        name: '',
        course: '',
        startDate: '',
        students: [],
        tutor: {
          name: '',
          phone: '',
          experience: ''
        }
      });
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
  };

  const handleShowQRCodes = async (batch) => {
    const registrationLink = getRegistrationLink(batch);
    const attendanceLink = getAttendanceLink(batch.id);
    
    await handleQRCodeDisplay(batch, registrationLink, attendanceLink);
  };

  const handleQRCodeDisplay = async (batch, registrationLink, attendanceLink) => {
    setQrBatch(batch);
    
    await Swal.fire({
      title: 'QR Codes',
      html: `
        <div class="space-y-6">
          <div>
            <h3 class="text-lg font-semibold mb-2">Registration QR Code</h3>
            <div class="flex justify-center mb-4" id="regQRCode"></div>
            <div class="flex justify-center">
              <button id="downloadRegQR" class="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm">
                Download QR
              </button>
            </div>
          </div>
          <div>
            <h3 class="text-lg font-semibold mb-2">Attendance QR Code</h3>
            <div class="flex justify-center mb-4" id="attQRCode"></div>
            <div class="flex justify-center">
              <button id="downloadAttQR" class="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm">
                Download QR
              </button>
            </div>
          </div>
        </div>
      `,
      showConfirmButton: false,
      showCloseButton: true,
      didRender: () => {
        const regQRContainer = document.getElementById('regQRCode');
        const attQRContainer = document.getElementById('attQRCode');
        
        if (regQRRef.current && regQRContainer) {
          regQRContainer.appendChild(regQRRef.current.querySelector('svg'));
        }
        if (attQRRef.current && attQRContainer) {
          attQRContainer.appendChild(attQRRef.current.querySelector('svg'));
        }

        const downloadRegQR = Swal.getPopup().querySelector('#downloadRegQR');
        const downloadAttQR = Swal.getPopup().querySelector('#downloadAttQR');
        
        if (downloadRegQR) {
          downloadRegQR.addEventListener('click', () => {
            const svg = regQRRef.current.querySelector('svg');
            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);
              canvas.toBlob(blob => {
                saveAs(blob, `registration_qr_${batch.name}.png`);
                toast.success('Registration QR code downloaded');
              });
            };
            img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
          });
        }

        if (downloadAttQR) {
          downloadAttQR.addEventListener('click', () => {
            const svg = attQRRef.current.querySelector('svg');
            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);
              canvas.toBlob(blob => {
                saveAs(blob, `attendance_qr_${batch.name}.png`);
                toast.success('Attendance QR code downloaded');
              });
            };
            img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
          });
        }
      },
      didClose: () => {
        setQrBatch(null);
      }
    });
  };

  const getRegistrationLink = (batch) => {
    return `${window.location.origin}/student/register/${batch.id}/${batch.registrationToken}`;
  };

  const getAttendanceLink = (batchId) => {
    return `${window.location.origin}/student/attendance/${batchId}`;
  };

  const copyToClipboard = async (text, successMessage) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch (err) {
      toast.error('Failed to copy link to clipboard');
    }
  };

  const handleDeleteBatch = async (batchId) => {
    try {
      const result = await Swal.fire({
        title: 'Delete Batch',
        html: `
          <div class="text-center">
            <div class="mb-4">
              <div class="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
            </div>
            <p class="text-gray-900 font-medium mb-2">Are you sure you want to delete this batch?</p>
            <p class="text-red-600 text-sm">This action cannot be undone!</p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        await dispatch(deleteExistingBatch(batchId)).unwrap();
        toast.success('Batch deleted successfully');
      }
    } catch (error) {
      console.error('Delete batch error:', error);
      toast.error('Failed to delete batch');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Batch Management</h1>
        <p className="text-gray-600 mt-1">Manage your training batches and students</p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search batches..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => {
            setSelectedBatch(null);
            setShowModal(true);
          }}
          className="btn btn-primary ml-4"
        >
          <Plus size={20} />
          Create Batch
        </button>
      </div>

      <BatchList
        filteredBatches={filteredBatches}
        expandedBatch={expandedBatch}
        setExpandedBatch={setExpandedBatch}
        onDeleteBatch={handleDeleteBatch}
        onEditBatch={(batch) => {
          setSelectedBatch(batch);
          setFormData({
            name: batch.name,
            course: batch.course,
            startDate: batch.startDate,
            students: batch.students || [],
            tutor: batch.tutor || {
              name: '',
              phone: '',
              experience: ''
            }
          });
          setShowModal(true);
        }}
        onAddStudent={(batch) => {
          setSelectedBatch(batch);
          setShowStudentModal(true);
        }}
        onEditStudent={(student) => {
          setEditingStudent(student);
          setStudentFormData({
            name: student.name,
            email: student.email,
            phone: student.phone,
            mode: student.mode,
            rollNumber: student.rollNumber
          });
          setShowStudentModal(true);
        }}
        onDeleteStudent={handleDeleteStudent}
        onShowQRCode={(batch) => handleShowQRCodes(batch)}
        onCopyRegistrationLink={(batch) => copyToClipboard(
          getRegistrationLink(batch),
          'Registration link copied'
        )}
        onCopyAttendanceLink={(batchId) => copyToClipboard(
          getAttendanceLink(batchId),
          'Attendance link copied'
        )}
      />

      {/* Hidden QR Code Rendering */}
      <div style={{ display: 'none' }}>
        {qrBatch && (
          <>
            <div ref={regQRRef}>
              <QRCodeSVG
                value={getRegistrationLink(qrBatch)}
                size={200}
                level="H"
              />
            </div>
            <div ref={attQRRef}>
              <QRCodeSVG
                value={getAttendanceLink(qrBatch.id)}
                size={200}
                level="H"
              />
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <BatchForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onClose={() => setShowModal(false)}
          selectedBatch={selectedBatch}
        />
      )}

      {showStudentModal && (
        <StudentForm
          formData={studentFormData}
          setFormData={setStudentFormData}
          onSubmit={handleStudentSubmit}
          onClose={() => {
            setShowStudentModal(false);
            setEditingStudent(null);
            setStudentFormData({
              name: '',
              email: '',
              phone: '',
              mode: 'offline',
              rollNumber: ''
            });
          }}
          editingStudent={editingStudent}
        />
      )}
    </div>
  );
};

export default BatchManagement;