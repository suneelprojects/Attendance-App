import React from 'react';
import CustomLoader from './CustomLoader';

const LoadingSpinner = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <CustomLoader />
    </div>
  );
};

export default LoadingSpinner;