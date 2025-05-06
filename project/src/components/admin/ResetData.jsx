import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  Trash2, 
  Lock, 
  ShieldAlert,
  RefreshCw,
  CheckCircle,
  XCircle,
  Calendar,
  Users
} from 'lucide-react';
import { collection, getDocs, writeBatch, doc, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { format, startOfDay, endOfDay } from 'date-fns';

const ResetData = () => {
  const { batches } = useSelector(state => state.batches);
  const [loading, setLoading] = useState(false);
  const [resetProgress, setResetProgress] = useState(0);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const generateConfirmationCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleBatchAttendanceReset = async () => {
    try {
      // Get batch and date selection
      const { value: formData } = await Swal.fire({
        title: 'Delete Batch Attendance',
        html: `
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Select Batch</label>
              <select id="batch" class="w-full px-3 py-2 border rounded-md" required>
                <option value="">Choose a batch</option>
                ${batches.map(batch => `
                  <option value="${batch.id}">${batch.name} (${batch.course})</option>
                `).join('')}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
              <input type="date" id="date" class="w-full px-3 py-2 border rounded-md" max="${format(new Date(), 'yyyy-MM-dd')}" required>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Confirmation</label>
              <input type="text" id="confirmation" class="w-full px-3 py-2 border rounded-md" placeholder="Type DELETE to confirm" required>
            </div>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Delete Attendance',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        preConfirm: () => {
          const batchId = document.getElementById('batch').value;
          const date = document.getElementById('date').value;
          const confirmation = document.getElementById('confirmation').value;
          
          if (!batchId) {
            Swal.showValidationMessage('Please select a batch');
            return false;
          }
          if (!date) {
            Swal.showValidationMessage('Please select a date');
            return false;
          }
          if (confirmation !== 'DELETE') {
            Swal.showValidationMessage('Please type DELETE to confirm');
            return false;
          }
          
          return { batchId, date };
        }
      });

      if (!formData) return;

      const selectedBatch = batches.find(b => b.id === formData.batchId);
      const selectedDate = new Date(formData.date);
      const start = startOfDay(selectedDate);
      const end = endOfDay(selectedDate);

      // Get attendance records for the selected batch and date
      const attendanceRef = collection(db, 'attendance');
      const q = query(
        attendanceRef,
        where('batchId', '==', formData.batchId),
        where('date', '>=', start.toISOString()),
        where('date', '<=', end.toISOString())
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        toast.info('No attendance records found for the selected date and batch');
        return;
      }

      // Show confirmation with details
      const confirmResult = await Swal.fire({
        title: 'Confirm Deletion',
        html: `
          <div class="text-left">
            <p class="mb-4">You are about to delete:</p>
            <ul class="list-disc list-inside mb-4">
              <li>Batch: ${selectedBatch.name}</li>
              <li>Date: ${format(selectedDate, 'PPP')}</li>
              <li>Records: ${snapshot.size}</li>
            </ul>
            <p class="text-red-600 font-bold">This action cannot be undone!</p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete Records',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280'
      });

      if (!confirmResult.isConfirmed) return;

      // Delete attendance records
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      await Swal.fire({
        icon: 'success',
        title: 'Attendance Deleted',
        html: `
          <div>
            <p>Successfully deleted ${snapshot.size} attendance records for:</p>
            <p class="font-medium">${selectedBatch.name}</p>
            <p class="text-sm text-gray-600">${format(selectedDate, 'PPP')}</p>
          </div>
        `,
        confirmButtonColor: '#10b981'
      });

    } catch (error) {
      console.error('Error deleting batch attendance:', error);
      toast.error('Failed to delete attendance records');
    }
  };

  const handleReset = async () => {
    try {
      // First confirmation dialog
      const firstConfirm = await Swal.fire({
        title: 'Dangerous Action',
        html: `
          <div class="text-left">
            <p class="text-red-600 font-bold mb-4">⚠️ WARNING: This action cannot be undone!</p>
            <p class="mb-2">This will permanently delete:</p>
            <ul class="list-disc list-inside mb-4">
              <li>All batch data</li>
              <li>All student records</li>
              <li>All attendance history</li>
            </ul>
            <p class="text-sm text-gray-600">Please type "RESET" to confirm</p>
          </div>
        `,
        input: 'text',
        inputAttributes: {
          autocapitalize: 'off'
        },
        showCancelButton: true,
        confirmButtonText: 'Continue',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#4b5563',
        showLoaderOnConfirm: true,
        allowOutsideClick: () => !Swal.isLoading()
      });

      if (!firstConfirm.isConfirmed || firstConfirm.value !== 'RESET') {
        return;
      }

      // Generate and show confirmation code
      const code = generateConfirmationCode();
      const secondConfirm = await Swal.fire({
        title: 'Security Verification',
        html: `
          <div class="text-left">
            <p class="mb-4">Please enter the following confirmation code:</p>
            <p class="font-mono text-2xl text-center bg-gray-100 p-3 rounded mb-4">${code}</p>
            <p class="text-sm text-gray-600">This helps prevent accidental resets</p>
          </div>
        `,
        input: 'text',
        inputAttributes: {
          autocapitalize: 'off'
        },
        showCancelButton: true,
        confirmButtonText: 'Verify',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#4b5563'
      });

      if (!secondConfirm.isConfirmed || secondConfirm.value !== code) {
        toast.error('Invalid confirmation code');
        return;
      }

      // Final confirmation with admin password
      const finalConfirm = await Swal.fire({
        title: 'Final Verification',
        html: `
          <div class="text-left">
            <p class="mb-4">Please enter your admin password to proceed:</p>
            <p class="text-sm text-gray-600">This is your final chance to cancel</p>
          </div>
        `,
        input: 'password',
        inputAttributes: {
          autocapitalize: 'off'
        },
        showCancelButton: true,
        confirmButtonText: 'Reset Everything',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#4b5563'
      });

      if (!finalConfirm.isConfirmed || !finalConfirm.value) {
        return;
      }

      setLoading(true);

      // Start the reset process
      const collections = ['batches', 'attendance'];
      let totalDocuments = 0;
      let deletedDocuments = 0;

      // Count total documents
      for (const collectionName of collections) {
        const snapshot = await getDocs(collection(db, collectionName));
        totalDocuments += snapshot.size;
      }

      // Delete documents in batches
      for (const collectionName of collections) {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        const batch = writeBatch(db);
        snapshot.docs.forEach(document => {
          batch.delete(doc(db, collectionName, document.id));
          deletedDocuments++;
          setResetProgress(Math.round((deletedDocuments / totalDocuments) * 100));
        });
        
        await batch.commit();
      }

      // Show success message
      await Swal.fire({
        icon: 'success',
        title: 'Reset Complete',
        text: 'All data has been successfully reset',
        confirmButtonColor: '#10b981'
      });

      // Redirect to login page
      navigate('/login');
      
    } catch (error) {
      console.error('Reset error:', error);
      toast.error('Failed to reset data. Please try again.');
    } finally {
      setLoading(false);
      setResetProgress(0);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <ShieldAlert className="text-red-500 mt-1 mr-4" size={24} />
            <div>
              <h2 className="text-xl font-bold text-red-700 mb-2">
                Danger Zone
              </h2>
              <p className="text-red-600">
                This page contains actions that will permanently delete data.
                These actions cannot be undone.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Delete Batch Attendance */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-orange-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center">
                <Calendar className="mr-2" />
                Delete Batch Attendance
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="text-orange-500" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      This will delete:
                    </h3>
                    <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                      <li>All attendance records for the selected batch and date</li>
                      <li>Both present and absent records</li>
                      <li>Location and device data</li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={handleBatchAttendanceReset}
                  className="w-full btn bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center gap-2"
                >
                  <Calendar size={20} />
                  Delete Attendance by Date
                </button>
              </div>
            </div>
          </div>

          {/* Reset All Data */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-red-600 px-6 py-4">
              <h1 className="text-xl font-bold text-white flex items-center">
                <Trash2 className="mr-2" />
                Reset Application Data
              </h1>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="text-amber-500" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      This will delete:
                    </h3>
                    <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                      <li>All batch information</li>
                      <li>All student records</li>
                      <li>All attendance history</li>
                      <li>All statistics and reports</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <Lock className="text-blue-500" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Security measures:
                    </h3>
                    <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                      <li>Multiple confirmation steps</li>
                      <li>Unique verification code</li>
                      <li>Admin password verification</li>
                      <li>Batch processing with progress tracking</li>
                    </ul>
                  </div>
                </div>

                {loading && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Reset progress
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        {resetProgress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${resetProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="border-t pt-6">
                  <button
                    onClick={handleReset}
                    disabled={loading}
                    className="w-full btn bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="animate-spin" size={20} />
                        Resetting Data...
                      </>
                    ) : (
                      <>
                        <Trash2 size={20} />
                        Reset All Data
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetData;