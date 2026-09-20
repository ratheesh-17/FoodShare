import React from 'react';

/**
 * Professional Badge Component
 * Variants: success, warning, error, info, neutral
 * Sizes: sm, md, lg
 */
export const Badge = ({
  children,
  variant = 'neutral',
  size = 'md',
  icon = null,
  className = '',
  ...props
}) => {
  const variantStyles = {
    success: 'bg-green-100 text-green-800 border border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    error: 'bg-red-100 text-red-800 border border-red-200',
    info: 'bg-blue-100 text-blue-800 border border-blue-200',
    neutral: 'bg-gray-100 text-gray-800 border border-gray-200',
    primary: 'bg-primary-100 text-primary-800 border border-primary-200',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  return (
    <span
      className={`inline-flex items-center gap-2 font-medium rounded-full ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {icon && <span className="text-lg leading-none">{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;
