import React from 'react';

/**
 * Professional Input Component
 * Supports text, email, password, number, tel, url
 * States: default, error, success, disabled
 */
export const Input = React.forwardRef(({
  label,
  type = 'text',
  placeholder,
  error,
  success,
  helper,
  icon = null,
  required = false,
  className = '',
  ...props
}, ref) => {
  const baseStyles = 'w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-transparent transition-all text-base font-medium';

  const stateStyles = error
    ? 'border-red-500 focus:ring-red-500 bg-red-50'
    : success
      ? 'border-green-500 focus:ring-green-500 bg-green-50'
      : 'border-gray-300 focus:ring-primary-500 focus:border-primary-600';

  const finalClassName = `${baseStyles} ${stateStyles} ${props.disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          className={`${finalClassName} ${icon ? 'pl-12' : ''}`}
          aria-label={label}
          aria-invalid={!!error}
          aria-describedby={error ? `${props.id}-error` : undefined}
          {...props}
        />
      </div>
      {error && (
        <p id={`${props.id}-error`} className="mt-1 text-sm text-red-600 font-medium">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-1 text-sm text-green-600 font-medium">
          {success}
        </p>
      )}
      {helper && !error && (
        <p className="mt-1 text-xs text-gray-500">
          {helper}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
