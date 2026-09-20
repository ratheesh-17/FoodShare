import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Button, Card, Badge, Alert, Spinner, Modal } from '../components/UI';
import { useAPI, useMutate } from '../hooks';
import Layout from '../components/Layout';
import api from '../api';
import FoodMap, { fetchRoute } from '../components/FoodMap';

// ─── Shell with sub-routes ────────────────────────────────────────────────────
const VolunteerPageNew = () => (
  <Routes>
    <Route index element={<VolunteerMain />} />
    <Route path="map" element={<VolunteerMap />} />
  </Routes>
);

// ─── Main: Task Board ─────────────────────────────────────────────────────────
const VolunteerMain = () => {
  const { user } = useAuth();
  const { data: tasks, loading: tasksLoading, refetch: refetchTasks } = useAPI('/volunteers/my-tasks', { pollInterval: 20000 });
  const { mutate: completeTask } = useMutate();

  const [selectedTask, setSelectedTask]       = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showProofModal, setShowProofModal]   = useState(false);
  const [proofPhoto, setProofPhoto]           = useState(null);
  const [proofPreview, setProofPreview]       = useState(null);
  const [completing, setCompleting]           = useState(null);
  const [msg, setMsg]                         = useState(null);

  const activeTasks    = (tasks || []).filter(t => t.status !== 'delivered');
  const completedTasks = (tasks || []).filter(t => t.status === 'delivered');

  const stats = {
    total:     (tasks || []).length,
    active:    activeTasks.length,
    delivered: completedTasks.length,
    rating:    parseFloat(user?.rating || 5).toFixed(1),
  };

  const handleComplete = async () => {
    if (!selectedTask) return;
    setCompleting(selectedTask.donation_id);
    try {
      let photoUrl = 'https://placeholder.com/food.jpg';
      if (proofPhoto) {
        const formData = new FormData();
        formData.append('file', proofPhoto);
        const uploadRes = await api.post('/upload/photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        photoUrl = uploadRes.data.url;
      }
      await completeTask('PATCH', `/donations/${selectedTask.donation_id}/complete`, null, {
        params: { pickup_photo_url: photoUrl },
      });
      setShowProofModal(false);
      setProofPhoto(null); setProofPreview(null);
      setMsg('Delivery completed! Great work.');
      refetchTasks();
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setCompleting(null);
    }
  };

  const handleProofPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofPhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => setProofPreview(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">My Task Board</h1>
          <p className="text-gray-600 mt-1">Manage your food rescue missions in Nagercoil & KK District</p>
        </div>

        {msg && (
          <Alert variant={msg.startsWith('Error') ? 'error' : 'success'} dismissible onDismiss={() => setMsg(null)}>
            {msg}
          </Alert>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Tasks', value: stats.total,     color: 'text-primary-600', bg: 'bg-primary-50' },
            { label: 'Active',      value: stats.active,    color: 'text-yellow-600',  bg: 'bg-yellow-50' },
            { label: 'Delivered',   value: stats.delivered, color: 'text-green-600',   bg: 'bg-green-50' },
            { label: 'My Rating',   value: `⭐ ${stats.rating}`, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(s => (
            <Card key={s.label} border className={s.bg}>
              <p className="text-sm text-gray-600">{s.label}</p>
              <p className={`text-3xl font-bold mt-2 ${s.color}`}>{s.value}</p>
            </Card>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">🚀 Active Tasks</h2>
            {activeTasks.length > 0 && <Badge variant="warning">{activeTasks.length} pending</Badge>}
          </div>
          {tasksLoading ? <Spinner /> : activeTasks.length > 0 ? (
            <div className="space-y-4">
              {activeTasks.map(task => (
                <Card key={task.id} border className="hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-gray-900">Task #{task.id}</h3>
                        <Badge variant={task.status === 'assigned' ? 'warning' : 'info'} size="sm">
                          {task.status === 'assigned' ? '📋 Assigned' : '📦 Picked Up'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div>
                          <p className="text-gray-500 text-xs font-semibold uppercase">Donation ID</p>
                          <p className="font-medium text-gray-900">#{task.donation_id}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs font-semibold uppercase">Assigned</p>
                          <p className="font-medium text-gray-900">{new Date(task.assigned_at).toLocaleDateString('en-IN')}</p>
                        </div>
                      </div>
                      {task.estimated_arrival && (
                        <p className="text-sm text-gray-600">⏰ ETA: {new Date(task.estimated_arrival).toLocaleString('en-IN')}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedTask(task); setShowDetailModal(true); }}>Details</Button>
                      <Button size="sm" onClick={() => { setSelectedTask(task); setShowProofModal(true); }}>Complete ✓</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Alert variant="info">No active tasks right now. NGOs will assign tasks when they claim donations.</Alert>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">✅ Completed Tasks ({completedTasks.length})</h2>
          {completedTasks.length > 0 ? (
            <div className="space-y-3">
              {completedTasks.slice(0, 5).map(task => (
                <Card key={task.id} border className="opacity-80 hover:opacity-100 transition-opacity">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-900">Task #{task.id} — Donation #{task.donation_id}</p>
                      <p className="text-sm text-gray-500">Assigned: {new Date(task.assigned_at).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="success">Delivered</Badge>
                      {task.pickup_photo_url && task.pickup_photo_url !== 'https://placeholder.com/food.jpg' && (
                        <a href={task.pickup_photo_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary-600 hover:underline mt-1 block">View proof →</a>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              {completedTasks.length > 5 && (
                <p className="text-sm text-gray-500 text-center">+{completedTasks.length - 5} more completed tasks</p>
              )}
            </div>
          ) : (
            <Alert variant="info">No completed tasks yet. Complete your first task above!</Alert>
          )}
        </div>

        <Card header="💡 Task Tips">
          <ul className="space-y-2 text-sm text-gray-700">
            {[
              'Pick up food as soon as assigned to prevent expiry',
              'Upload a proof photo at delivery for rating boost',
              'Complete tasks before expiry time for full score',
              'Your rating affects future task assignments',
            ].map((tip, i) => (
              <li key={i} className="flex gap-2"><span className="text-primary-600">✓</span>{tip}</li>
            ))}
          </ul>
        </Card>
      </div>

      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Task Details">
        {selectedTask && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500 uppercase font-semibold">Task ID</p><p className="font-medium">#{selectedTask.id}</p></div>
              <div><p className="text-xs text-gray-500 uppercase font-semibold">Status</p><Badge variant="warning">{selectedTask.status}</Badge></div>
              <div><p className="text-xs text-gray-500 uppercase font-semibold">Assigned At</p><p className="font-medium text-sm">{new Date(selectedTask.assigned_at).toLocaleString('en-IN')}</p></div>
              {selectedTask.estimated_arrival && (
                <div><p className="text-xs text-gray-500 uppercase font-semibold">ETA</p><p className="font-medium text-sm">{new Date(selectedTask.estimated_arrival).toLocaleString('en-IN')}</p></div>
              )}
            </div>

            {/* Route: You → Pickup → NGO */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500 uppercase font-semibold">Your Route</p>
              <div className="flex flex-col gap-2">
                {/* Step 0: Your location */}
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-lg">📍</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900">Your Location</p>
                    <p className="text-xs text-gray-500">{user?.address || 'Your current position'}</p>
                  </div>
                </div>
                <div className="text-center text-gray-400 text-sm">↓ go to pickup</div>
                {/* Step 1: Pickup (donor) */}
                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <span className="text-lg">🛒</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900">{selectedTask.donation_food_name || `Donation #${selectedTask.donation_id}`}</p>
                    <p className="text-xs text-gray-500 truncate">📍 {selectedTask.donation_address || 'Address not available'}</p>
                  </div>
                </div>
                <div className="text-center text-gray-400 text-sm">↓ deliver to</div>
                {/* Step 2: NGO drop-off */}
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="text-lg">🏢</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900">{selectedTask.ngo_name || 'NGO Drop-off Point'}</p>
                    <p className="text-xs text-gray-500 truncate">📍 {selectedTask.ngo_address || 'Address not available'}</p>
                  </div>
                </div>
              </div>
              {/* Single full-route Google Maps button */}
              {selectedTask.donation_lat && selectedTask.ngo_lat && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1${
                    user?.lat && user?.lng ? `&origin=${user.lat},${user.lng}` : ''
                  }&destination=${selectedTask.ngo_lat},${selectedTask.ngo_lng}&waypoints=${selectedTask.donation_lat},${selectedTask.donation_lng}`}
                  target="_blank" rel="noopener noreferrer"
                  className="block w-full text-center text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg py-2 mt-1"
                >
                  🗺️ Open Full Route in Google Maps
                </a>
              )}
            </div>

            <Button fullWidth onClick={() => setShowDetailModal(false)}>Close</Button>
          </div>
        )}
      </Modal>

      <Modal isOpen={showProofModal} onClose={() => { setShowProofModal(false); setProofPhoto(null); setProofPreview(null); }} title="Complete Task">
        {selectedTask && (
          <div className="space-y-4">
            <Alert variant="info">📸 Optionally upload a proof photo at the delivery location</Alert>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block">
                  <div className="border-2 border-dashed border-primary-300 rounded-lg p-6 text-center cursor-pointer hover:bg-primary-50 transition-colors">
                    <input type="file" onChange={handleProofPhotoChange} accept="image/*" className="hidden" />
                    <div className="text-4xl mb-2">{proofPhoto ? '✓' : '📸'}</div>
                    <p className="text-sm font-medium text-gray-700">{proofPhoto ? proofPhoto.name : 'Click to upload (optional)'}</p>
                  </div>
                </label>
              </div>
              {proofPreview && (
                <div>
                  <img src={proofPreview} alt="Proof" className="w-24 h-24 rounded-lg object-cover" />
                  <button type="button" onClick={() => { setProofPhoto(null); setProofPreview(null); }}
                    className="text-xs text-red-600 hover:underline mt-1 block">Remove</button>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => { setShowProofModal(false); setProofPhoto(null); setProofPreview(null); }}>Cancel</Button>
              <Button fullWidth loading={completing === selectedTask?.donation_id} onClick={handleComplete}>
                ✓ Mark as Delivered
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

// ─── Volunteer Map sub-page ───────────────────────────────────────────────────
const VolunteerMap = () => {
  const { user } = useAuth();
  const { data: tasks, loading } = useAPI('/volunteers/my-tasks', { pollInterval: 20000 });
  const [route, setRoute] = useState([]);

  React.useEffect(() => {
    if (!tasks || !user?.lat || !user?.lng) return;
    const active = tasks.find(t => t.status !== 'delivered');
    if (!active?.donation_lat || !active?.ngo_lat) return;
    // Leg 1: volunteer → pickup, Leg 2: pickup → NGO
    Promise.all([
      fetchRoute(parseFloat(user.lat), parseFloat(user.lng), parseFloat(active.donation_lat), parseFloat(active.donation_lng)),
      fetchRoute(parseFloat(active.donation_lat), parseFloat(active.donation_lng), parseFloat(active.ngo_lat), parseFloat(active.ngo_lng)),
    ]).then(([leg1, leg2]) => setRoute([...leg1, ...leg2]));
  }, [tasks]); // eslint-disable-line
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Route Map 🗺️</h1>
          <p className="text-gray-600 mt-1">Navigate to your pickup location</p>
        </div>
        {!user?.lat && (
          <Alert variant="warning">Your location is not set. Update your profile to see the route.</Alert>
        )}
        <Card>
          {loading
            ? <div className="text-center py-12 text-gray-500">Loading map...</div>
            : <FoodMap donations={[]} route={route} />}
        </Card>
      </div>
    </Layout>
  );
};

export default VolunteerPageNew;
