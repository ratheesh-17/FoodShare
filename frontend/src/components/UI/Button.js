import React from 'react';

/**
 * Professional Button Component
 * Variants: primary, secondary, outline, danger, ghost
 * Sizes: sm, md, lg
 * States: loading, disabled
 */
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon = null,
  iconPosition = 'left',
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95';

  const variantStyles = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
  };

  const sizeStyles = {
    sm: 'px-3 py-2 text-sm gap-1',
    md: 'px-4 py-3 text-base gap-2',
    lg: 'px-6 py-3 text-lg gap-2',
  };

  const finalClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`;

  return (
    <button
      className={finalClassName}
      disabled={loading || props.disabled}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 async border-2 border-white border-t-transparent rounded-full animate-spin" />
      )}
      {icon && iconPosition === 'left' && !loading && <span className="text-lg">{icon}</span>}
      {children}
      {icon && iconPosition === 'right' && !loading && <span className="text-lg">{icon}</span>}
    </button>
  );
};

export default Button;
