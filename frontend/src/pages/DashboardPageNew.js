import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Button, Card, Badge, Alert, Spinner } from '../components/UI';
import { useAPI, usePagination } from '../hooks';
import Layout from '../components/Layout';
import { COLORS, STATUS_BADGES } from '../constants';
import FoodMap from '../components/FoodMap';

const DashboardPageNew = () => (
  <Routes>
    <Route index         element={<DashboardHome />} />
    <Route path="users"  element={<DashboardUsers />} />
    <Route path="food"   element={<DashboardFood />} />
    <Route path="map"    element={<DashboardMap />} />
  </Routes>
);

const DashboardHome = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const { data: metrics, loading: metricsLoading } = useAPI('/admin/metrics');
  const { data: donations, loading: donationsLoading } = useAPI('/admin/all-donations');
  const { data: users, loading: usersLoading } = useAPI('/admin/all-users');

  const donationsPagination = usePagination(donations || [], 10);
  const usersPagination = usePagination(users || [], 10);

  if (metricsLoading) return <Layout><Spinner /></Layout>;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">System overview and management</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">Export Report</Button>
            <Button>Refresh Data</Button>
          </div>
        </div>

        {/* Key Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Donations"
              value={metrics.total_donations}
              icon="🍱"
              color="primary"
              detail="All time"
            />
            <MetricCard
              title="Meals Saved"
              value={metrics.meals_saved}
              icon="👥"
              color="success"
              detail="People served"
            />
            <MetricCard
              title="Food Rescued"
              value={`${metrics.kg_reduced}kg`}
              icon="⚖️"
              color="info"
              detail="Food weight"
            />
            <MetricCard
              title="CO₂ Avoided"
              value={`${metrics.co2_saved}kg`}
              icon="🌍"
              color="warning"
              detail="CO₂ emissions"
            />
          </div>
        )}

        {/* Active Stats */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card hover>
              <h3 className="text-sm text-gray-600 font-semibold">Active NGOs</h3>
              <p className="text-3xl font-bold text-primary-600 mt-2">{metrics.active_ngos}</p>
              <p className="text-xs text-gray-500 mt-1">Connected organizations</p>
            </Card>
            <Card hover>
              <h3 className="text-sm text-gray-600 font-semibold">Active Pickups</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">{metrics.active_pickups}</p>
              <p className="text-xs text-gray-500 mt-1">In progress</p>
            </Card>
            <Card hover>
              <h3 className="text-sm text-gray-600 font-semibold">Completed Rate</h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {metrics.total_donations > 0 ? Math.round((metrics.completed_donations / metrics.total_donations) * 100) : 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Success rate</p>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'donations', label: 'All Donations', icon: '🍱' },
            { id: 'users', label: 'All Users', icon: '👥' },
            { id: 'topdonors', label: 'Top Donors', icon: '⭐' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 font-medium transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && metrics && (
            <OverviewTab metrics={metrics} />
          )}

          {activeTab === 'donations' && (
            <DonationsTab
              donations={donationsPagination.currentItems}
              loading={donationsLoading}
              pagination={donationsPagination}
            />
          )}

          {activeTab === 'users' && (
            <UsersTab
              users={usersPagination.currentItems}
              loading={usersLoading}
              pagination={usersPagination}
            />
          )}

          {activeTab === 'topdonors' && metrics && (
            <TopDonorsTab donors={metrics.top_donors} />
          )}
        </div>
      </div>
    </Layout>
  );
};

// Metric Card Component
const MetricCard = ({ title, value, icon, color, detail }) => {
  const colorMap = {
    primary: 'bg-primary-50 border-primary-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  };

  return (
    <Card border hover className={colorMap[color]}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{detail}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </Card>
  );
};

// Overview Tab
const OverviewTab = ({ metrics }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Card header="System Health">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Donation Completion Rate</span>
          <ProgressBar
            value={metrics.total_donations > 0 ? (metrics.completed_donations / metrics.total_donations) * 100 : 0}
            color="green"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">NGO Engagement</span>
          <ProgressBar value={75} color="blue" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Volunteer Activity</span>
          <ProgressBar value={60} color="purple" />
        </div>
      </div>
    </Card>

    <Card header="Quick Stats">
      <div className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-primary-50 rounded-lg">
          <span className="text-gray-700 font-medium">Total Donations</span>
          <span className="text-2xl font-bold text-primary-600">{metrics.total_donations}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
          <span className="text-gray-700 font-medium">Completed</span>
          <span className="text-2xl font-bold text-green-600">{metrics.completed_donations}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
          <span className="text-gray-700 font-medium">Pending</span>
          <span className="text-2xl font-bold text-yellow-600">
            {metrics.total_donations - metrics.completed_donations}
          </span>
        </div>
      </div>
    </Card>
  </div>
);

// Progress Bar Component
const ProgressBar = ({ value, color = 'primary' }) => {
  const colorMap = {
    primary: 'bg-primary-600',
    green: 'bg-green-600',
    blue: 'bg-blue-600',
    purple: 'bg-purple-600',
  };

  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${colorMap[color]} transition-all`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-600 min-w-12 text-right">{Math.round(value)}%</span>
    </div>
  );
};

// Donations Tab
const DonationsTab = ({ donations, loading, pagination }) => (
  <Card>
    {loading ? (
      <Spinner />
    ) : donations && donations.length > 0 ? (
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-bold">Food</th>
                <th className="text-left py-3 px-4 font-bold">Donor</th>
                <th className="text-left py-3 px-4 font-bold">Quantity</th>
                <th className="text-left py-3 px-4 font-bold">Status</th>
                <th className="text-left py-3 px-4 font-bold">Date</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((d) => (
                <tr key={d.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-medium">{d.food_name}</td>
                  <td className="py-3 px-4 text-gray-600">#{d.donor_id}</td>
                  <td className="py-3 px-4">{d.quantity_kg}kg</td>
                  <td className="py-3 px-4">
                    <Badge variant={d.status === 'completed' ? 'success' : d.status === 'expired' ? 'error' : d.status === 'assigned' ? 'warning' : 'primary'}>
                      {d.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{new Date(d.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => pagination.prevPage()}
            disabled={!pagination.hasPrevious}
          >
            ← Previous
          </Button>
          <span className="px-4 py-2 text-sm font-medium">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => pagination.nextPage()}
            disabled={!pagination.hasNext}
          >
            Next →
          </Button>
        </div>
      </div>
    ) : (
      <p className="text-gray-500 text-center py-8">No donations yet</p>
    )}
  </Card>
);

// Users Tab
const UsersTab = ({ users, loading, pagination }) => (
  <Card>
    {loading ? (
      <Spinner />
    ) : users && users.length > 0 ? (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => (
            <Card key={u.id} border hover>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center font-bold">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{u.name}</h4>
                  <p className="text-sm text-gray-500">{u.email}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="primary" size="sm">
                      {u.role}
                    </Badge>
                    {u.role === 'volunteer' && (
                      <Badge variant="success" size="sm">
                        ⭐ {u.rating?.toFixed(1) || 5.0}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" onClick={() => pagination.prevPage()} disabled={!pagination.hasPrevious}>
            ← Previous
          </Button>
          <span className="px-4 py-2 text-sm font-medium">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={() => pagination.nextPage()} disabled={!pagination.hasNext}>
            Next →
          </Button>
        </div>
      </div>
    ) : (
      <p className="text-gray-500 text-center py-8">No users yet</p>
    )}
  </Card>
);

// Top Donors Tab
const TopDonorsTab = ({ donors }) => (
  <Card>
    <div className="space-y-4">
      {donors && donors.length > 0 ? (
        donors.map((donor, idx) => (
          <div key={idx} className="flex items-center justify-between p-4 bg-gradient-to-r from-primary-50 to-transparent rounded-lg hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold text-primary-600 min-w-12">#{idx + 1}</div>
              <div>
                <p className="font-semibold text-gray-900">{donor.name}</p>
                <p className="text-sm text-gray-500">{donor.donations} donations · {donor.meals} meals saved</p>
              </div>
            </div>
            <Badge variant="success">
              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx+1}`} Top Donor
            </Badge>
          </div>
        ))
      ) : (
        <p className="text-gray-500 text-center py-8">No donors yet</p>
      )}
    </div>
  </Card>
);

// ─── Dashboard sub-pages ────────────────────────────────────────────────────
const DashboardUsers = () => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const { data: users, loading } = useAPI('/admin/all-users');

  const ROLE_COLOR = { donor: '#EA580C', ngo: '#059669', volunteer: '#2563EB', admin: '#7C3AED' };
  const ROLE_BG    = { donor: '#FFF7ED', ngo: '#ECFDF5', volunteer: '#EFF6FF', admin: '#F5F3FF' };

  const filtered = (users || [])
    .filter(u => roleFilter === 'all' || u.role === roleFilter)
    .filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    all: (users || []).length,
    donor: (users || []).filter(u => u.role === 'donor').length,
    ngo: (users || []).filter(u => u.role === 'ngo').length,
    volunteer: (users || []).filter(u => u.role === 'volunteer').length,
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">All Users</h1>
            <p className="text-gray-600 mt-1">{(users || []).length} registered users</p>
          </div>
          <input
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-primary-500"
            placeholder="🔍 Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 240 }}
          />
        </div>

        {/* Role filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {['all','donor','ngo','volunteer'].map(r => (
            <button key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                roleFilter === r ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
              }`}>
              {r === 'all' ? 'All Users' : r.charAt(0).toUpperCase() + r.slice(1) + 's'}
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                roleFilter === r ? 'bg-white bg-opacity-20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>{counts[r] ?? 0}</span>
            </button>
          ))}
        </div>

        {loading ? <Spinner /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(u => (
              <Card key={u.id} border hover>
                <div className="flex items-start gap-3">
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: ROLE_BG[u.role] || '#f3f4f6', border: `1.5px solid ${ROLE_COLOR[u.role] || '#9ca3af'}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ROLE_COLOR[u.role] || '#6b7280', fontWeight: 800, fontSize: 17, flexShrink: 0 }}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-gray-900 text-sm">{u.name}</p>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: ROLE_BG[u.role] || '#f3f4f6', color: ROLE_COLOR[u.role] || '#6b7280', border: `1px solid ${ROLE_COLOR[u.role] || '#9ca3af'}33`, flexShrink: 0 }}>{u.role}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{u.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {u.address || 'No address'}</p>
                    <div className="flex gap-2 mt-1.5">
                      <span className="text-xs text-amber-600 font-semibold">⭐ {parseFloat(u.rating || 5).toFixed(1)}</span>
                      {u.verified && <span className="text-xs text-green-600 font-semibold">✓ Verified</span>}
                      {u.lat && u.lng && <span className="text-xs text-gray-400">📌 Located</span>}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-3 text-center text-gray-500 py-12">No users found.</p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

const DashboardFood = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: donations, loading } = useAPI('/admin/all-donations');
  const pagination = usePagination(
    (donations || []).filter(d => statusFilter === 'all' || d.status === statusFilter),
    15
  );

  const STATUS_COLOR = { posted: '#059669', claimed: '#2563EB', assigned: '#D97706', completed: '#6B7280', expired: '#DC2626' };
  const STATUS_BG    = { posted: '#ECFDF5', claimed: '#EFF6FF', assigned: '#FFFBEB', completed: '#F9FAFB', expired: '#FEF2F2' };

  const counts = ['posted','claimed','assigned','completed','expired'].reduce((acc, s) => {
    acc[s] = (donations || []).filter(d => d.status === s).length;
    return acc;
  }, {});

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">All Donations</h1>
          <p className="text-gray-600 mt-1">{(donations || []).length} total donations</p>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {['all','posted','claimed','assigned','completed','expired'].map(s => (
            <button key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                statusFilter === s ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
              }`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                statusFilter === s ? 'bg-white bg-opacity-20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>{s === 'all' ? (donations || []).length : counts[s] || 0}</span>
            </button>
          ))}
        </div>

        {loading ? <Spinner /> : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    {['ID','Food','Type','Qty','Serves','Status','Expires','Posted'].map(h => (
                      <th key={h} className="text-left py-3 px-4 font-bold text-gray-600 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagination.currentItems.map(d => (
                    <tr key={d.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4"><span style={{ background: '#ECFDF5', color: '#059669', fontWeight: 700, padding: '2px 8px', borderRadius: 6, fontSize: 11, border: '1px solid #D1FAE5' }}>#{d.id}</span></td>
                      <td className="py-3 px-4 font-semibold text-gray-900 max-w-32 truncate">{d.food_name}</td>
                      <td className="py-3 px-4 text-gray-600">{d.food_type}</td>
                      <td className="py-3 px-4 text-gray-600">{d.quantity_kg}kg</td>
                      <td className="py-3 px-4 text-gray-600">{d.serves_people}</td>
                      <td className="py-3 px-4">
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: STATUS_BG[d.status], color: STATUS_COLOR[d.status] }}>● {d.status}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{new Date(d.expires_at).toLocaleDateString('en-IN')}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{new Date(d.created_at).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={pagination.prevPage} disabled={!pagination.hasPrevious}>← Prev</Button>
                <span className="px-4 py-2 text-sm">{pagination.currentPage} / {pagination.totalPages}</span>
                <Button variant="outline" size="sm" onClick={pagination.nextPage} disabled={!pagination.hasNext}>Next →</Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </Layout>
  );
};

const DashboardMap = () => {
  const { data: donations, loading } = useAPI('/admin/all-donations');
  const heatPoints = (donations || [])
    .filter(d => d.lat && d.lng)
    .map(d => [parseFloat(d.lat), parseFloat(d.lng), Math.min(d.serves_people / 100, 1)]);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Food Demand Heatmap 🔥</h1>
          <p className="text-gray-600 mt-1">ML demand intelligence across Nagercoil & Kanyakumari District</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[['🔴','High Demand','Frequent claim zones'],['🟡','Medium Demand','Moderate activity'],['🔵','Low Demand','Underserved areas']].map(([dot,lbl,sub]) => (
            <Card key={lbl} border className="text-center">
              <span className="text-3xl">{dot}</span>
              <p className="font-bold text-sm text-gray-900 mt-2">{lbl}</p>
              <p className="text-xs text-gray-500 mt-1">{sub}</p>
            </Card>
          ))}
        </div>
        <Card>
          {loading
            ? <div className="text-center py-12 text-gray-500">Loading map...</div>
            : <FoodMap donations={donations || []} heatPoints={heatPoints} showBoundary />}
        </Card>
      </div>
    </Layout>
  );
};

export default DashboardPageNew;
