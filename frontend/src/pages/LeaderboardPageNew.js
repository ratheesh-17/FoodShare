import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { Card, Badge, Alert, Spinner } from '../components/UI';
import { useAPI, usePagination } from '../hooks';
import Layout from '../components/Layout';

const LeaderboardPageNew = () => {
  const { user } = useAuth();
  const { data, loading, initialLoad, error, refetch } = useAPI('/admin/leaderboard', { pollInterval: 30000 });

  const rankings     = data?.rankings        || [];
  const myRank       = data?.my_rank         || null;
  const myContrib    = data?.my_contribution || null;
  const totals       = data?.platform_totals || {};

  const [filter, setFilter] = useState('donations'); // donations | meals | kg | co2

  // Sort rankings by selected filter
  const sorted = [...rankings].sort((a, b) => {
    if (filter === 'meals') return b.meals_saved - a.meals_saved;
    if (filter === 'kg')    return b.kg_saved    - a.kg_saved;
    if (filter === 'co2')   return b.co2_saved   - a.co2_saved;
    return b.donation_count - a.donation_count; // default: donations
  });

  const pagination = usePagination(sorted, 10);

  const FILTER_OPTS = [
    { value: 'donations', label: '🍱 Donations',  key: 'donation_count', unit: 'donations' },
    { value: 'meals',     label: '🍽️ Meals Saved', key: 'meals_saved',    unit: 'meals' },
    { value: 'kg',        label: '⚖️ Food (kg)',   key: 'kg_saved',       unit: 'kg' },
    { value: 'co2',       label: '🌍 CO₂ Saved',  key: 'co2_saved',      unit: 'kg CO₂' },
  ];

  const activeFilter = FILTER_OPTS.find(f => f.value === filter);

  const ACHIEVEMENTS = [
    { icon: '🍱', title: 'First Donation',   desc: 'Posted your first donation', metric: 'donations', threshold: 1   },
    { icon: '👥', title: 'Community Helper', desc: 'Helped 10+ people',          metric: 'meals',     threshold: 10  },
    { icon: '🌍', title: 'Carbon Saver',     desc: 'Saved 100kg CO₂',            metric: 'co2',       threshold: 100 },
    { icon: '⭐', title: 'Trusted Donor',    desc: '5+ completed donations',     metric: 'donations', threshold: 5   },
    { icon: '🚀', title: 'Power Donor',      desc: '10+ completed donations',    metric: 'donations', threshold: 10  },
    { icon: '🏆', title: 'Legend',           desc: '50+ completed donations',    metric: 'donations', threshold: 50  },
  ];

  const myMetrics = {
    donations: myRank?.donation_count    || myContrib?.completed           || 0,
    meals:     myRank?.meals_saved       || myContrib?.meals_facilitated   || myContrib?.meals_delivered || 0,
    co2:       myRank?.co2_saved         || 0,
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">🏆 Leaderboard</h1>
            <p className="text-gray-600 mt-1">
              Celebrating food rescue champions of Nagercoil & Kanyakumari District
            </p>
          </div>
          <button
            onClick={refetch}
            disabled={loading}
            className="mt-1 px-4 py-2 rounded-lg border text-sm font-medium bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600 disabled:opacity-40"
          >
            {loading ? '⏳ Refreshing…' : '🔄 Refresh'}
          </button>
        </div>

        {/* Platform totals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: '🍱', label: 'Donations Completed', value: totals.total_donations ?? 0,  color: 'text-primary-600' },
            { icon: '🍽️', label: 'Meals Saved',          value: totals.total_meals ?? 0,      color: 'text-green-600'   },
            { icon: '⚖️', label: 'Food Rescued (kg)',    value: `${totals.total_kg ?? 0}`,    color: 'text-blue-600'    },
            { icon: '🌍', label: 'CO₂ Saved (kg)',       value: `${totals.total_co2 ?? 0}`,   color: 'text-emerald-600' },
          ].map(s => (
            <Card key={s.label} border>
              <div className="text-center">
                <span className="text-3xl">{s.icon}</span>
                <p className={`text-3xl font-bold mt-2 ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* My rank card */}
        {myRank && (
          <Card border className="bg-gradient-to-r from-primary-50 to-emerald-50 border-primary-200">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-emerald-500 text-white flex items-center justify-center font-bold text-xl">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Your Ranking</p>
                  <p className="text-3xl font-bold text-primary-600">#{myRank.rank}</p>
                  <p className="text-sm text-gray-600">{user?.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{myRank.donation_count}</p>
                  <p className="text-xs text-gray-500">Donations</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{myRank.meals_saved}</p>
                  <p className="text-xs text-gray-500">Meals Saved</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{myRank.co2_saved} kg</p>
                  <p className="text-xs text-gray-500">CO₂ Saved</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Top 3 Podium */}
        {sorted.length >= 3 && (
          <div className="flex items-end justify-center gap-6">
            {/* 2nd */}
            <PodiumCard ranker={sorted[1]} rank={2} height="h-32" color="from-gray-300 to-gray-500" filterKey={activeFilter.key} unit={activeFilter.unit} />
            {/* 1st */}
            <PodiumCard ranker={sorted[0]} rank={1} height="h-44" color="from-yellow-400 to-yellow-600" filterKey={activeFilter.key} unit={activeFilter.unit} crown />
            {/* 3rd */}
            <PodiumCard ranker={sorted[2]} rank={3} height="h-24" color="from-orange-400 to-orange-600" filterKey={activeFilter.key} unit={activeFilter.unit} />
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTS.map(f => (
            <button key={f.value} onClick={() => { setFilter(f.value); pagination.goToPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                filter === f.value
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Full rankings table */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            📊 Full Rankings
            <span className="ml-2 text-base font-normal text-gray-500">({sorted.length} donors)</span>
          </h2>

          {initialLoad && loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : error ? (
            <Alert variant="error">Failed to load leaderboard. Please try again.</Alert>
          ) : sorted.length === 0 ? (
            <Alert variant="info">No rankings yet. Be the first to donate!</Alert>
          ) : (
            <div className="space-y-3">
              {pagination.currentItems.map((ranker, idx) => {
                const globalRank = (pagination.currentPage - 1) * 10 + idx + 1;
                const isMe = ranker.id === user?.id;
                return (
                  <Card key={ranker.id} border hover
                    className={isMe ? 'border-primary-400 bg-primary-50' : ''}>
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                        globalRank === 1 ? 'bg-yellow-100 text-yellow-700' :
                        globalRank === 2 ? 'bg-gray-100 text-gray-600' :
                        globalRank === 3 ? 'bg-orange-100 text-orange-700' :
                        'bg-primary-50 text-primary-600'
                      }`}>
                        {globalRank === 1 ? '🥇' : globalRank === 2 ? '🥈' : globalRank === 3 ? '🥉' : `#${globalRank}`}
                      </div>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-emerald-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                        {ranker.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-900">{ranker.name}</p>
                          {isMe && <Badge variant="primary" size="sm">You</Badge>}
                          <Badge variant={ranker.role === 'donor' ? 'info' : 'success'} size="sm">
                            {ranker.role}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {ranker.donation_count} donations · {ranker.meals_saved} meals · {ranker.co2_saved} kg CO₂
                        </p>
                      </div>

                      {/* Score */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-2xl font-bold text-primary-600">
                          {ranker[activeFilter.key]}
                        </p>
                        <p className="text-xs text-gray-500">{activeFilter.unit}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-4">
                  <button onClick={pagination.prevPage} disabled={!pagination.hasPrevious}
                    className="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-40 hover:bg-gray-50">
                    ← Previous
                  </button>
                  <span className="px-4 py-2 text-sm font-medium text-gray-600">
                    {pagination.currentPage} / {pagination.totalPages}
                  </span>
                  <button onClick={pagination.nextPage} disabled={!pagination.hasNext}
                    className="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-40 hover:bg-gray-50">
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Achievements */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🎯 Achievements</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {ACHIEVEMENTS.map((a, i) => {
              const unlocked = myMetrics[a.metric] >= a.threshold;
              return (
                <Card key={i} hover className={`flex flex-col items-center text-center py-6 transition-transform hover:scale-105 ${unlocked ? 'border-primary-300 bg-primary-50' : 'opacity-60'}`}>
                  <div className="text-4xl mb-2">{a.icon}</div>
                  <p className="font-semibold text-gray-900 text-sm">{a.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{a.desc}</p>
                  <span className={`mt-3 text-xs font-bold px-2 py-1 rounded-full ${unlocked ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {unlocked ? '✓ Unlocked' : `Need ${a.threshold}`}
                  </span>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
};

function PodiumCard({ ranker, rank, height, color, filterKey, unit, crown }) {
  return (
    <div className="flex flex-col items-center gap-3">
      {crown && <span className="text-3xl">👑</span>}
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-emerald-500 text-white flex items-center justify-center font-bold text-xl border-4 border-white shadow-lg">
        {ranker.name.charAt(0).toUpperCase()}
      </div>
      <div className="text-center">
        <p className="font-bold text-gray-900 text-sm">{ranker.name}</p>
        <p className="text-primary-600 font-bold">{ranker[filterKey]} {unit}</p>
      </div>
      <div className={`w-28 ${height} bg-gradient-to-b ${color} rounded-t-lg flex items-start justify-center pt-3`}>
        <span className="text-white font-bold text-xl">#{rank}</span>
      </div>
    </div>
  );
}

export default LeaderboardPageNew;
