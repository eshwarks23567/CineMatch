import React from 'react';
import './SkeletonLoader.css';

export default function SkeletonLoader({ count = 6 }) {
  return (
    <div className="skeleton-container">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card" />
      ))}
    </div>
  );
}
