import React from 'react';

const CustomLoader = () => {
  return (
    <div className="w-[200px] h-[200px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-auto">
      <div className="w-[70px] h-[70px] rounded-full bg-yellow-400 absolute top-0 bottom-0 left-0 right-0 m-auto animate-[dot-1-move_2s_ease_infinite,index_6s_-2s_ease_infinite]" />
      <div className="w-[70px] h-[70px] rounded-full bg-blue-600 absolute top-0 bottom-0 left-0 right-0 m-auto animate-[dot-2-move_2s_ease_infinite,index_6s_-4s_ease_infinite]" />
      <div className="w-[70px] h-[70px] rounded-full bg-red-600 absolute top-0 bottom-0 left-0 right-0 m-auto animate-[dot-3-move_2s_ease_infinite,index_6s_ease_infinite]" />
    </div>
  );
};

export default CustomLoader;