import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Button, Input, Card, Badge, Alert } from '../components/UI';
import { useForm, useAPI, useMutate, usePagination } from '../hooks';
import Layout from '../components/Layout';
import { FOOD_TYPES } from '../constants';
import api from '../api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import FoodMap from '../components/FoodMap';
import JourneyTracker from '../components/JourneyTracker';

const DISTRICT_CENTER = { lat: 8.1833, lng: 77.4119 };

// Shell with sub-routes
const DonorPageNew = () => (
  <Routes>
    <Route index element={<DonorMain />} />
    <Route path="map" element={<DonorMap />} />
    <Route path="history" element={<DonorHistory />} />
  </Routes>
);

// Main: Post Donation
const DonorMain = () => {
  const { user } = useAuth();
  const { mutate, loading: submitLoading, error: submitError } = useMutate();
  const { data: donations, refetch: refetchDonations } = useAPI('/donations/', { pollInterval: 30000 });
  const donationsPagination = usePagination(donations || [], 5);

  const [photoFile, setPhotoFile]         = useState(null);
  const [photoPreview, setPhotoPreview]   = useState(null);
  const [successMsg, setSuccessMsg]       = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [selectedLoc, setSelectedLoc]     = useState(null);

  const validate = (name, value) => {
    if (['food_name','expires_at','address'].includes(name) && !value?.toString().trim())
      return 'This field is required';
    if (name === 'quantity_kg' && (isNaN(value) || Number(value) <= 0))
      return 'Must be greater than 0';
    if (name === 'serves_people' && (isNaN(value) || Number(value) < 1))
      return 'Must be at least 1';
    return null;
  };

  const form = useForm(
    { food_name: '', food_type: 'cooked', quantity_kg: '', serves_people: '', expires_at: '', prepared_at: '', address: '' },
    onSubmit,
    validate
  );

  async function onSubmit(values) {
    try {
      setSuccessMsg(null);
      let photoUrl = null;
      if (photoFile) {
        const formData = new FormData();
        formData.append('file', photoFile);
        const uploadRes = await api.post('/upload/photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        photoUrl = uploadRes.data.url;
      }
      const lat = selectedLoc?.lat ?? parseFloat(user?.lat) ?? DISTRICT_CENTER.lat;
      const lng = selectedLoc?.lng ?? parseFloat(user?.lng) ?? DISTRICT_CENTER.lng;
      await mutate('POST', '/donations/', {
        ...values,
        quantity_kg:   parseFloat(values.quantity_kg),
        serves_people: parseInt(values.serves_people),
        lat, lng,
        photo_url:   photoUrl,
        prepared_at: values.prepared_at || new Date().toISOString(),
      });
      setSuccessMsg('Donation posted! NGOs are being notified by the Smart Engine.');
      form.resetForm();
      setPhotoFile(null); setPhotoPreview(null); setSelectedLoc(null);
      refetchDonations();
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch {}
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const STATUS_COLOR = { posted: 'primary', claimed: 'info', assigned: 'warning', completed: 'success', expired: 'error' };

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Post Donation</h1>
            <p className="text-gray-600 mt-1">Share excess food with NGOs and communities in Nagercoil & KK District</p>
          </div>
          {successMsg && <Alert variant="success" dismissible onDismiss={() => setSuccessMsg(null)}>{successMsg}</Alert>}
          {submitError && <Alert variant="error">{submitError}</Alert>}
          <Card>
            <form onSubmit={form.handleSubmit} className="space-y-6">
              <div className="pb-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Food Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Food Name" name="food_name" value={form.values.food_name}
                    onChange={form.handleChange} onBlur={form.handleBlur}
                    error={form.touched.food_name ? form.errors.food_name : null}
                    placeholder="e.g. Biryani, Wedding Feast" required />
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Food Type <span className="text-red-500">*</span></label>
                    <select name="food_type" value={form.values.food_type} onChange={form.handleChange} className="input-base w-full">
                      {Object.entries(FOOD_TYPES).map(([key, { label, emoji }]) => (
                        <option key={key} value={key}>{emoji} {label}</option>
                      ))}
                    </select>
                  </div>
                  <Input label="Quantity (kg)" name="quantity_kg" type="number" value={form.values.quantity_kg}
                    onChange={form.handleChange} onBlur={form.handleBlur}
                    error={form.touched.quantity_kg ? form.errors.quantity_kg : null}
                    placeholder="e.g. 10.5" step="0.1" required />
                  <Input label="Serves People" name="serves_people" type="number" value={form.values.serves_people}
                    onChange={form.handleChange} onBlur={form.handleBlur}
                    error={form.touched.serves_people ? form.errors.serves_people : null}
                    placeholder="e.g. 50" required />
                </div>
              </div>
              <div className="pb-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Timing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Prepared At" name="prepared_at" type="datetime-local"
                    value={form.values.prepared_at} onChange={form.handleChange} helper="When was the food prepared?" />
                  <Input label="Expires At" name="expires_at" type="datetime-local"
                    value={form.values.expires_at} onChange={form.handleChange} onBlur={form.handleBlur}
                    error={form.touched.expires_at ? form.errors.expires_at : null}
                    helper="Latest safe time to eat" required />
                </div>
              </div>
              <div className="pb-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                <Input label="Pickup Address" name="address" value={form.values.address}
                  onChange={form.handleChange} onBlur={form.handleBlur}
                  error={form.touched.address ? form.errors.address : null}
                  placeholder="Street, Area, Nagercoil" required />
                <Button type="button" variant="outline" fullWidth className="mt-3"
                  onClick={() => setShowMapPicker(!showMapPicker)}>
                  {showMapPicker ? 'Hide Map' : 'Pick Location on Map'}
                  {selectedLoc && ` — ${selectedLoc.lat.toFixed(4)}, ${selectedLoc.lng.toFixed(4)}`}
                </Button>
                {showMapPicker && (
                  <div className="mt-3">
                    <MapPicker onLocationSelect={(loc) => { setSelectedLoc(loc); setShowMapPicker(false); }}
                      initialLat={selectedLoc?.lat ?? parseFloat(user?.lat) ?? 8.1833}
                      initialLng={selectedLoc?.lng ?? parseFloat(user?.lng) ?? 77.4119} />
                  </div>
                )}
              </div>
              <div className="pb-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Food Photo</h3>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block">
                      <div className="border-2 border-dashed border-primary-300 rounded-lg p-6 text-center cursor-pointer hover:bg-primary-50 transition-colors">
                        <input type="file" onChange={handlePhotoChange} accept="image/*" className="hidden" />
                        <div className="text-4xl mb-2">{photoFile ? '✓' : '📸'}</div>
                        <p className="text-sm font-medium text-gray-700">{photoFile ? photoFile.name : 'Click to upload photo'}</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP</p>
                      </div>
                    </label>
                  </div>
                  {photoPreview && (
                    <div>
                      <img src={photoPreview} alt="Preview" className="w-24 h-24 rounded-lg object-cover" />
                      <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                        className="text-xs text-red-600 hover:underline mt-1 block">Remove</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="submit" fullWidth loading={submitLoading} size="lg">Post Donation</Button>
                <Button type="button" variant="secondary" onClick={() => { form.resetForm(); setPhotoFile(null); setPhotoPreview(null); }}>Clear</Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card header="Tips for Better Matches">
            <ul className="space-y-3 text-sm text-gray-700">
              {[
                'Include accurate expiry time for urgency scoring',
                'Add a clear food photo — increases claims by 3x',
                'Specify exact serving size for NGO planning',
                'Use Event/Temple type for festival surplus',
                'GPS location helps volunteers find you faster',
              ].map((tip, i) => (
                <li key={i} className="flex gap-2"><span className="text-primary-600 font-bold">{i+1}.</span><span>{tip}</span></li>
              ))}
            </ul>
          </Card>
          <Card header="Your Recent Donations">
            {donations && donations.length > 0 ? (
              <div className="space-y-3">
                {donationsPagination.currentItems.map(d => (
                  <div key={d.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{d.food_name}</p>
                        <p className="text-xs text-gray-500">{d.quantity_kg}kg · {d.serves_people} people</p>
                      </div>
                      <Badge variant={STATUS_COLOR[d.status] || 'primary'} size="sm">{d.status}</Badge>
                    </div>
                  </div>
                ))}
                {donationsPagination.totalPages > 1 && (
                  <div className="flex justify-between items-center pt-2">
                    <Button variant="outline" size="sm" onClick={donationsPagination.prevPage} disabled={!donationsPagination.hasPrevious}>←</Button>
                    <span className="text-xs text-gray-500">{donationsPagination.currentPage}/{donationsPagination.totalPages}</span>
                    <Button variant="outline" size="sm" onClick={donationsPagination.nextPage} disabled={!donationsPagination.hasNext}>→</Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No donations yet</p>
            )}
          </Card>
          {donations && (
            <Card header="Your Impact">
              <div className="space-y-3">
                {[
                  { label: 'Total Posted',    value: donations.length,                                                                                              color: 'text-primary-600' },
                  { label: 'Completed',       value: donations.filter(d => d.status === 'completed').length,                                                        color: 'text-green-600'   },
                  { label: 'Meals Saved',     value: donations.filter(d => d.status === 'completed').reduce((s, d) => s + d.serves_people, 0),                      color: 'text-blue-600'    },
                  { label: 'CO2 Saved (kg)',  value: (donations.filter(d => d.status === 'completed').reduce((s, d) => s + parseFloat(d.quantity_kg), 0) * 2.5).toFixed(1), color: 'text-emerald-600' },
                ].map(s => (
                  <div key={s.label} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{s.label}</span>
                    <span className={`font-bold text-lg ${s.color}`}>{s.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

// Map Picker helper
const MapPicker = ({ onLocationSelect, initialLat = 8.1833, initialLng = 77.4119 }) => {
  const mapRef         = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  React.useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current).setView([initialLat, initialLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    let marker = L.marker([initialLat, initialLng]).addTo(map);
    map.on('click', (e) => { marker.setLatLng(e.latlng); onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng }); });
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div ref={mapRef} style={{ width: '100%', height: 220, borderRadius: 8, border: '2px solid #d1fae5' }} />;
};

// Donor Map sub-page — status-coloured pins, no route, no heatmap
const STATUS_META = [
  { key: 'posted',    label: 'Waiting to be claimed',  color: '#059669', bg: '#ECFDF5', dot: '#059669', desc: 'Posted but no NGO has claimed it yet'   },
  { key: 'claimed',   label: 'Claimed by an NGO',      color: '#2563EB', bg: '#EFF6FF', dot: '#2563EB', desc: 'An NGO has reserved this donation'       },
  { key: 'assigned',  label: 'Volunteer on the way',   color: '#D97706', bg: '#FFFBEB', dot: '#D97706', desc: 'A volunteer is heading to pick it up'    },
  { key: 'completed', label: 'Successfully delivered', color: '#6B7280', bg: '#F9FAFB', dot: '#6B7280', desc: 'Food reached the community'              },
  { key: 'expired',   label: 'Not claimed in time',    color: '#DC2626', bg: '#FEF2F2', dot: '#DC2626', desc: 'Expired before any NGO could claim it'   },
];

const DonorMap = () => {
  const { user } = useAuth();
  const { data: donations, loading } = useAPI('/donations/', { pollInterval: 30000 });

  const counts = (donations || []).reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">My Donation Map</h1>
          <p className="text-gray-600 mt-1">Each pin colour shows the live status of that donation</p>
        </div>

        {/* Status summary pills — only show statuses that have at least 1 donation */}
        {donations && donations.length > 0 && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {STATUS_META.map(s => counts[s.key] > 0 && (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: s.bg, border: `1.5px solid ${s.color}44`, borderRadius: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.dot, flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontSize: 15, fontWeight: 800, color: s.color }}>{counts[s.key]}</span>
                <span style={{ fontSize: 12, color: '#6B7280' }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Map */}
        <Card>
          {loading
            ? <div className="text-center py-12 text-gray-500">Loading map...</div>
            : !donations || donations.length === 0
              ? <div className="text-center py-12 text-gray-500">No donations yet. Post your first donation to see it here.</div>
              : <FoodMap key={user?.id} donations={donations} />}
        </Card>

        {/* Legend */}
        <Card>
          <h3 style={{ fontWeight: 700, fontSize: 14, color: '#064E3B', marginBottom: 14 }}>What each pin colour means</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {STATUS_META.map(s => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: s.bg, borderRadius: 10, border: `1px solid ${s.color}22` }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: s.dot, flexShrink: 0, marginTop: 3, display: 'inline-block' }} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: s.color, margin: 0 }}>{s.key.charAt(0).toUpperCase() + s.key.slice(1)}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

// Donor History sub-page
const DonorHistory = () => {
  const { user } = useAuth();
  const { data: donations, loading } = useAPI('/donations/', { pollInterval: 30000 });
  const [expanded, setExpanded]   = useState(null);
  const [lifecycle, setLifecycle] = useState({});
  const [rating, setRating]       = useState({});
  const [ratingMsg, setRatingMsg] = useState({});

  const loadLifecycle = async (id) => {
    if (lifecycle[id]) { setExpanded(id); return; }
    try {
      const r = await api.get(`/donations/${id}/lifecycle`);
      setLifecycle(prev => ({ ...prev, [id]: r.data }));
      setExpanded(id);
    } catch {}
  };

  const submitRating = async (donationId) => {
    const val = rating[donationId];
    if (!val) return;
    try {
      await api.post(`/donations/${donationId}/rate-volunteer`, null, { params: { rating: val } });
      setRatingMsg(prev => ({ ...prev, [donationId]: 'Rated!' }));
    } catch (e) {
      setRatingMsg(prev => ({ ...prev, [donationId]: e.response?.data?.detail || 'Failed' }));
    }
  };

  const STATUS_COLOR = { posted: 'primary', claimed: 'info', assigned: 'warning', completed: 'success', expired: 'error' };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Donation History</h1>
          <p className="text-gray-600 mt-1">Track every donation you have posted</p>
        </div>
        {loading && <div className="text-center py-12 text-gray-500">Loading...</div>}
        {!loading && (!donations || donations.length === 0) && (
          <Alert variant="info">No donations yet. Post your first donation!</Alert>
        )}
        <div className="space-y-4">
          {(donations || []).map(d => (
            <Card key={d.id} border hover>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900">{d.food_name}</h3>
                    <Badge variant={STATUS_COLOR[d.status] || 'primary'} size="sm">{d.status}</Badge>
                  </div>
                  <p className="text-sm text-gray-600">{d.quantity_kg}kg · {d.serves_people} people · {d.address}</p>
                  <p className="text-xs text-gray-400 mt-1">Posted: {new Date(d.created_at).toLocaleString('en-IN')}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => expanded === d.id ? setExpanded(null) : loadLifecycle(d.id)}>
                  {expanded === d.id ? 'Hide' : 'Details'}
                </Button>
              </div>
              {expanded === d.id && lifecycle[d.id] && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <JourneyTracker status={d.status} foodName={d.food_name} />
                  {d.status === 'completed' && (
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-sm font-medium text-gray-700">Rate volunteer:</span>
                      <select className="border rounded px-2 py-1 text-sm" value={rating[d.id] || ''}
                        onChange={e => setRating(prev => ({ ...prev, [d.id]: e.target.value }))}>
                        <option value="">Select</option>
                        {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} star</option>)}
                      </select>
                      <Button size="sm" onClick={() => submitRating(d.id)}>Submit</Button>
                      {ratingMsg[d.id] && <span className="text-sm text-green-600">{ratingMsg[d.id]}</span>}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default DonorPageNew;
