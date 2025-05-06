import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Monitor, Building, Mail, Phone, User, AlertTriangle, CheckCircle, RefreshCw, GraduationCap as GraduateCap, Phone as Phone2 } from 'lucide-react';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import Swal from 'sweetalert2';
import Confetti from 'react-confetti';

const Registration = () => {
  const { batchId, registrationToken } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [randomCode, setRandomCode] = useState(generateRandomCode());
  const [userCode, setUserCode] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    mode: 'offline'
  });
  const [formErrors, setFormErrors] = useState({
    name: '',
    email: '',
    phone: '',
    code: ''
  });
  const abortControllerRef = useRef(null);

  function generateRandomCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    abortControllerRef.current = new AbortController();
    const fetchBatchDetails = async () => {
      try {
        console.log('Registration URL:', window.location.href);
        if (!batchId || !registrationToken) {
          throw new Error('Invalid registration link: Missing batch ID or token');
        }

        if (!batchId.match(/^[a-zA-Z0-9-]+$/)) {
          throw new Error('Invalid batch ID format');
        }

        const batchRef = doc(db, 'batches', batchId);
        const batchDoc = await getDoc(batchRef);

        if (!batchDoc.exists()) {
          throw new Error('Batch not found');
        }

        const batchData = batchDoc.data();
        console.log('Batch data:', batchData);
        console.log('Provided token:', registrationToken);

        if (!batchData.registrationToken) {
          throw new Error('No registration token found in batch data');
        }
        if (batchData.registrationToken !== registrationToken) {
          throw new Error('Registration token mismatch. Please request a new registration link from the admin.');
        }

        setBatch({ id: batchDoc.id, ...batchData });
      } catch (err) {
        console.error('Error fetching batch:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBatchDetails();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [batchId, registrationToken]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleCodeChange = (e) => {
    setUserCode(e.target.value);
    setFormErrors(prev => ({ ...prev, code: '' }));
  };

  const refreshCode = () => {
    setRandomCode(generateRandomCode());
    setUserCode('');
    setFormErrors(prev => ({ ...prev, code: '' }));
  };

  const validateForm = () => {
    let valid = true;
    const errors = { name: '', email: '', phone: '', code: '' };

    if (!formData.name.trim()) {
      errors.name = 'Please enter your name';
      valid = false;
    }

    if (!formData.email.trim()) {
      errors.email = 'Please enter your email';
      valid = false;
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
      valid = false;
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Please enter your phone number';
      valid = false;
    } else if (!/^\d{10}$/.test(formData.phone)) {
      errors.phone = 'Please enter a valid 10-digit phone number';
      valid = false;
    }

    if (!userCode.trim() || userCode !== randomCode) {
      errors.code = 'Please enter the correct verification code';
      valid = false;
    }

    setFormErrors(errors);
    if (!valid) {
      toast.error('Please fix the errors in the form');
    }
    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (batch.students?.some(student => student.email.toLowerCase() === formData.email.toLowerCase())) {
        throw new Error('This email is already registered for the batch');
      }

      const studentId = uuidv4();
      const newStudent = {
        id: studentId,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        mode: formData.mode,
        rollNumber: generateRollNumber(batch.course, batch.name, batch.students?.length || 0),
        registeredAt: new Date().toISOString()
      };

      const batchRef = doc(db, 'batches', batchId);
      await updateDoc(batchRef, {
        students: arrayUnion(newStudent)
      });

      setShowConfetti(true);

      await Swal.fire({
        html: `
          <div class="text-center">
            <div class="mb-6">
              <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 class="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
              <p class="text-gray-600 mb-4">Thank you for registering!</p>
            </div>
            
            <div class="bg-gray-50 rounded-lg p-4 mb-6">
              <p class="text-sm text-gray-600 mb-2">Your Roll Number:</p>
              <p class="text-lg font-semibold mb-4">${newStudent.rollNumber}</p>
            </div>
            
            <div class="bg-gray-50 rounded-lg p-4">
              <h3 class="font-medium mb-2">Tutor Information</h3>
              <p class="text-sm text-gray-600">${batch.tutor?.name || 'Not assigned'}</p>
              <p class="text-sm text-gray-600">${batch.tutor?.phone || ''}</p>
              <p class="text-sm text-gray-600">${batch.tutor?.experience ? `${batch.tutor.experience} years experience` : ''}</p>
            </div>
          </div>
        `,
        showConfirmButton: false,
        allowOutsideClick: false,
        didOpen: () => {
          setTimeout(() => {
            setShowConfetti(false);
            window.location.href = 'https://socialprachar.com/';
          }, 5000);
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Failed to complete registration. Please try again.');
      setShowConfetti(false);
    } finally {
      setSubmitting(false);
    }
  };

  const generateRollNumber = (courseName, batchName, studentCount) => {
    const coursePrefix = (courseName || '')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 3) || 'UNK';
    
    const monthMap = {
      january: 'J', jan: 'J', february: 'F', feb: 'F', march: 'M', mar: 'M',
      april: 'A', apr: 'A', may: 'M', june: 'J', jun: 'J', july: 'J', jul: 'J',
      august: 'A', aug: 'A', september: 'S', sep: 'S', october: 'O', oct: 'O',
      november: 'N', nov: 'N', december: 'D', dec: 'D'
    };
    
    const batchMatch = (batchName || '').match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{2})/i) ||
                      batchName.toLowerCase().match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{2})/i);
    
    const batchCode = batchMatch
      ? `${monthMap[batchMatch[1].toLowerCase()] || 'B'}${batchMatch[2]}`
      : `B${new Date().getFullYear().toString().slice(-2)}`;
    
    const studentNumber = (studentCount + 1).toString().padStart(2, '0');
    return `${coursePrefix}${batchCode}${studentNumber}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500 mb-4">
            The registration link may be invalid or expired. Please contact the admin to obtain a new link.
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 py-8 px-4">
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          numberOfPieces={200}
          recycle={false}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 1000 }}
        />
      )}
      
      <div className="max-w-2xl mx-auto">
        {batch?.tutor && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center">
                <GraduateCap className="mr-2" />
                Your Tutor
              </h2>
            </div>
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <h3 className="font-medium text-gray-900">{batch.tutor.name}</h3>
                  <div className="flex items-center text-gray-600 text-sm">
                    <Phone2 className="w-4 h-4 mr-1" />
                    {batch.tutor.phone}
                  </div>
                  <p className="text-sm text-gray-600">
                    {batch.tutor.experience} years of experience
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
            <h1 className="text-xl font-bold text-white">Welcome to Attendance App</h1>
            <p className="text-white/80 mt-1">Complete your registration to get started</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Users className="text-primary-600 mr-2" size={20} />
                  <h3 className="font-medium">Course</h3>
                </div>
                <p className="text-gray-600">{batch.course || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Users className="text-primary-600 mr-2" size={20} />
                  <h3 className="font-medium">Batch</h3>
                </div>
                <p className="text-gray-600">{batch.name || 'N/A'}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    name="name"
                    className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                  />
                </div>
                {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    name="email"
                    className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                  />
                </div>
                {formErrors.email && <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="tel"
                    name="phone"
                    className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                  />
                </div>
                {formErrors.phone && <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mode of Learning
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="mode"
                      value="offline"
                      checked={formData.mode === 'offline'}
                      onChange={handleChange}
                      className="mr-2"
                      disabled={submitting}
                    />
                    <Building size={16} className="mr-1 text-gray-600" /> Offline
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="mode"
                      value="online"
                      checked={formData.mode === 'online'}
                      onChange={handleChange}
                      className="mr-2"
                      disabled={submitting}
                    />
                    <Monitor size={16} className="mr-1 text-gray-600" /> Online
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <div className="flex items-center gap-4">
                  <div className="bg-gray-100 p-2 rounded-md">
                    <span className="text-lg font-mono">Enter this code: {randomCode}</span>
                  </div>
                  <button
                    type="button"
                    onClick={refreshCode}
                    className="flex items-center text-primary-600 hover:text-primary-700 disabled:text-gray-400"
                    disabled={submitting}
                    title="Generate new code"
                  >
                    <RefreshCw size={20} />
                  </button>
                </div>
                <input
                  type="text"
                  name="code"
                  className="w-full mt-2 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder="Enter the code above"
                  value={userCode}
                  onChange={handleCodeChange}
                  disabled={submitting}
                  required
                />
                {formErrors.code && <p className="mt-1 text-sm text-red-600">{formErrors.code}</p>}
              </div>

              <button
                type="submit"
                className="w-full flex justify-center items-center gap-2 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    <span>Complete Registration</span>
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

export default Registration;