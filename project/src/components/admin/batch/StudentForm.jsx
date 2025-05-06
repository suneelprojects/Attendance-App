import React from 'react';
import { X, Monitor, Building } from 'lucide-react';

const StudentForm = ({ formData, setFormData, onSubmit, onClose, editingStudent }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {editingStudent ? 'Edit Student' : 'Add New Student'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={onSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-control"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="form-control"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="form-control"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Roll Number
              </label>
              <input
                type="text"
                value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                className="form-control"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mode
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="offline"
                    checked={formData.mode === 'offline'}
                    onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                    className="mr-2"
                  />
                  <Building size={16} className="mr-1" />
                  Offline
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="online"
                    checked={formData.mode === 'online'}
                    onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                    className="mr-2"
                  />
                  <Monitor size={16} className="mr-1" />
                  Online
                </label>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              {editingStudent ? 'Update Student' : 'Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentForm;