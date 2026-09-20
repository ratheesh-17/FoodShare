import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../AuthContext';
import { Button, Card, Badge, Alert, Spinner, Modal } from '../components/UI';
import { useAPI, useMutate, usePagination } from '../hooks';
import Layout from '../components/Layout';
import { FOOD_TYPES, STATUS_BADGES } from '../constants';
import api from '../api';
import FoodMap, { fetchRoute } from '../components/FoodMap';

const DISTRICT_CENTER = { lat: 8.1833, lng: 77.4119 };

// ─── Shell with sub-routes ────────────────────────────────────────────────────
const NGOPageNew = () => (
  <Routes>
    <Route index          element={<NGONearby />} />
    <Route path="claimed" element={<NGOClaimed />} />
    <Route path="ai"      element={<NGOSmartEngine />} />
    <Route path="route"   element={<NGORoutePlanner />} />
    <Route path="map"     element={<NGOLiveMap />} />
  </Routes>
);

// ─── NGONearby (index) ────────────────────────────────────────────────────────
const NGONearby = () => {
  const { user } = useAuth();
  const [radius, setRadius]               = useState(20);
  const [selectedStatus, setSelectedStatus] = useState('all');

  const userLat = parseFloat(user?.lat) || DISTRICT_CENTER.lat;
  const userLng = parseFloat(user?.lng) || DISTRICT_CENTER.lng;

  const { data: nearbyFood, loading: nearbyLoading, refetch: refetchNearby } = useAPI(
    `/donations/nearby?lat=${userLat}&lng=${userLng}&radius_km=${radius}`, { pollInterval: 25000 }
  );
  const { data: myClaims, loading: claimsLoading, refetch: refetchClaims } = useAPI('/donations/my-claims', { pollInterval: 25000 });
  const { data: volunteers, loading: volLoading } = useAPI('/users/volunteers');

  const [selectedDonation, setSelectedDonation]   = useState(null);
  const [showClaimModal, setShowClaimModal]         = useState(false);
  const [showAssignModal, setShowAssignModal]       = useState(false);
  const [selectedVolunteer, setSelectedVolunteer]   = useState(null);
  const [actionMsg, setActionMsg]                   = useState(null);

  const { mutate: claimDonation,    loading: claimLoading }  = useMutate();
  const { mutate: assignVolunteer,  loading: assignLoading } = useMutate();

  const filteredNearby = (nearbyFood || []).filter(d =>
    selectedStatus === 'all' || d.status === selectedStatus
  );

  const nearbyPagination = usePagination(filteredNearby, 6);
  const claimsPagination = usePagination(myClaims || [], 5);

  const handleClaim = async () => {
    if (!selectedDonation) return;
    try {
      await claimDonation('PATCH', `/donations/${selectedDonation.id}/claim`);
      setShowClaimModal(false);
      setActionMsg('Donation claimed! Now assign a volunteer.');
      refetchClaims();
      refetchNearby();
    } catch (err) {
      setActionMsg(`Error: ${err.message}`);
    }
  };

  const handleAssignVolunteer = async () => {
    if (!selectedDonation || !selectedVolunteer) return;
    try {
      await assignVolunteer('PATCH', `/donations/${selectedDonation.id}/assign/${selectedVolunteer}`);
      setShowAssignModal(false);
      setActionMsg('Volunteer assigned successfully!');
      refetchClaims();
      refetchNearby();
      setSelectedVolunteer(null);
    } catch (err) {
      setActionMsg(`Error: ${err.message}`);
    }
  };

  const hoursLeft = (expiresAt) => Math.max(0, Math.round((new Date(expiresAt) - new Date()) / 3600000));

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Find Donations</h1>
          <p className="text-gray-600 mt-1">Discover surplus food near Nagercoil & Kanyakumari District</p>
        </div>

        {actionMsg && (
          <Alert variant={actionMsg.startsWith('Error') ? 'error' : 'success'} dismissible onDismiss={() => setActionMsg(null)}>
            {actionMsg}
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Radius: {radius} km</label>
              <input type="range" min="5" max="50" value={radius}
                onChange={e => setRadius(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="input-base w-full">
                <option value="all">All</option>
                <option value="posted">Posted</option>
                <option value="claimed">Claimed</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Button fullWidth onClick={refetchNearby} disabled={nearbyLoading}>
                🔄 Refresh Nearby Food
              </Button>
            </div>
          </div>
        </Card>

        {/* Nearby Donations */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            🍱 Nearby Donations
            <span className="ml-2 text-base font-normal text-gray-500">({filteredNearby.length} found)</span>
          </h2>

          {nearbyLoading ? <Spinner /> : filteredNearby.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nearbyPagination.currentItems.map(d => (
                  <Card key={d.id} hover className="cursor-pointer"
                    onClick={() => { if (d.status === 'posted' && user?.role === 'ngo') { setSelectedDonation(d); setShowClaimModal(true); } }}>
                    {d.photo_url && (
                      <img src={d.photo_url} alt={d.food_name} className="w-full h-32 object-cover rounded-lg mb-3"
                        onError={e => { e.target.style.display = 'none'; }} />
                    )}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-bold text-gray-900">{d.food_name}</h3>
                        <p className="text-sm text-gray-500">{d.quantity_kg}kg · {d.serves_people} people</p>
                      </div>
                      <span className="text-xl">{FOOD_TYPES[d.food_type]?.emoji || '🍱'}</span>
                    </div>
                    <div className="space-y-1 mb-3 text-sm text-gray-600">
                      <p>📍 {d.distance_km?.toFixed(1) || '?'} km away</p>
                      <p>⏰ {hoursLeft(d.expires_at)}h left</p>
                      <p>📌 {d.address}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant={d.status === 'posted' ? 'primary' : d.status === 'claimed' ? 'info' : 'success'} size="sm">
                        {d.status}
                      </Badge>
                      {d.status === 'posted' && user?.role === 'ngo' && (
                        <Button size="sm" onClick={e => { e.stopPropagation(); setSelectedDonation(d); setShowClaimModal(true); }}>
                          Claim →
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
              {nearbyPagination.totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={nearbyPagination.prevPage} disabled={!nearbyPagination.hasPrevious}>← Prev</Button>
                  <span className="px-4 py-2 text-sm">{nearbyPagination.currentPage} / {nearbyPagination.totalPages}</span>
                  <Button variant="outline" size="sm" onClick={nearbyPagination.nextPage} disabled={!nearbyPagination.hasNext}>Next →</Button>
                </div>
              )}
            </div>
          ) : (
            <Alert variant="info">No donations found within {radius}km. Try increasing the search radius.</Alert>
          )}
        </div>

        {/* My Claims */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            📋 My Claims
            <span className="ml-2 text-base font-normal text-gray-500">({(myClaims || []).length})</span>
          </h2>

          {claimsLoading ? <Spinner /> : claimsPagination.currentItems.length > 0 ? (
            <div className="space-y-4">
              {claimsPagination.currentItems.map(d => (
                <Card key={d.id} border hover>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900">{d.food_name}</h3>
                        <Badge variant={d.status === 'completed' ? 'success' : d.status === 'assigned' ? 'warning' : 'info'}>
                          {d.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{d.quantity_kg}kg · {d.serves_people} people</p>
                      <p className="text-sm text-gray-500">{d.address}</p>
                    </div>
                    {d.status === 'claimed' && (
                      <Button size="sm" onClick={() => { setSelectedDonation(d); setShowAssignModal(true); }}>
                        Assign Volunteer →
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
              {claimsPagination.totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={claimsPagination.prevPage} disabled={!claimsPagination.hasPrevious}>← Prev</Button>
                  <span className="px-4 py-2 text-sm">{claimsPagination.currentPage} / {claimsPagination.totalPages}</span>
                  <Button variant="outline" size="sm" onClick={claimsPagination.nextPage} disabled={!claimsPagination.hasNext}>Next →</Button>
                </div>
              )}
            </div>
          ) : (
            <Alert variant="info">You haven't claimed any donations yet.</Alert>
          )}
        </div>
      </div>

      {/* Claim Modal */}
      <Modal isOpen={showClaimModal} onClose={() => setShowClaimModal(false)} title="Claim Donation">
        {selectedDonation && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 text-lg">{selectedDonation.food_name}</h4>
              <p className="text-sm text-gray-600 mt-1">{selectedDonation.quantity_kg}kg · Serves {selectedDonation.serves_people} people</p>
              <p className="text-sm text-gray-600">📍 {selectedDonation.address}</p>
              <p className="text-sm text-gray-600">📍 {selectedDonation.distance_km?.toFixed(1)} km away</p>
            </div>
            <Alert variant={hoursLeft(selectedDonation.expires_at) < 2 ? 'error' : 'info'}>
              ⏰ Expires in {hoursLeft(selectedDonation.expires_at)} hours
            </Alert>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" fullWidth onClick={() => setShowClaimModal(false)}>Cancel</Button>
              <Button fullWidth loading={claimLoading} onClick={handleClaim}>✓ Claim Donation</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Assign Volunteer Modal */}
      <Modal isOpen={showAssignModal} onClose={() => { setShowAssignModal(false); setSelectedVolunteer(null); }} title="Assign Volunteer">
        {selectedDonation && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Assigning volunteer for: <strong>{selectedDonation.food_name}</strong></p>
            {volLoading ? <Spinner /> : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(volunteers || []).length === 0
                  ? <p className="text-sm text-gray-500 text-center py-4">No volunteers registered yet.</p>
                  : (volunteers || []).map(v => (
                    <div key={v.id} onClick={() => setSelectedVolunteer(v.id)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedVolunteer === v.id ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
                      }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{v.name}</p>
                          <p className="text-sm text-gray-500">{v.address || 'No address'}</p>
                        </div>
                        <Badge variant="success" size="sm">⭐ {parseFloat(v.rating || 5).toFixed(1)}</Badge>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" fullWidth onClick={() => { setShowAssignModal(false); setSelectedVolunteer(null); }}>Cancel</Button>
              <Button fullWidth disabled={!selectedVolunteer} loading={assignLoading} onClick={handleAssignVolunteer}>
                ✓ Assign
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

// ─── Placeholder sub-pages ────────────────────────────────────────────────────
const NGOClaimed = () => {
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignMsg, setAssignMsg]       = useState(null);
  const [activeTab, setActiveTab]       = useState('claimed');
  const [ratingMap, setRatingMap]       = useState({});
  const [ratingMsg, setRatingMsg]       = useState({});
  const { data: claimed, loading, refetch } = useAPI('/donations/my-claims', { pollInterval: 20000 });
  const { data: volunteers } = useAPI('/users/volunteers');
  const { mutate: assignVolunteer, loading: assignLoading } = useMutate();
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const submitRating = async (donationId) => {
    const val = ratingMap[donationId];
    if (!val) return;
    try {
      await api.post(`/donations/${donationId}/rate-volunteer`, null, { params: { rating: val } });
      setRatingMsg(prev => ({ ...prev, [donationId]: 'Rated!' }));
    } catch (e) {
      setRatingMsg(prev => ({ ...prev, [donationId]: e.response?.data?.detail || 'Failed' }));
    }
  };

  const all = claimed || [];
  const totalClaimed   = all.length;
  const mealsProgress  = all.filter(d => d.status === 'assigned').reduce((s, d) => s + d.serves_people, 0);
  const mealsDelivered = all.filter(d => d.status === 'completed').reduce((s, d) => s + d.serves_people, 0);

  const TABS = [
    { key: 'claimed',   label: 'Needs Volunteer', color: '#2563EB', bg: '#EFF6FF' },
    { key: 'assigned',  label: 'In Progress',     color: '#D97706', bg: '#FFFBEB' },
    { key: 'completed', label: 'Completed',        color: '#059669', bg: '#ECFDF5' },
  ];

  const filtered = all.filter(d => d.status === activeTab);

  const handleAssign = async () => {
    if (!assignTarget || !selectedVolunteer) return;
    try {
      await assignVolunteer('PATCH', `/donations/${assignTarget}/assign/${selectedVolunteer}`);
      setShowModal(false); setSelectedVolunteer(null);
      setAssignMsg('Volunteer assigned successfully!');
      refetch();
    } catch (err) { setAssignMsg('Error: ' + err.message); }
  };

  return (
    <Layout>
      <div className="space-y-6">

        <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 16, padding: '24px 28px' }}>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: 0 }}>My Claimed Donations</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 }}>Track and manage every donation your NGO has claimed</p>
        </div>

        {!loading && all.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {[
              { label: 'Total Claimed',     value: totalClaimed,   color: '#6366f1', bg: '#EEF2FF' },
              { label: 'Meals In Progress', value: mealsProgress,  color: '#D97706', bg: '#FFFBEB' },
              { label: 'Meals Delivered',   value: mealsDelivered, color: '#059669', bg: '#ECFDF5' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, border: `1.5px solid ${s.color}33`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 22, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: '3px 0 0' }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {assignMsg && (
          <Alert variant={assignMsg.startsWith('Error') ? 'error' : 'success'} dismissible onDismiss={() => setAssignMsg(null)}>
            {assignMsg}
          </Alert>
        )}

        {!loading && all.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            {TABS.map(t => {
              const count    = all.filter(d => d.status === t.key).length;
              const isActive = activeTab === t.key;
              return (
                <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 18px', borderRadius: 10, cursor: 'pointer',
                  fontWeight: 600, fontSize: 13, transition: 'all 0.15s',
                  background: isActive ? t.bg : '#fff',
                  border: `1.5px solid ${isActive ? t.color : '#E5E7EB'}`,
                  color: isActive ? t.color : '#6B7280',
                }}>
                  {t.label}
                  <span style={{
                    background: isActive ? t.color : '#F3F4F6',
                    color: isActive ? '#fff' : '#6B7280',
                    fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
                  }}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {loading ? <Spinner /> : all.length === 0 ? (
          <Alert variant="info">No claimed donations yet. Claim donations from Nearby Food.</Alert>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9CA3AF' }}>
            <p style={{ fontSize: 14 }}>No {activeTab} donations right now.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.map(d => {
              const hoursLeft = Math.max(0, Math.round((new Date(d.expires_at) - new Date()) / 3600000));
              const urgent    = hoursLeft < 2 && d.status === 'claimed';
              return (
                <div key={d.id} style={{
                  background: '#fff',
                  border: `1.5px solid ${urgent ? '#FECACA' : '#E5E7EB'}`,
                  borderRadius: 14, overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  display: 'flex',
                }}>
                  {d.photo_url && (
                    <img src={d.photo_url} alt={d.food_name}
                      onError={e => { e.target.style.display = 'none'; }}
                      style={{ width: 110, objectFit: 'cover', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <h3 style={{ fontWeight: 700, fontSize: 15, color: '#111827', margin: 0 }}>{d.food_name}</h3>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                          background: d.status === 'completed' ? '#ECFDF5' : d.status === 'assigned' ? '#FFFBEB' : '#EFF6FF',
                          color:      d.status === 'completed' ? '#059669' : d.status === 'assigned' ? '#D97706' : '#2563EB',
                        }}>{d.status}</span>
                        {urgent && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#FEF2F2', color: '#DC2626' }}>URGENT</span>}
                      </div>
                      <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 4px' }}>
                        {FOOD_TYPES[d.food_type]?.emoji || 'Food'} {d.food_type} &nbsp;·&nbsp; {d.quantity_kg}kg &nbsp;·&nbsp; {d.serves_people} people
                      </p>
                      <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 8px' }}>{d.address}</p>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '4px 10px', borderRadius: 8,
                        background: urgent ? '#FEF2F2' : '#F9FAFB',
                        border: `1px solid ${urgent ? '#FECACA' : '#E5E7EB'}`,
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: urgent ? '#DC2626' : '#6B7280' }}>
                          {hoursLeft}h left
                        </span>
                        <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                          · {new Date(d.expires_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {d.status === 'claimed' && (
                        <button onClick={() => { setAssignTarget(d.id); setShowModal(true); }} style={{
                          padding: '9px 16px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                          color: '#fff', border: 'none', borderRadius: 10,
                          fontWeight: 700, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap',
                        }}>Assign Volunteer</button>
                      )}
                      {d.status === 'assigned' && (
                        <span style={{ fontSize: 12, color: '#D97706', fontWeight: 600, background: '#FFFBEB', border: '1px solid #FDE68A', padding: '6px 12px', borderRadius: 8 }}>
                          Pickup in progress
                        </span>
                      )}
                      {d.status === 'completed' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                          <span style={{ fontSize: 12, color: '#059669', fontWeight: 600, background: '#ECFDF5', border: '1px solid #6EE7B7', padding: '6px 12px', borderRadius: 8 }}>
                            Delivered
                          </span>
                          {ratingMsg[d.id] ? (
                            <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>{ratingMsg[d.id]}</span>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <select
                                value={ratingMap[d.id] || ''}
                                onChange={e => setRatingMap(prev => ({ ...prev, [d.id]: e.target.value }))}
                                style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #E5E7EB' }}
                              >
                                <option value=''>Rate volunteer</option>
                                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} ⭐</option>)}
                              </select>
                              <button
                                onClick={() => submitRating(d.id)}
                                disabled={!ratingMap[d.id]}
                                style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: ratingMap[d.id] ? '#6366f1' : '#E5E7EB', color: ratingMap[d.id] ? '#fff' : '#9CA3AF', border: 'none', cursor: ratingMap[d.id] ? 'pointer' : 'not-allowed', fontWeight: 700 }}
                              >Submit</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setSelectedVolunteer(null); }} title="Assign Volunteer">
        <div className="space-y-4">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(volunteers || []).length === 0
              ? <p className="text-sm text-gray-500 text-center py-4">No volunteers registered yet.</p>
              : (volunteers || []).map(v => (
                <div key={v.id} onClick={() => setSelectedVolunteer(v.id)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedVolunteer === v.id ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{v.name}</p>
                      <p className="text-sm text-gray-500">{v.address || 'No address'}</p>
                    </div>
                    <Badge variant="success" size="sm">{parseFloat(v.rating || 5).toFixed(1)} stars</Badge>
                  </div>
                </div>
              ))
            }
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => { setShowModal(false); setSelectedVolunteer(null); }}>Cancel</Button>
            <Button fullWidth disabled={!selectedVolunteer} loading={assignLoading} onClick={handleAssign}>Assign</Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};



// ─── NGO Smart Engine: Donation Priority Dashboard ────────────────────────────
// Purpose: Ranks nearby donations by ML spoilage risk so the NGO knows
//          WHICH donation to claim first. Uses the real trained GradientBoosting
//          model (94.56% accuracy) + Gemini for a plain-English action summary.
const NGOSmartEngine = () => {
  const { user } = useAuth();

  const { data: claimed, loading: pageLoading, refetch: refetchClaims } = useAPI('/donations/my-claims');

  const [analysis, setAnalysis]       = useState(null);  // Full analysis from /ai/claimed-analysis
  const [analyzing, setAnalyzing]     = useState(false);
  const [analyzed, setAnalyzed]       = useState(false);

  const activeClaims = (claimed || []).filter(d => d.status !== 'completed');
  const activeIds = new Set(activeClaims.map(d => d.id));

  // Run comprehensive AI analysis using the combined endpoint
  const runAnalysis = async () => {
    if (activeClaims.length === 0) return;
    setAnalyzing(true); setAnalysis(null);

    try {
      const res = await api.get('/ai/claimed-analysis');
      setAnalysis(res.data);
      setAnalyzed(true);
    } catch (error) {
      console.error('Analysis failed:', error);
      // Fallback to individual calls if combined endpoint fails
      const results = await Promise.allSettled(
        activeClaims.map(d => api.get(`/ml/expiry-risk/${d.id}`).then(r => ({ id: d.id, data: r.data })))
      );
      const riskMap = {};
      results.forEach(r => {
        if (r.status === 'fulfilled') riskMap[r.value.id] = r.value.data;
      });
      setAnalysis({ items: Object.entries(riskMap).map(([id, data]) => ({ donation_id: parseInt(id), ...data })), gemini_plan: null, total: Object.keys(riskMap).length });
      setAnalyzed(true);
    }

    setAnalyzing(false);
  };

  // Get item data from analysis or fallback
  const getItemData = (donationId) => {
    if (!analysis?.items) return null;
    return analysis.items.find(item => item.donation_id === donationId);
  };

  // Sort by risk score descending once analysis is done
  const sortedDonations = analyzed && analysis?.items
    ? [...activeClaims].filter(d => activeIds.has(d.id)).sort((a, b) => {
        const aData = getItemData(a.id);
        const bData = getItemData(b.id);
        return (bData?.risk_score || 0) - (aData?.risk_score || 0);
      })
    : activeClaims;

  const RISK_META = {
    high:    { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'HIGH RISK',   icon: 'Claim Now' },
    medium:  { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'MEDIUM RISK', icon: 'Claim Soon' },
    low:     { color: '#059669', bg: '#ECFDF5', border: '#6EE7B7', label: 'LOW RISK',    icon: 'Can Wait' },
    expired: { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', label: 'EXPIRED',     icon: 'Expired' },
  };

  return (
    <Layout>
      <div className="space-y-6">

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 16, padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: 0 }}>AI-Powered Claim Analysis</h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 }}>
              Get comprehensive ML predictions and Gemini AI action plans for all your claimed donations
            </p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '8px 14px', color: '#fff', fontSize: 11, fontWeight: 700, textAlign: 'right' }}>
            <div>ML + Gemini AI</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 400 }}>Smart handling guidance</div>
          </div>
        </div>

        {/* How it works */}
        <div style={{ background: '#F0FDF9', border: '1.5px solid #D1FAE5', borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>🧠</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: 13, color: '#064E3B', margin: 0 }}>How this works</p>
            <p style={{ fontSize: 12, color: '#6B7280', margin: '3px 0 0', lineHeight: 1.6 }}>
              Click "Run AI Analysis" to get comprehensive ML spoilage prediction and Gemini AI guidance for all your claimed donations at once.
              See an overall action plan plus detailed per-item analysis with the factors that drove each prediction.
              Focus on high-risk items to prevent waste and maximize impact.
            </p>
          </div>
        </div>

        {/* Analyze button */}
        {!analyzing && (
          <button
            onClick={runAnalysis}
            disabled={pageLoading || activeClaims.length === 0}
            style={{
              width: '100%', padding: '13px',
              background: activeClaims.length === 0 ? '#E5E7EB' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: activeClaims.length === 0 ? '#9CA3AF' : '#fff',
              border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15,
              cursor: activeClaims.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {pageLoading ? 'Loading claims...'
             : activeClaims.length === 0 ? 'No active claims to analyze'
             : analyzed ? `Re-run AI Analysis (${activeClaims.length} claims)`
             : `Run AI Analysis on ${activeClaims.length} Active Claims`}
          </button>
        )}

        {analyzing && (
          <div style={{ textAlign: 'center', padding: '32px', background: '#F0FDF9', borderRadius: 12, border: '1.5px solid #D1FAE5' }}>
            <div style={{ width: 36, height: 36, border: '4px solid #D1FAE5', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 700, color: '#6366f1', fontSize: 14, margin: 0 }}>Running AI analysis...</p>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Evaluating spoilage risk and generating Gemini AI advice</p>
          </div>
        )}

        {/* Overall Gemini Action Plan */}
        {analyzed && analysis?.gemini_plan && (
          <div style={{ background: '#F0F9FF', border: '1.5px solid #BAE6FD', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>🎯</span>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: 16, color: '#0C4A6E', margin: 0 }}>AI Action Plan</h3>
                <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>Comprehensive guidance for all your claimed donations</p>
              </div>
            </div>
            <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {analysis.gemini_plan}
            </div>
          </div>
        )}

        {/* Priority list */}
        {pageLoading ? <Spinner /> : sortedDonations.length === 0 ? (
          <Alert variant="info">No active claimed donations found. Claim some donations first.</Alert>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Legend */}
            {analyzed && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                <p style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, margin: 0, alignSelf: 'center' }}>Risk level:</p>
                {[['high','#DC2626','#FEF2F2'],['medium','#D97706','#FFFBEB'],['low','#059669','#ECFDF5']].map(([r,c,bg]) => (
                  <span key={r} style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: bg, color: c, border: `1px solid ${c}33` }}>
                    {r.toUpperCase()}
                  </span>
                ))}
                <span style={{ fontSize: 11, color: '#9CA3AF', alignSelf: 'center' }}>· Sorted by urgency</span>
              </div>
            )}

            {sortedDonations.map((d, idx) => {
              const itemData = getItemData(d.id);
              const rm       = itemData ? RISK_META[itemData.risk] || RISK_META.low : null;
              const hoursLeft = Math.max(0, Math.round((new Date(d.expires_at) - new Date()) / 3600000));
              const hoursSince = d.prepared_at ? Math.max(0, Math.round((new Date() - new Date(d.prepared_at)) / 3600000)) : null;

              return (
                <div key={d.id} style={{
                  background: '#fff',
                  border: `1.5px solid ${rm ? rm.border : '#E5E7EB'}`,
                  borderRadius: 14,
                  overflow: 'hidden',
                  boxShadow: rm?.color === '#DC2626' ? '0 0 0 2px #FECACA' : '0 2px 8px rgba(0,0,0,0.05)',
                }}>
                  <div style={{ display: 'flex' }}>
                    {/* Rank number */}
                    <div style={{
                      width: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: analyzed && rm ? rm.bg : '#F9FAFB',
                      borderRight: `1.5px solid ${rm ? rm.border : '#E5E7EB'}`,
                    }}>
                      {analyzed
                        ? <span style={{ fontWeight: 800, fontSize: 18, color: rm?.color || '#6B7280' }}>#{idx + 1}</span>
                        : <span style={{ fontWeight: 700, fontSize: 14, color: '#9CA3AF' }}>{idx + 1}</span>
                      }
                    </div>

                    {/* Photo */}
                    {d.photo_url && (
                      <img src={d.photo_url} alt={d.food_name}
                        onError={e => { e.target.style.display = 'none'; }}
                        style={{ width: 90, objectFit: 'cover', flexShrink: 0 }} />
                    )}

                    {/* Content */}
                    <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                            <h3 style={{ fontWeight: 700, fontSize: 15, color: '#111827', margin: 0 }}>{d.food_name}</h3>
                            <Badge variant={d.status === 'assigned' ? 'warning' : 'info'} size="sm">
                              {d.status}
                            </Badge>
                            {analyzed && rm && (
                              <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: rm.bg, color: rm.color, border: `1px solid ${rm.border}` }}>
                                {rm.label}
                              </span>
                            )}
                            {analyzed && itemData && (
                              <span style={{ fontSize: 10, color: '#9CA3AF' }}>
                                {itemData.confidence}% confidence · {itemData.model_used ? 'ML model' : 'rule-based'}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
                            {FOOD_TYPES[d.food_type]?.emoji || ''} {d.food_type} · {d.quantity_kg}kg · {d.serves_people} people
                          </p>
                          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>{d.address}</p>
                        </div>

                        {/* Risk score bar */}
                        {analyzed && itemData && (
                          <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 60 }}>
                            <p style={{ fontWeight: 800, fontSize: 20, color: rm?.color || '#6B7280', margin: 0, lineHeight: 1 }}>
                              {Math.round(itemData.risk_score * 100)}
                            </p>
                            <p style={{ fontSize: 9, color: '#9CA3AF', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>risk score</p>
                            <div style={{ height: 4, background: '#F3F4F6', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${itemData.risk_score * 100}%`, background: rm?.color || '#6B7280', borderRadius: 2 }} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Time info row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 8,
                          background: hoursLeft < 2 ? '#FEF2F2' : '#F9FAFB',
                          color: hoursLeft < 2 ? '#DC2626' : '#6B7280',
                          border: `1px solid ${hoursLeft < 2 ? '#FECACA' : '#E5E7EB'}`,
                        }}>
                          {hoursLeft}h left to expire
                        </span>
                        {hoursSince !== null && (
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 8,
                            background: '#F3F4F6', color: '#4B5563',
                            border: '1px solid #D1D5DB',
                          }}>
                            Prepared {hoursSince}h ago
                          </span>
                        )}
                      </div>

                      {/* ML Feature Breakdown */}
                      {analyzed && itemData && itemData.model_used && (
                        <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '8px 10px', marginBottom: 8 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            ML Analysis Factors
                          </p>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 9, color: '#374151', background: '#E5E7EB', padding: '2px 6px', borderRadius: 4 }}>
                              {d.food_type} food
                            </span>
                            <span style={{ fontSize: 9, color: '#374151', background: '#E5E7EB', padding: '2px 6px', borderRadius: 4 }}>
                              {d.quantity_kg}kg quantity
                            </span>
                            <span style={{ fontSize: 9, color: '#374151', background: '#E5E7EB', padding: '2px 6px', borderRadius: 4 }}>
                              {hoursSince || 2}h since prep
                            </span>
                            <span style={{ fontSize: 9, color: '#374151', background: '#E5E7EB', padding: '2px 6px', borderRadius: 4 }}>
                              {hoursLeft}h until expiry
                            </span>
                          </div>
                        </div>
                      )}

                      {/* AI Action from Gemini Plan */}
                      {analyzing && (
                        <span style={{ fontSize: 11, color: '#9CA3AF' }}>Generating AI advice...</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

const NGORoutePlanner = () => {
  const { user } = useAuth();
  const ngoLat   = parseFloat(user?.lat) || DISTRICT_CENTER.lat;
  const ngoLng   = parseFloat(user?.lng) || DISTRICT_CENTER.lng;
  const ngoLabel = user?.address || user?.name || 'My NGO (Delivery Point)';

  const startStop    = { id: 'start',    label: 'My Location (Start)', lat: ngoLat, lng: ngoLng, type: 'start',    address: ngoLabel };
  const deliveryStop = { id: 'delivery', label: ngoLabel,              lat: ngoLat, lng: ngoLng, type: 'delivery', address: ngoLabel };

  const [stops, setStops]           = useState([startStop, deliveryStop]);
  const [result, setResult]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [form, setForm]             = useState({ label: '', lat: '', lng: '', address: '' });
  const [msg, setMsg]               = useState('');
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [sending, setSending]       = useState(false);
  const [sendMsg, setSendMsg]       = useState(null);

  const { data: claimedDonations, loading: loadingDonations } = useAPI('/donations/my-claims');
  const { data: volunteers } = useAPI('/users/volunteers');
  const claimed = (claimedDonations || []).filter(d => d.status === 'claimed' && d.lat && d.lng);

  // When a volunteer is selected, update the start stop to their location
  const handleSelectVolunteer = (vid) => {
    setSelectedVolunteer(vid);
    const v = (volunteers || []).find(vol => vol.id === vid);
    if (v?.lat && v?.lng) {
      const vStart = { id: 'start', label: `${v.name} (Start)`, lat: parseFloat(v.lat), lng: parseFloat(v.lng), type: 'start', address: v.address || v.name };
      setStops(prev => [vStart, ...prev.slice(1)]);
      setResult(null);
    }
  };

  const isAdded = (id) => stops.some(s => s.id === `d-${id}`);

  const addDonationStop = (d) => {
    if (isAdded(d.id)) return;
    setStops(prev => [
      ...prev.filter(s => s.id !== 'delivery'),
      { id: `d-${d.id}`, label: d.food_name, lat: parseFloat(d.lat), lng: parseFloat(d.lng), type: 'pickup', address: d.address },
      deliveryStop,
    ]);
    setResult(null);
  };

  const addManualStop = () => {
    if (!form.label || !form.lat || !form.lng) { setMsg('Fill label, latitude and longitude'); return; }
    setStops(prev => [
      ...prev.filter(s => s.id !== 'delivery'),
      { id: Date.now().toString(), label: form.label, lat: parseFloat(form.lat), lng: parseFloat(form.lng), type: 'pickup', address: form.address || `${parseFloat(form.lat).toFixed(4)}, ${parseFloat(form.lng).toFixed(4)}` },
      deliveryStop,
    ]);
    setForm({ label: '', lat: '', lng: '', address: '' });
    setMsg(''); setResult(null); setShowManual(false);
  };

  const removeStop = (id) => { setStops(prev => prev.filter(s => s.id !== id)); setResult(null); };

  const optimize = async () => {
    const pickups = stops.filter(s => s.type === 'pickup');
    if (pickups.length === 0) { setMsg('Add at least one pickup stop'); return; }
    setLoading(true); setMsg(''); setSendMsg(null);
    try {
      const r = await api.post('/ml/multi-stop-route', { stops });
      setResult(r.data);
    } catch (e) { setMsg(e.response?.data?.detail || 'Failed to optimize'); }
    setLoading(false);
  };

  const sendRoute = async () => {
    if (!selectedVolunteer || !result) return;
    setSending(true); setSendMsg(null);
    try {
      await api.post('/volunteers/send-route', {
        volunteer_id:  selectedVolunteer,
        ordered_stops: result.ordered_stops,
        total_km:      result.total_km,
      });
      setSendMsg({ type: 'success', text: `Route sent to ${(volunteers || []).find(v => v.id === selectedVolunteer)?.name} on Telegram! ✅` });
    } catch (e) {
      setSendMsg({ type: 'error', text: e.response?.data?.detail || 'Failed to send route' });
    }
    setSending(false);
  };

  const TYPE_COLOR = { start: '#6366f1', pickup: '#f97316', delivery: '#10b981' };
  const TYPE_ICON  = { start: '📍', pickup: '🛒', delivery: '🏠' };
  const pickupCount = stops.filter(s => s.type === 'pickup').length;

  const inputStyle = { padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 16, padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: 0 }}>Route Planner 🗺️</h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 }}>Optimize volunteer pickup + delivery route</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '8px 16px', color: '#fff', fontSize: 12, fontWeight: 700 }}>
            Nearest-Neighbor TSP Algorithm
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Left: stop builder */}
          <Card>
            <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginBottom: 16 }}>Build Your Route</h3>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>Step 1: pick volunteer → Step 2: add pickups → Step 3: optimize</p>

            {msg && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>❌ {msg}</div>}

            {/* Current stops */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {stops.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#f9fafb', borderRadius: 10, border: `2px solid ${TYPE_COLOR[s.type]}33` }}>
                  <span style={{ fontSize: 18 }}>{TYPE_ICON[s.type]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: '#111827', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</p>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.address || `${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}`}</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: TYPE_COLOR[s.type], background: TYPE_COLOR[s.type] + '18', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>{s.type}</span>
                  {s.type === 'pickup' && (
                    <button onClick={() => removeStop(s.id)} style={{ background: '#fef2f2', border: 'none', color: '#ef4444', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>✕</button>
                  )}
                </div>
              ))}
            </div>

            {/* Volunteer picker — select first so start = volunteer location */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>1. Select Volunteer (sets start point)</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                {(volunteers || []).length === 0 ? (
                  <p style={{ fontSize: 12, color: '#9ca3af' }}>No volunteers registered yet.</p>
                ) : (volunteers || []).map(v => (
                  <div key={v.id} onClick={() => handleSelectVolunteer(v.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                      border: `2px solid ${selectedVolunteer === v.id ? '#6366f1' : '#e5e7eb'}`,
                      background: selectedVolunteer === v.id ? '#eef2ff' : '#fff',
                    }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 13, margin: 0, color: '#111827' }}>{v.name}</p>
                      <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>{v.address || 'No address'}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>⭐ {parseFloat(v.rating || 5).toFixed(1)}</span>
                      {v.telegram_chat_id
                        ? <span style={{ fontSize: 10, fontWeight: 700, color: '#0088cc', background: '#e8f4fd', padding: '1px 6px', borderRadius: 10 }}>✈️ Telegram</span>
                        : <span style={{ fontSize: 10, color: '#9ca3af' }}>No Telegram</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>2. Add Pickup Stops</p>
              {loadingDonations ? (
                <p style={{ fontSize: 12, color: '#9ca3af' }}>Loading...</p>
              ) : claimed.length === 0 ? (
                <p style={{ fontSize: 12, color: '#9ca3af' }}>No claimed donations with location data.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {claimed.map(d => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: isAdded(d.id) ? '#ecfdf5' : '#fff', borderRadius: 10, border: `1.5px solid ${isAdded(d.id) ? '#6ee7b7' : '#e5e7eb'}` }}>
                      <span style={{ fontSize: 16 }}>{FOOD_TYPES[d.food_type]?.emoji || '🍱'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: 13, color: '#111827', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.food_name}</p>
                        <p style={{ fontSize: 11, color: '#6b7280', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📍 {d.address}</p>
                      </div>
                      <button
                        onClick={() => addDonationStop(d)}
                        disabled={isAdded(d.id)}
                        style={{ padding: '5px 12px', background: isAdded(d.id) ? '#d1fae5' : 'linear-gradient(135deg,#f97316,#ef4444)', color: isAdded(d.id) ? '#065f46' : '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: isAdded(d.id) ? 'default' : 'pointer', fontSize: 12, flexShrink: 0 }}>
                        {isAdded(d.id) ? '✓ Added' : '+ Add'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Manual entry toggle */}
            <button
              onClick={() => setShowManual(v => !v)}
              style={{ width: '100%', padding: '8px', background: 'transparent', border: '1.5px dashed #d1d5db', borderRadius: 10, color: '#6b7280', fontWeight: 600, cursor: 'pointer', fontSize: 12, marginBottom: showManual ? 10 : 0 }}>
              {showManual ? '▲ Hide Manual Entry' : '+ Add Custom Stop Manually'}
            </button>

            {showManual && (
              <div style={{ background: '#f9fafb', borderRadius: 12, padding: 14, border: '2px dashed #e5e7eb', marginBottom: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <input style={inputStyle} placeholder="Label (e.g. Hotel Taj)" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
                  <input style={inputStyle} placeholder="Address (optional)" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                  <input style={inputStyle} placeholder="Latitude" type="number" value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} />
                  <input style={inputStyle} placeholder="Longitude" type="number" value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} />
                </div>
                <button onClick={addManualStop} style={{ width: '100%', padding: '9px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                  + Add Stop
                </button>
              </div>
            )}

            <button
              onClick={optimize}
              disabled={loading || pickupCount === 0}
              style={{ width: '100%', marginTop: 4, padding: '12px', background: pickupCount === 0 ? '#e5e7eb' : 'linear-gradient(135deg,#10b981,#06b6d4)', color: pickupCount === 0 ? '#9ca3af' : '#fff', border: 'none', borderRadius: 12, fontWeight: 800, cursor: pickupCount === 0 ? 'not-allowed' : 'pointer', fontSize: 14 }}>
              {loading ? '⏳ Optimizing...' : `🚀 3. Optimize Route (${pickupCount} pickup${pickupCount !== 1 ? 's' : ''})`}
            </button>
          </Card>

          {/* Right: result */}
          <Card>
            <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginBottom: 16 }}>Optimized Route</h3>
            {!result && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>🗺️</span>
                <p style={{ fontSize: 14 }}>Add pickups from your claimed donations, then click Optimize Route.</p>
              </div>
            )}
            {result && (
              <>
                <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                  <div style={{ flex: 1, background: '#ecfdf5', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                    <p style={{ fontWeight: 800, fontSize: 22, color: '#10b981', margin: 0 }}>{result.total_km} km</p>
                    <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>Total Distance</p>
                  </div>
                  <div style={{ flex: 1, background: '#eef2ff', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                    <p style={{ fontWeight: 800, fontSize: 22, color: '#6366f1', margin: 0 }}>{result.stop_count}</p>
                    <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>Total Stops</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {result.ordered_stops.map((s, i) => {
                    const meta = stops.find(st => st.id === s.id);
                    const addr = meta?.address || s.label;
                    return (
                      <div key={s.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: TYPE_COLOR[s.type], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13 }}>{i + 1}</div>
                          {i < result.ordered_stops.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 24, background: '#e5e7eb', margin: '4px 0' }} />}
                        </div>
                        <div style={{ flex: 1, paddingBottom: 16, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                            <p style={{ fontWeight: 700, fontSize: 14, color: '#111827', margin: 0 }}>{TYPE_ICON[s.type]} {s.label}</p>
                            {s.leg_km > 0 && <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, flexShrink: 0 }}>+{s.leg_km} km</span>}
                          </div>
                          <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📍 {addr}</p>
                          <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>cumulative: {s.cumulative_km} km</p>
                          <span style={{ fontSize: 10, fontWeight: 700, color: TYPE_COLOR[s.type], background: TYPE_COLOR[s.type] + '18', padding: '2px 8px', borderRadius: 20 }}>{s.type}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Send Route to Volunteer */}
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1.5px solid #e5e7eb' }}>
                  <p style={{ fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 10 }}>
                    ✈️ Send Route to Volunteer via Telegram
                  </p>
                  <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
                    Sending to: <strong>{(volunteers || []).find(v => v.id === selectedVolunteer)?.name || 'No volunteer selected'}</strong>
                  </p>

                  {sendMsg && (
                    <div style={{
                      padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 10,
                      background: sendMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
                      color:      sendMsg.type === 'success' ? '#065f46'  : '#dc2626',
                      border:     `1px solid ${sendMsg.type === 'success' ? '#6ee7b7' : '#fecaca'}`,
                    }}>{sendMsg.text}</div>
                  )}

                  <button
                    onClick={sendRoute}
                    disabled={!selectedVolunteer || sending}
                    style={{
                      width: '100%', padding: '11px',
                      background: !selectedVolunteer ? '#e5e7eb' : 'linear-gradient(135deg,#0088cc,#229ed9)',
                      color: !selectedVolunteer ? '#9ca3af' : '#fff',
                      border: 'none', borderRadius: 10, fontWeight: 800,
                      cursor: !selectedVolunteer ? 'not-allowed' : 'pointer', fontSize: 13,
                      opacity: sending ? 0.7 : 1,
                    }}
                  >
                    {sending ? 'Sending...' : '✈️ Send Route on Telegram'}
                  </button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
};

const NGOLiveMap = () => {
  const { user } = useAuth();
  const ngoLat = parseFloat(user?.lat) || DISTRICT_CENTER.lat;
  const ngoLng = parseFloat(user?.lng) || DISTRICT_CENTER.lng;

  // urgency filter: 'all' | '2h' | '6h'
  const [urgency, setUrgency]           = useState('all');
  const [heatOn, setHeatOn]             = useState(true);
  const [selected, setSelected]         = useState(null);   // donation clicked on map
  const [modal, setModal]               = useState(null);   // 'action' | 'assign'
  const [selVolunteer, setSelVolunteer] = useState(null);
  const [actionMsg, setActionMsg]       = useState(null);

  const { data: nearby,   loading: nearbyLoading,  refetch: refetchNearby  } = useAPI(`/donations/nearby?lat=${ngoLat}&lng=${ngoLng}&radius_km=50`);
  const { data: myClaims, loading: claimsLoading,  refetch: refetchClaims  } = useAPI('/donations/my-claims');
  const { data: volunteers } = useAPI('/users/volunteers');

  const { mutate: claimDonation }    = useMutate();
  const { mutate: assignVolunteer,  loading: assignLoading  } = useMutate();
  const { mutate: selfCollect,      loading: selfLoading    } = useMutate();

  const hoursLeft = (exp) => Math.max(0, ((new Date(exp) - new Date()) / 3600000));

  const filteredNearby = (nearby || []).filter(d => {
    const h = hoursLeft(d.expires_at);
    if (urgency === '2h') return h <= 2;
    if (urgency === '6h') return h <= 6;
    return true;
  });

  // stats
  const expiringSoon = (nearby || []).filter(d => hoursLeft(d.expires_at) <= 2).length;
  const activeClaims = (myClaims || []).filter(d => ['claimed','assigned'].includes(d.status)).length;

  const heatPoints = (nearby || []).map(d => [
    parseFloat(d.lat), parseFloat(d.lng),
    hoursLeft(d.expires_at) <= 2 ? 1.0 : hoursLeft(d.expires_at) <= 6 ? 0.6 : 0.3,
  ]);

  const openAction = (d) => { setSelected(d); setModal('action'); setActionMsg(null); };
  const closeModal = () => { setModal(null); setSelected(null); setSelVolunteer(null); setActionMsg(null); };

  const handleClaim = async () => {
    try {
      await claimDonation('PATCH', `/donations/${selected.id}/claim`);
      setActionMsg({ type: 'success', text: 'Claimed! Now assign a volunteer or self-collect.' });
      refetchNearby(); refetchClaims();
    } catch (e) { setActionMsg({ type: 'error', text: e.message }); }
  };

  const handleSelfCollect = async () => {
    try {
      await selfCollect('PATCH', `/donations/${selected.id}/self-collect`);
      setActionMsg({ type: 'success', text: 'Marked as collected by your NGO!' });
      refetchNearby(); refetchClaims();
      setTimeout(closeModal, 1500);
    } catch (e) { setActionMsg({ type: 'error', text: e.message }); }
  };

  const handleAssign = async () => {
    if (!selVolunteer) return;
    try {
      await assignVolunteer('PATCH', `/donations/${selected.id}/assign/${selVolunteer}`);
      setActionMsg({ type: 'success', text: 'Volunteer assigned!' });
      refetchClaims();
      setTimeout(closeModal, 1500);
    } catch (e) { setActionMsg({ type: 'error', text: e.message }); }
  };

  // Build map markers: nearby (posted) + my active claims
  const myClaimIds = new Set((myClaims || []).map(d => d.id));
  const allMapDonations = [
    ...filteredNearby,
    ...(myClaims || []).filter(d => ['claimed','assigned'].includes(d.status)),
  ].filter((d, i, arr) => arr.findIndex(x => x.id === d.id) === i); // dedupe

  const urgencyColor = (d) => {
    const h = hoursLeft(d.expires_at);
    if (d.status === 'claimed' || d.status === 'assigned') return '#6366f1';
    if (h <= 2)  return '#ef4444';
    if (h <= 6)  return '#f59e0b';
    return '#10b981';
  };

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 16, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>Field Operations Map 🗺️</h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 }}>Click any marker to claim, assign a volunteer, or self-collect</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <StatPill icon="🍱" label="Nearby" value={filteredNearby.length} color="#fff" />
            <StatPill icon="📋" label="My Active" value={activeClaims} color="#a5f3fc" />
            <StatPill icon="🔴" label="Expiring &lt;2h" value={expiringSoon} color="#fca5a5" />
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Filter by urgency:</span>
          {[['all','All'],['6h','Expiring &lt;6h'],['2h','Critical &lt;2h']].map(([v, label]) => (
            <button key={v} onClick={() => setUrgency(v)}
              style={{ padding: '6px 14px', borderRadius: 20, border: '1.5px solid', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                borderColor: urgency === v ? '#6366f1' : '#e5e7eb',
                background: urgency === v ? '#eef2ff' : '#fff',
                color: urgency === v ? '#6366f1' : '#6b7280' }}>
              {label}
            </button>
          ))}
          <button onClick={() => setHeatOn(v => !v)}
            style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 20, border: '1.5px solid', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              borderColor: heatOn ? '#f59e0b' : '#e5e7eb',
              background: heatOn ? '#fffbeb' : '#fff',
              color: heatOn ? '#d97706' : '#6b7280' }}>
            🌡️ Heatmap {heatOn ? 'ON' : 'OFF'}
          </button>
          <button onClick={() => { refetchNearby(); refetchClaims(); }}
            style={{ padding: '6px 14px', borderRadius: 20, border: '1.5px solid #e5e7eb', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: '#fff', color: '#6b7280' }}>
            🔄 Refresh
          </button>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: '#374151' }}>
          <LegendDot color="#10b981" label="Available (>6h)" />
          <LegendDot color="#f59e0b" label="Expiring <6h" />
          <LegendDot color="#ef4444" label="Critical <2h" />
          <LegendDot color="#6366f1" label="Your claimed/assigned" />
        </div>

        {/* Map */}
        {(nearbyLoading || claimsLoading) ? <Spinner /> : (
          <OperationsMap
            donations={allMapDonations}
            ngoLat={ngoLat}
            ngoLng={ngoLng}
            heatPoints={heatOn ? heatPoints : []}
            urgencyColor={urgencyColor}
            myClaimIds={myClaimIds}
            hoursLeft={hoursLeft}
            onMarkerClick={openAction}
          />
        )}

        {/* Action Modal */}
        <Modal isOpen={modal === 'action'} onClose={closeModal} title="">
          {selected && (
            <div className="space-y-4">
              {/* Donation info */}
              <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: 16, color: '#111827', margin: 0 }}>{selected.food_name}</p>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>{selected.quantity_kg}kg · serves {selected.serves_people} people</p>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>📍 {selected.address}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: hoursLeft(selected.expires_at) <= 2 ? '#ef4444' : '#f59e0b', margin: 0 }}>
                      ⏰ {hoursLeft(selected.expires_at).toFixed(1)}h left
                    </p>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#eef2ff', color: '#6366f1', fontWeight: 700 }}>{selected.status}</span>
                  </div>
                </div>
              </div>

              {actionMsg && (
                <Alert variant={actionMsg.type === 'error' ? 'error' : 'success'}>{actionMsg.text}</Alert>
              )}

              {/* Actions based on status */}
              {selected.status === 'posted' && !actionMsg?.type === 'success' && (
                <>
                  <p style={{ fontSize: 13, color: '#374151', fontWeight: 600, margin: 0 }}>What would you like to do?</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {/* Option A: Claim then assign volunteer */}
                    <button onClick={handleClaim}
                      style={{ padding: '14px 10px', borderRadius: 12, border: '2px solid #6366f1', background: '#eef2ff', cursor: 'pointer', textAlign: 'center' }}>
                      <p style={{ fontSize: 20, margin: '0 0 6px' }}>🚴</p>
                      <p style={{ fontWeight: 700, fontSize: 13, color: '#4338ca', margin: 0 }}>Claim &amp; Assign Volunteer</p>
                      <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0' }}>A volunteer picks up &amp; delivers</p>
                    </button>
                    {/* Option B: Self-collect */}
                    <button onClick={handleSelfCollect} disabled={selfLoading}
                      style={{ padding: '14px 10px', borderRadius: 12, border: '2px solid #10b981', background: '#ecfdf5', cursor: 'pointer', textAlign: 'center' }}>
                      <p style={{ fontSize: 20, margin: '0 0 6px' }}>🏢</p>
                      <p style={{ fontWeight: 700, fontSize: 13, color: '#065f46', margin: 0 }}>We'll Collect Ourselves</p>
                      <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0' }}>NGO picks up directly, no volunteer</p>
                    </button>
                  </div>
                </>
              )}

              {/* Already claimed by this NGO — show assign or self-collect */}
              {selected.status === 'claimed' && myClaimIds.has(selected.id) && (
                <>
                  <p style={{ fontSize: 13, color: '#374151', fontWeight: 600, margin: 0 }}>You've claimed this. Next step:</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button onClick={() => setModal('assign')}
                      style={{ padding: '14px 10px', borderRadius: 12, border: '2px solid #6366f1', background: '#eef2ff', cursor: 'pointer', textAlign: 'center' }}>
                      <p style={{ fontSize: 20, margin: '0 0 6px' }}>🚴</p>
                      <p style={{ fontWeight: 700, fontSize: 13, color: '#4338ca', margin: 0 }}>Assign Volunteer</p>
                    </button>
                    <button onClick={handleSelfCollect} disabled={selfLoading}
                      style={{ padding: '14px 10px', borderRadius: 12, border: '2px solid #10b981', background: '#ecfdf5', cursor: 'pointer', textAlign: 'center' }}>
                      <p style={{ fontSize: 20, margin: '0 0 6px' }}>🏢</p>
                      <p style={{ fontWeight: 700, fontSize: 13, color: '#065f46', margin: 0 }}>Self-Collect</p>
                    </button>
                  </div>
                </>
              )}

              {selected.status === 'assigned' && (
                <Alert variant="info">✅ Volunteer already assigned. Waiting for pickup confirmation.</Alert>
              )}

              {selected.status === 'completed' && (
                <Alert variant="success">🎉 This donation has been completed.</Alert>
              )}

              <Button variant="secondary" fullWidth onClick={closeModal}>Close</Button>
            </div>
          )}
        </Modal>

        {/* Assign Volunteer Modal */}
        <Modal isOpen={modal === 'assign'} onClose={() => setModal('action')} title="Assign a Volunteer">
          {selected && (
            <div className="space-y-4">
              <p style={{ fontSize: 13, color: '#6b7280' }}>Pickup: <strong>{selected.food_name}</strong> · {selected.address}</p>
              <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(volunteers || []).length === 0
                  ? <Alert variant="info">No volunteers registered yet.</Alert>
                  : (volunteers || []).map(v => (
                    <div key={v.id} onClick={() => setSelVolunteer(v.id)}
                      style={{ padding: '10px 14px', borderRadius: 10, border: `2px solid ${selVolunteer === v.id ? '#6366f1' : '#e5e7eb'}`, background: selVolunteer === v.id ? '#eef2ff' : '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{v.name}</p>
                        <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{v.address || 'No address'}</p>
                      </div>
                      <Badge variant="success" size="sm">⭐ {parseFloat(v.rating || 5).toFixed(1)}</Badge>
                    </div>
                  ))
                }
              </div>
              {actionMsg && <Alert variant={actionMsg.type === 'error' ? 'error' : 'success'}>{actionMsg.text}</Alert>}
              <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="secondary" fullWidth onClick={() => setModal('action')}>← Back</Button>
                <Button fullWidth disabled={!selVolunteer} loading={assignLoading} onClick={handleAssign}>✓ Assign</Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

// ─── Sub-components for the map page ─────────────────────────────────────────
const StatPill = ({ icon, label, value, color }) => (
  <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
    <span style={{ fontSize: 14 }}>{icon}</span>
    <span style={{ fontSize: 12, color, fontWeight: 700 }}>{value} {label}</span>
  </div>
);

const LegendDot = ({ color, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
    <span>{label}</span>
  </div>
);

// Leaflet map wired for operations
const OperationsMap = ({ donations, ngoLat, ngoLng, heatPoints, urgencyColor, myClaimIds, hoursLeft, onMarkerClick }) => {
  const ngoIcon = new L.DivIcon({
    html: '<div style="background:#6366f1;color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🏢</div>',
    className: '', iconSize: [32, 32], iconAnchor: [16, 16],
  });

  return (
    <MapContainer center={[ngoLat, ngoLng]} zoom={12} style={{ height: 520, width: '100%', borderRadius: 12 }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />

      {/* NGO location */}
      <Marker position={[ngoLat, ngoLng]} icon={ngoIcon}>
        <Popup><strong>Your NGO Location</strong></Popup>
      </Marker>

      {/* Donation markers as circles — color = urgency */}
      {donations.map(d => (
        <CircleMarker
          key={d.id}
          center={[parseFloat(d.lat), parseFloat(d.lng)]}
          radius={myClaimIds.has(d.id) ? 14 : 10}
          pathOptions={{
            color: urgencyColor(d),
            fillColor: urgencyColor(d),
            fillOpacity: 0.85,
            weight: myClaimIds.has(d.id) ? 3 : 1.5,
          }}
          eventHandlers={{ click: () => onMarkerClick(d) }}
        >
          <Popup>
            <div style={{ minWidth: 160 }}>
              <p style={{ fontWeight: 700, margin: '0 0 4px' }}>{d.food_name}</p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{d.quantity_kg}kg · {d.serves_people} people</p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0' }}>⏰ {hoursLeft(d.expires_at).toFixed(1)}h left</p>
              <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>📍 {d.address}</p>
              <button onClick={() => onMarkerClick(d)}
                style={{ marginTop: 8, width: '100%', padding: '6px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
                Take Action →
              </button>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
};

export default NGOPageNew;

