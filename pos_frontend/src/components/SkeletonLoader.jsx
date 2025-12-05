/**
 * Skeleton Loader Component
 * Placeholder loading animation for content
 */

import React from 'react';

function SkeletonLoader({ type = 'default' }) {
  if (type === 'product-card') {
    return (
      <div className="bg-gray-700 p-4 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-600 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-600 rounded w-1/3"></div>
      </div>
    );
  }

  if (type === 'transaction-row') {
    return (
      <div className="bg-gray-700 p-4 rounded-lg animate-pulse flex justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-600 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-600 rounded w-1/3"></div>
        </div>
        <div className="h-4 bg-gray-600 rounded w-20"></div>
      </div>
    );
  }

  // Default skeleton
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-600 rounded w-full mb-2"></div>
      <div className="h-4 bg-gray-600 rounded w-5/6 mb-2"></div>
      <div className="h-4 bg-gray-600 rounded w-4/6"></div>
    </div>
  );
}

export default SkeletonLoader;


