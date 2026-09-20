import React from 'react';

/**
 * Professional Spinner Component
 * Sizes: sm, md, lg
 */
export const Spinner = ({ size = 'md', className = '', color = 'primary' }) => {
  const sizeStyles = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const colorStyles = {
    primary: 'border-primary-500',
    white: 'border-white',
    gray: 'border-gray-500',
  };

  return (
    <div
      className={`inline-block ${sizeStyles[size]} border-2 border-gray-300 ${colorStyles[color]} border-t-transparent rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
};

/**
 * Professional Loading Skeleton Component
 * Pulse animation for content placeholders
 */
export const Skeleton = ({
  width = 'w-full',
  height = 'h-4',
  className = '',
  count = 1,
  circle = false,
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`bg-gray-300 animate-pulse ${circle ? 'rounded-full' : 'rounded'} ${width} ${height} ${className} ${i > 0 ? 'mt-2' : ''}`}
        />
      ))}
    </>
  );
};

/**
 * Page Loading Overlay
 */
export const PageLoader = ({ message = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 text-center shadow-xl">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
};

export default Spinner;
