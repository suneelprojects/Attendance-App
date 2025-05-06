import React from 'react';
import { X } from 'lucide-react';

const BatchForm = ({ formData, setFormData, onSubmit, onClose, selectedBatch }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {selectedBatch ? 'Edit Batch' : 'Create New Batch'}
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
                Batch Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-control"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course
              </label>
              <input
                type="text"
                name="course"
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                className="form-control"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="form-control"
                required
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Tutor Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tutor Name
                  </label>
                  <input
                    type="text"
                    value={formData.tutor.name}
                    onChange={(e) => setFormData({
                      ...formData,
                      tutor: { ...formData.tutor, name: e.target.value }
                    })}
                    className="form-control"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.tutor.phone}
                    onChange={(e) => setFormData({
                      ...formData,
                      tutor: { ...formData.tutor, phone: e.target.value }
                    })}
                    className="form-control"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.tutor.experience}
                    onChange={(e) => setFormData({
                      ...formData,
                      tutor: { ...formData.tutor, experience: e.target.value }
                    })}
                    className="form-control"
                    required
                  />
                </div>
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
              {selectedBatch ? 'Update Batch' : 'Create Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BatchForm;