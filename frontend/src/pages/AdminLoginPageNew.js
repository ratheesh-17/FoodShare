import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Button, Input, Alert, Card } from '../components/UI';
import { useForm } from '../hooks/useForm';

const AdminLoginPageNew = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState('credentials'); // credentials, otp
  const [apiError, setApiError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [tempEmail, setTempEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');

  // Step 1: Credentials form
  const credForm = useForm(
    { email: '', password: '' },
    handleCredentialsSubmit,
    (name, value) => {
      if (!value?.toString().trim()) return 'This field is required';
      if (name === 'email' && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
        return 'Please enter a valid email';
      }
      return null;
    }
  );

  // Step 2: OTP form
  const otpForm = useForm(
    { otp: '' },
    handleOTPSubmit,
    (name, value) => {
      if (!value?.toString().trim()) return 'OTP is required';
      if (!/^\d{6}$/.test(value)) return 'OTP must be 6 digits';
      return null;
    }
  );

  async function handleCredentialsSubmit(values) {
    try {
      setApiError(null);
      setSuccessMsg(null);

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/users/admin-login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: values.email,
            password: values.password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Invalid credentials');
      }

      if (data.otp_required) {
        setTempEmail(values.email);
        setTempPassword(values.password);
        setSuccessMsg('OTP sent to your registered phone. Check your console for the code (demo mode).');
        setStep('otp');
      }
    } catch (error) {
      setApiError(error.message);
    }
  }

  async function handleOTPSubmit(values) {
    try {
      setApiError(null);

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/users/admin-verify-otp`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: tempEmail,
            password: tempPassword,
            otp: values.otp,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Invalid OTP');
      }

      localStorage.setItem('token', data.access_token);
      login(data.access_token, data.user);
      setSuccessMsg('Admin access granted!');
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (error) {
      setApiError(error.message);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 via-red-500 to-red-700 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white opacity-10 rounded-full" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white opacity-10 rounded-full" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <Card className="bg-white shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <span className="text-3xl">🔐</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Access</h1>
            <p className="text-gray-600">
              {step === 'credentials' ? 'Enter your admin credentials' : 'Verify with OTP'}
            </p>
          </div>

          {/* Success Message */}
          {successMsg && (
            <Alert variant="success" className="mb-6" dismissible>
              {successMsg}
            </Alert>
          )}

          {/* Error Alert */}
          {apiError && (
            <Alert
              variant="error"
              dismissible
              onDismiss={() => setApiError(null)}
              className="mb-6"
            >
              {apiError}
            </Alert>
          )}

          {/* Step 1: Credentials */}
          {step === 'credentials' && (
            <form onSubmit={credForm.handleSubmit} className="space-y-4">
              <Input
                label="Admin Email"
                name="email"
                type="email"
                value={credForm.values.email}
                onChange={credForm.handleChange}
                onBlur={credForm.handleBlur}
                error={credForm.touched.email ? credForm.errors.email : null}
                placeholder="admin@example.com"
                icon="📧"
                required
              />

              <Input
                label="Password"
                name="password"
                type="password"
                value={credForm.values.password}
                onChange={credForm.handleChange}
                onBlur={credForm.handleBlur}
                error={credForm.touched.password ? credForm.errors.password : null}
                placeholder="••••••••"
                icon="🔑"
                required
              />

              <Button
                type="submit"
                fullWidth
                loading={credForm.isSubmitting}
                className="mt-6"
              >
                Continue to OTP
              </Button>
            </form>
          )}

          {/* Step 2: OTP verification */}
          {step === 'otp' && (
            <form onSubmit={otpForm.handleSubmit} className="space-y-6">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-sm text-blue-900 font-medium">
                  📱 OTP has been sent to your registered phone number
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  In demo mode, check your browser console for the generated OTP
                </p>
              </div>

              <Input
                label="Enter 6-Digit OTP"
                name="otp"
                type="text"
                value={otpForm.values.otp}
                onChange={(e) => {
                  // Only allow digits
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  otpForm.setFieldValue('otp', value);
                }}
                onBlur={otpForm.handleBlur}
                error={otpForm.touched.otp ? otpForm.errors.otp : null}
                placeholder="000000"
                maxLength="6"
                icon="🔐"
                required
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    setStep('credentials');
                    credForm.resetForm();
                    otpForm.resetForm();
                    setSuccessMsg(null);
                  }}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  fullWidth
                  loading={otpForm.isSubmitting}
                >
                  Verify OTP
                </Button>
              </div>
            </form>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              This is a restricted admin panel. <br/>
              Unauthorized access is logged.
            </p>
          </div>
        </Card>

        {/* Security Notice */}
        <div className="mt-6 bg-white bg-opacity-10 backdrop-blur rounded-lg p-4 text-white text-xs text-center">
          <p>🔒 Secure admin authentication with OTP verification</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPageNew;
