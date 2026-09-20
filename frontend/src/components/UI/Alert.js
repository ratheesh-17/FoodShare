import React from 'react';

/**
 * Professional Alert Component
 * Variants: success, warning, error, info
 * Can be dismissible
 */
export const Alert = ({
  children,
  variant = 'info',
  title = null,
  dismissible = false,
  onDismiss = null,
  className = '',
  icon = null,
}) => {
  const [dismiss, setDismiss] = React.useState(false);

  const variantStyles = {
    success: 'bg-green-50 border-l-4 border-green-500 text-green-900',
    warning: 'bg-yellow-50 border-l-4 border-yellow-500 text-yellow-900',
    error: 'bg-red-50 border-l-4 border-red-500 text-red-900',
    info: 'bg-blue-50 border-l-4 border-blue-500 text-blue-900',
  };

  const iconVariant = {
    success: '✓',
    warning: '⚠',
    error: '✕',
    info: 'ℹ',
  };

  if (dismiss) return null;

  const handleDismiss = () => {
    setDismiss(true);
    onDismiss?.();
  };

  return (
    <div className={`rounded px-4 py-4 flex gap-3 items-start ${variantStyles[variant]} ${className}`}>
      <div className="flex-shrink-0 text-xl font-bold">
        {icon || iconVariant[variant]}
      </div>
      <div className="flex-1">
        {title && <h4 className="font-semibold mb-1">{title}</h4>}
        <div className="text-sm">{children}</div>
      </div>
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-xl hover:opacity-70 transition-opacity"
          aria-label="Close alert"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default Alert;
