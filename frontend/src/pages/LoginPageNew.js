import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Button, Input, Alert, Spinner } from '../components/UI';
import { useForm } from '../hooks/useForm';
import api from '../api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Nagercoil / Kanyakumari district center
const DISTRICT_CENTER = [8.1833, 77.4119];
const DISTRICT_ZOOM   = 12;

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isRegister, setIsRegister]       = useState(false);
  const [selectedRole, setSelectedRole]   = useState('donor');
  const [gpsState, setGpsState]           = useState('idle');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [apiError, setApiError]           = useState(null);

  // Sign-in only needs email + password validated
  // Register needs all fields validated
  // Pass isRegister flag through a ref so validate knows which fields to check
  const isRegisterRef = React.useRef(isRegister);
  React.useEffect(() => { isRegisterRef.current = isRegister; }, [isRegister]);

  const validate = (name, value, allValues) => {
    // Fields only required during registration
    const registerOnlyFields = ['name', 'confirmPassword'];
    if (registerOnlyFields.includes(name) && !isRegisterRef.current) return null;

    // Optional fields — never required
    const optionalFields = ['address', 'whatsapp'];
    if (optionalFields.includes(name)) return null;

    if (!value?.toString().trim()) return 'This field is required';
    if (name === 'email' && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value))
      return 'Please enter a valid email address';
    if (name === 'password' && value.length < 6)
      return 'Password must be at least 6 characters';
    if (name === 'confirmPassword' && value !== allValues?.password)
      return 'Passwords do not match';
    return null;
  };

  const form = useForm(
    { name: '', email: '', password: '', confirmPassword: '', address: '', whatsapp: '' },
    onSubmit,
    validate
  );

  // Auto-detect GPS on mount
  useEffect(() => {
    if (!navigator.geolocation) { setGpsState('denied'); return; }
    setGpsState('loading');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setSelectedLocation({ lat: coords.latitude, lng: coords.longitude });
        setGpsState('ready');
      },
      () => setGpsState('denied')
    );
  }, []);

  async function onSubmit(values) {
    try {
      setApiError(null);

      // Redirect admin email to admin login
      if (!isRegister && values.email.toLowerCase() === 'ratheesh3921@gmail.com') {
        navigate('/admin-login');
        return;
      }

      if (isRegister) {
        const payload = {
          name: values.name,
          email: values.email,
          password: values.password,
          role: selectedRole,
          address: values.address || 'Nagercoil, Kanyakumari District',
          lat: selectedLocation?.lat ?? DISTRICT_CENTER[0],
          lng: selectedLocation?.lng ?? DISTRICT_CENTER[1],
          whatsapp_number: values.whatsapp || null,
        };
        const res = await api.post('/users/register', payload);
        // Auto-login after register
        login(res.data.access_token, res.data.user);
        const role = res.data.user.role;
        navigate(role === 'donor' ? '/donor' : role === 'ngo' ? '/ngo' : role === 'admin' ? '/dashboard' : '/volunteer');
      } else {
        const res = await api.post('/users/login', { email: values.email, password: values.password });
        login(res.data.access_token, res.data.user);
        const role = res.data.user.role;
        navigate(role === 'donor' ? '/donor' : role === 'ngo' ? '/ngo' : role === 'admin' ? '/dashboard' : '/volunteer');
      }
    } catch (error) {
      setApiError(error.response?.data?.detail || error.message || 'Authentication failed');
    }
  }

  const roleOptions = [
    { value: 'donor',     label: '🍱 Donor',     description: 'Share excess food' },
    { value: 'ngo',       label: '🏢 NGO',        description: 'Find food donations' },
    { value: 'volunteer', label: '🚴 Volunteer',  description: 'Help deliver food' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white opacity-10 rounded-full" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white opacity-10 rounded-full" />
      </div>

      <div className="relative w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left — Branding */}
        <div className="hidden md:block text-white">
          <h1 className="text-5xl font-bold mb-4">FoodShare</h1>
          <p className="text-lg text-primary-100 mb-2 font-medium">Nagercoil & Kanyakumari District</p>
          <p className="text-primary-100 mb-8 leading-relaxed">
            Connecting surplus food with hungry communities. Reduce waste, fight hunger, build community impact.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { v: '12K+', l: 'Meals Saved' },
              { v: '340+', l: 'NGO Partners' },
              { v: '800+', l: 'Volunteers' },
              { v: '98%',  l: 'Success Rate' },
            ].map(s => (
              <div key={s.l} className="bg-white bg-opacity-10 backdrop-blur rounded-lg p-4">
                <div className="text-3xl font-bold mb-1">{s.v}</div>
                <div className="text-sm text-primary-100">{s.l}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-white bg-opacity-10 rounded-lg">
            <p className="text-sm text-primary-100 font-medium mb-2">🧠 Powered by ML</p>
            <p className="text-xs text-primary-200">Smart NGO matching · Expiry risk prediction · Route optimization · Real-time alerts</p>
          </div>
        </div>

        {/* Right — Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {isRegister ? 'Join FoodShare' : 'Welcome Back'}
          </h2>
          <p className="text-gray-600 mb-6">
            {isRegister ? 'Create an account to start making a difference' : 'Sign in to your account to continue'}
          </p>

          {apiError && (
            <Alert variant="error" dismissible onDismiss={() => setApiError(null)} className="mb-4">
              {apiError}
            </Alert>
          )}

          <form onSubmit={form.handleSubmit} className="space-y-4">
            {/* Role selector — always visible */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Your Role</label>
              <div className="grid grid-cols-3 gap-2">
                {roleOptions.map(role => (
                  <button key={role.value} type="button" onClick={() => setSelectedRole(role.value)}
                    className={`p-3 rounded-lg text-center text-sm font-medium transition-all ${
                      selectedRole === role.value ? 'bg-primary-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}>
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            {isRegister && (
              <>
                <Input label="Full Name" name="name" value={form.values.name} onChange={form.handleChange}
                  onBlur={form.handleBlur} error={form.touched.name ? form.errors.name : null}
                  placeholder="Your full name" required />

                <Input label="Address" name="address" value={form.values.address} onChange={form.handleChange}
                  placeholder="e.g. Nagercoil Main Road" />

                <Input label="WhatsApp Number" name="whatsapp" value={form.values.whatsapp}
                  onChange={form.handleChange} placeholder="+91 98765 43210" />

                {/* Location */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                  {gpsState === 'loading' && <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><Spinner size="sm" /> Detecting GPS...</div>}
                  {gpsState === 'ready' && <p className="text-sm text-green-600 mb-2">✓ GPS location detected</p>}
                  {gpsState === 'denied' && <p className="text-sm text-amber-600 mb-2">⚠ GPS denied — using Nagercoil as default</p>}
                  <button type="button" onClick={() => setShowMapPicker(!showMapPicker)}
                    className="w-full py-2 px-4 border-2 border-primary-300 rounded-lg text-sm font-medium text-primary-700 hover:bg-primary-50 transition-colors">
                    {selectedLocation ? `📍 ${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}` : '📍 Pick Location on Map'}
                  </button>
                  {showMapPicker && (
                    <div className="mt-3">
                      <MapPicker
                        onLocationSelect={(loc) => { setSelectedLocation(loc); setShowMapPicker(false); }}
                        initialLat={selectedLocation?.lat ?? DISTRICT_CENTER[0]}
                        initialLng={selectedLocation?.lng ?? DISTRICT_CENTER[1]}
                        initialZoom={selectedLocation ? 14 : DISTRICT_ZOOM}
                      />
                      <p className="text-xs text-gray-500 mt-1">Click on map to set your location</p>
                    </div>
                  )}
                </div>
              </>
            )}

            <Input label="Email Address" name="email" type="email" value={form.values.email}
              onChange={form.handleChange} onBlur={form.handleBlur}
              error={form.touched.email ? form.errors.email : null}
              placeholder="you@example.com" required />

            <Input label="Password" name="password" type="password" value={form.values.password}
              onChange={form.handleChange} onBlur={form.handleBlur}
              error={form.touched.password ? form.errors.password : null}
              placeholder="••••••••" helper={isRegister ? 'At least 6 characters' : null} required />

            {isRegister && (
              <Input label="Confirm Password" name="confirmPassword" type="password"
                value={form.values.confirmPassword} onChange={form.handleChange}
                onBlur={form.handleBlur}
                error={form.touched.confirmPassword ? form.errors.confirmPassword : null}
                placeholder="••••••••" required />
            )}

            <Button type="submit" fullWidth loading={form.isSubmitting} className="mt-2">
              {isRegister ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center border-t pt-4">
            <p className="text-gray-600 text-sm">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}
              <button onClick={() => { setIsRegister(!isRegister); form.resetForm(); setApiError(null); isRegisterRef.current = !isRegister; }}
                className="ml-2 text-primary-600 font-semibold hover:underline">
                {isRegister ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>

          {!isRegister && (
            <div className="mt-3 pt-3 border-t text-center">
              <Link to="/admin-login" className="text-sm text-primary-600 hover:underline font-medium">
                Admin Login →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Map Picker using react-leaflet-style raw Leaflet
const MapPicker = ({ onLocationSelect, initialLat, initialLng, initialZoom = 12 }) => {
  const mapRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);

  React.useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([initialLat, initialLng], initialZoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    let marker = L.marker([initialLat, initialLng]).addTo(map);

    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mapRef} style={{ width: '100%', height: 220, borderRadius: 8, border: '2px solid #d1fae5' }} />;
};

export default LoginPage;
