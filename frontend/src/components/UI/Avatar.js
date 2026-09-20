import React from 'react';

/**
 * Professional Avatar Component
 * Supports images, initials, and roles
 */
export const Avatar = ({
  src = null,
  initials = '?',
  size = 'md',
  role = null,
  alt = 'Avatar',
  className = '',
}) => {
  const sizeStyles = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-2xl',
  };

  const roleColors = {
    donor: 'bg-blue-500',
    ngo: 'bg-green-500',
    volunteer: 'bg-purple-500',
    admin: 'bg-red-500',
  };

  const bgColor = roleColors[role] || 'bg-gray-400';

  return (
    <div className="relative">
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`${sizeStyles[size]} rounded-full object-cover ${className}`}
        />
      ) : (
        <div
          className={`${sizeStyles[size]} rounded-full ${bgColor} text-white flex items-center justify-center font-bold ${className}`}
        >
          {initials}
        </div>
      )}
      {role && (
        <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-gray-300" />
      )}
    </div>
  );
};

/**
 * Professional Tag/Chip Component
 * Removable and customizable
 */
export const Tag = ({
  children,
  onRemove = null,
  variant = 'primary',
  icon = null,
  className = '',
}) => {
  const variantStyles = {
    primary: 'bg-primary-100 text-primary-900 border-primary-300',
    success: 'bg-green-100 text-green-900 border-green-300',
    warning: 'bg-yellow-100 text-yellow-900 border-yellow-300',
    error: 'bg-red-100 text-red-900 border-red-300',
  };

  return (
    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-sm font-medium ${variantStyles[variant]} ${className}`}>
      {icon && <span>{icon}</span>}
      <span>{children}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:opacity-70 transition-opacity"
          aria-label={`Remove ${children}`}
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default Avatar;
