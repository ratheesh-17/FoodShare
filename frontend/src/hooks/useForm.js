import { useState, useCallback } from 'react';

/**
 * Custom hook for form management
 * Handles state, validation, and submission
 */
export const useForm = (initialValues, onSubmit, validate) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setValues((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }, []);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));

    if (validate) {
      const fieldError = validate(name, values[name], values);
      setErrors((prev) => ({
        ...prev,
        [name]: fieldError,
      }));
    }
  }, [validate, values]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const setFieldValue = useCallback((name, value) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault();
      setIsSubmitting(true);

      // Validate all fields
      if (validate) {
        const allErrors = {};
        Object.keys(values).forEach((key) => {
          const error = validate(key, values[key], values);
          if (error) allErrors[key] = error;
        });

        if (Object.keys(allErrors).length > 0) {
          setErrors(allErrors);
          setIsSubmitting(false);
          return;
        }
      }

      try {
        await onSubmit(values);
      } catch (err) {
        console.error('Form submission error:', err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validate, onSubmit]
  );

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    resetForm,
  };
};

export default useForm;
