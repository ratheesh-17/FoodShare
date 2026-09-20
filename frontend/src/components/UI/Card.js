import React from 'react';

/**
 * Professional Card Component
 * Flexible container with optional header, footer, and padding options
 */
export const Card = ({
  children,
  header = null,
  footer = null,
  padding = 'lg',
  bg = 'white',
  border = false,
  hover = true,
  className = '',
  ...props
}) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const bgStyles = {
    white: 'bg-white',
    gray: 'bg-gray-50',
    primary: 'bg-primary-50',
  };

  const baseStyles = `rounded-lg shadow-md transition-all duration-200 ${hover ? 'hover:shadow-lg' : ''} ${paddingStyles[padding]} ${bgStyles[bg]} ${border ? 'border border-gray-200' : ''} ${className}`;

  return (
    <div className={baseStyles} {...props}>
      {header && (
        <>
          <div className={`flex items-center justify-between mb-4 ${padding === 'none' ? '' : ''}`}>
            {typeof header === 'string' ? <h3 className="text-lg font-semibold text-gray-900">{header}</h3> : header}
          </div>
          <div className="h-px bg-gray-200 -mx-6 mb-6" />
        </>
      )}
      <div>{children}</div>
      {footer && (
        <>
          <div className="h-px bg-gray-200 -mx-6 mt-6 mb-6" />
          {typeof footer === 'string' ? <p className="text-sm text-gray-600">{footer}</p> : footer}
        </>
      )}
    </div>
  );
};

export default Card;
