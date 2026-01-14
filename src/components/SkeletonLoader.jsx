import React from 'react';

export default function SkeletonLoader({ count = 6 }) {
  return (
    <div className="flex gap-4 overflow-hidden py-5">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="flex-shrink-0 w-[200px] h-[300px] bg-gradient-to-r from-[#1a2332] via-[#2a3442] to-[#1a2332] bg-[length:200%_100%] animate-[skeleton-loading_1.5s_ease-in-out_infinite] rounded-lg relative overflow-hidden"
        />
      ))}
    </div>
  );
}
