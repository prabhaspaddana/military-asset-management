import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import SidebarLayout from '../components/SidebarLayout';

const ASSET_TYPES = ['vehicle', 'weapon', 'ammunition', 'equipment'];

export default function DashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState('');
  const [bases, setBases] = useState([]);
  const [filters, setFilters] = useState({ base: '', assetType: '', startDate: '', endDate: '' });
  const [loading, setLoading] = useState(false);
  const [showNetModal, setShowNetModal] = useState(false);
  const [netDetails, setNetDetails] = useState(null);
  const navigate = useNavigate();

  // Fetch bases for filter
  useEffect(() => {
    const fetchBases = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/bases', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBases(res.data.data);
      } catch (err) {
        // ignore
      }
    };
    fetchBases();
  }, []);

  // Fetch dashboard metrics with filters
  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const params = {};
        if (filters.base) params.baseId = filters.base;
        if (filters.assetType) params.assetType = filters.assetType;
        if (filters.startDate && filters.endDate) {
          params.startDate = filters.startDate;
          params.endDate = filters.endDate;
        }
        const res = await axios.get('http://localhost:5000/api/dashboard/metrics', {
          headers: { Authorization: `Bearer ${token}` },
          params
        });
        setMetrics(res.data.data);
      } catch (err) {
        setError('Failed to load dashboard');
      }
      setLoading(false);
    };
    fetchMetrics();
  }, [filters, navigate]);

  // Fetch net movement breakdown
  const fetchNetDetails = async () => {
    setNetDetails(null);
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (filters.base) params.baseId = filters.base;
      if (filters.assetType) params.assetType = filters.assetType;
      if (filters.startDate && filters.endDate) {
        params.startDate = filters.startDate;
        params.endDate = filters.endDate;
      }
      const res = await axios.get('http://localhost:5000/api/dashboard/movement-breakdown', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setNetDetails(res.data.data);
    } catch (err) {
      setNetDetails({ error: 'Failed to load breakdown' });
    }
  };

  const handleFilterChange = e => {
    const { name, value } = e.target;
    setFilters(f => ({ ...f, [name]: value }));
  };

  if (error) return <SidebarLayout><div className="p-8 text-red-600">{error}</div></SidebarLayout>;
  if (loading || !metrics) return <SidebarLayout><div className="p-8">Loading...</div></SidebarLayout>;

  return (
    <SidebarLayout>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="flex flex-wrap gap-4 mb-6">
        <select name="base" value={filters.base} onChange={handleFilterChange} className="border rounded px-3 py-2">
          <option value="">All Bases</option>
          {bases.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <select name="assetType" value={filters.assetType} onChange={handleFilterChange} className="border rounded px-3 py-2">
          <option value="">All Types</option>
          {ASSET_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
        <div className="flex flex-col">
          <label htmlFor="startDate" className="text-xs text-gray-600 mb-1">Start Date</label>
          <input id="startDate" name="startDate" type="date" value={filters.startDate} onChange={handleFilterChange} className="border rounded px-3 py-2" />
        </div>
        <div className="flex flex-col">
          <label htmlFor="endDate" className="text-xs text-gray-600 mb-1">End Date</label>
          <input id="endDate" name="endDate" type="date" value={filters.endDate} onChange={handleFilterChange} className="border rounded px-3 py-2" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard label="Opening Balance" value={metrics.openingBalance} />
        <MetricCard label="Closing Balance" value={metrics.closingBalance} />
        <MetricCard label="Net Movement" value={metrics.netMovement} clickable onClick={() => { setShowNetModal(true); fetchNetDetails(); }} />
        <MetricCard label="Purchases" value={metrics.purchases.quantity} />
        <MetricCard label="Transfers In" value={metrics.transfersIn} />
        <MetricCard label="Transfers Out" value={metrics.transfersOut} />
        <MetricCard label="Assigned Assets" value={metrics.assignedAssets} />
        <MetricCard label="Expended Assets" value={metrics.expendedAssets} />
      </div>
      {/* Net Movement Modal */}
      {showNetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow p-8 w-full max-w-lg relative">
            <button className="absolute top-2 right-2 text-gray-500" onClick={() => setShowNetModal(false)}>&times;</button>
            <h2 className="text-xl font-bold mb-4">Net Movement Breakdown</h2>
            {!netDetails ? (
              <div>Loading...</div>
            ) : netDetails.error ? (
              <div className="text-red-600">{netDetails.error}</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <span className="font-semibold">Purchases:</span> {netDetails.purchases?.length || 0}
                  <ul className="list-disc ml-6">
                    {netDetails.purchases?.map(p => (
                      <li key={p._id}>{p.purchaseOrder?.date ? new Date(p.purchaseOrder.date).toLocaleDateString() : ''} - {p.items[0]?.name} ({p.items[0]?.quantity})</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="font-semibold">Transfers In:</span> {netDetails.transfersIn?.length || 0}
                  <ul className="list-disc ml-6">
                    {netDetails.transfersIn?.map(t => (
                      <li key={t._id}>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''} - {t.assets[0]?.name} ({t.assets[0]?.quantity})</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="font-semibold">Transfers Out:</span> {netDetails.transfersOut?.length || 0}
                  <ul className="list-disc ml-6">
                    {netDetails.transfersOut?.map(t => (
                      <li key={t._id}>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''} - {t.assets[0]?.name} ({t.assets[0]?.quantity})</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}

function MetricCard({ label, value, clickable, onClick }) {
  return (
    <div
      className={`bg-white rounded-lg shadow p-6 flex flex-col items-center ${clickable ? 'cursor-pointer hover:bg-blue-50' : ''}`}
      onClick={clickable ? onClick : undefined}
    >
      <div className="text-2xl font-bold text-blue-800">{value}</div>
      <div className="text-gray-600 mt-2">{label}</div>
    </div>
  );
}
