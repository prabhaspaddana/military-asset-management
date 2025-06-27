import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SidebarLayout from '../components/SidebarLayout';
import { useAuth } from '../context/AuthContext';

const ASSET_TYPES = ['vehicle', 'weapon', 'ammunition', 'equipment'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const TRANSPORT_METHODS = ['ground', 'air', 'sea'];
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export default function TransfersPage() {
  const { user } = useAuth();
  const [bases, setBases] = useState([]);
  const [assets, setAssets] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [filters, setFilters] = useState({ status: '', priority: '', startDate: '', endDate: '' });
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fromBase: '',
    toBase: '',
    assetType: '',
    asset: '',
    quantity: 1,
    priority: 'medium',
    transportMethod: 'ground',
    reason: '',
    notes: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch bases for dropdown
  useEffect(() => {
    const fetchBases = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/api/bases`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBases(res.data.data);
        if (user && user.role !== 'Admin' && res.data.data.length > 0) {
          setForm(f => ({ ...f, fromBase: res.data.data[0]._id }));
        }
      } catch (err) {
        setError('Failed to load bases');
      }
    };
    fetchBases();
    // eslint-disable-next-line
  }, []);

  // Fetch available assets for selected fromBase and assetType
  useEffect(() => {
    const fetchAssets = async () => {
      if (!form.fromBase || !form.assetType) return setAssets([]);
      try {
        const token = localStorage.getItem('token');
        const params = { baseId: form.fromBase, assetType: form.assetType };
        const res = await axios.get(`${API_BASE_URL}/api/assignments/available-assets`, {
          headers: { Authorization: `Bearer ${token}` },
          params
        });
        setAssets(res.data.data);
      } catch (err) {
        setAssets([]);
      }
    };
    fetchAssets();
    // eslint-disable-next-line
  }, [form.fromBase, form.assetType]);

  // Fetch transfers with filters
  useEffect(() => {
    const fetchTransfers = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const params = {};
        if (filters.status) params.status = filters.status;
        if (filters.priority) params.priority = filters.priority;
        if (filters.startDate && filters.endDate) {
          params.startDate = filters.startDate;
          params.endDate = filters.endDate;
        }
        const res = await axios.get(`${API_BASE_URL}/api/transfers`, {
          headers: { Authorization: `Bearer ${token}` },
          params
        });
        setTransfers(res.data.data);
      } catch (err) {
        setError('Failed to load transfers');
      }
      setLoading(false);
    };
    fetchTransfers();
    // eslint-disable-next-line
  }, [filters]);

  // Handle form input
  const handleFormChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  // Handle filter input
  const handleFilterChange = e => {
    const { name, value } = e.target;
    setFilters(f => ({ ...f, [name]: value }));
  };

  // Handle form submit
  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const assetObj = assets.find(a => a._id === form.asset);
      const payload = {
        fromBase: form.fromBase,
        toBase: form.toBase,
        assets: [{
          asset: form.asset,
          assetId: assetObj?.assetId,
          name: assetObj?.name,
          type: form.assetType,
          quantity: Number(form.quantity)
        }],
        priority: form.priority,
        transportDetails: { method: form.transportMethod },
        reason: form.reason,
        notes: form.notes
      };
      await axios.post(`${API_BASE_URL}/api/transfers`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Transfer created successfully!');
      setForm({
        fromBase: '', toBase: '', assetType: '', asset: '', quantity: 1, priority: 'medium', transportMethod: 'ground', reason: '', notes: ''
      });
      setFilters(f => ({ ...f })); // Refresh table
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create transfer');
    }
  };

  const canCreate = user && (user.role === 'Admin' || user.role === 'Base Commander');

  return (
    <SidebarLayout>
      <h1 className="text-2xl font-bold mb-6">Transfers</h1>
      {canCreate && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-semibold">From Base</label>
            <select name="fromBase" value={form.fromBase} onChange={handleFormChange} className="w-full border rounded px-3 py-2" required>
              <option value="">Select base</option>
              {bases.map(base => <option key={base._id} value={base._id}>{base.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1 font-semibold">To Base</label>
            <select name="toBase" value={form.toBase} onChange={handleFormChange} className="w-full border rounded px-3 py-2" required>
              <option value="">Select base</option>
              {bases.filter(b => b._id !== form.fromBase).map(base => <option key={base._id} value={base._id}>{base.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1 font-semibold">Asset Type</label>
            <select name="assetType" value={form.assetType} onChange={handleFormChange} className="w-full border rounded px-3 py-2" required>
              <option value="">Select type</option>
              {ASSET_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1 font-semibold">Asset</label>
            <select name="asset" value={form.asset} onChange={handleFormChange} className="w-full border rounded px-3 py-2" required>
              <option value="">Select asset</option>
              {assets.map(a => <option key={a._id} value={a._id}>{a.name} ({a.assetId})</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1 font-semibold">Quantity</label>
            <input name="quantity" type="number" min="1" value={form.quantity} onChange={handleFormChange} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Priority</label>
            <select name="priority" value={form.priority} onChange={handleFormChange} className="w-full border rounded px-3 py-2" required>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1 font-semibold">Transport Method</label>
            <select name="transportMethod" value={form.transportMethod} onChange={handleFormChange} className="w-full border rounded px-3 py-2" required>
              {TRANSPORT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block mb-1 font-semibold">Reason</label>
            <input name="reason" value={form.reason} onChange={handleFormChange} className="w-full border rounded px-3 py-2" required />
          </div>
          <div className="md:col-span-2">
            <label className="block mb-1 font-semibold">Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleFormChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div className="md:col-span-2 flex gap-4">
            <button type="submit" className="bg-blue-700 text-white px-6 py-2 rounded hover:bg-blue-800 transition">Create Transfer</button>
            {success && <span className="text-green-700 self-center">{success}</span>}
            {error && <span className="text-red-600 self-center">{error}</span>}
          </div>
        </form>
      )}
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <div className="flex flex-wrap gap-4 mb-4">
          <select name="status" value={filters.status} onChange={handleFilterChange} className="border rounded px-3 py-2">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="in-transit">In-Transit</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="rejected">Rejected</option>
          </select>
          <select name="priority" value={filters.priority} onChange={handleFilterChange} className="border rounded px-3 py-2">
            <option value="">All Priorities</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input name="startDate" type="date" value={filters.startDate} onChange={handleFilterChange} className="border rounded px-3 py-2" />
          <input name="endDate" type="date" value={filters.endDate} onChange={handleFilterChange} className="border rounded px-3 py-2" />
        </div>
        {loading ? (
          <div>Loading transfers...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">From Base</th>
                  <th className="p-2 text-left">To Base</th>
                  <th className="p-2 text-left">Asset</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">Quantity</th>
                  <th className="p-2 text-left">Priority</th>
                  <th className="p-2 text-left">Transport</th>
                  <th className="p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {transfers.length === 0 ? (
                  <tr><td colSpan={9} className="text-center p-4">No transfers found.</td></tr>
                ) : transfers.map(t => (
                  <tr key={t._id} className="border-b">
                    <td className="p-2">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''}</td>
                    <td className="p-2">{t.fromBase?.name}</td>
                    <td className="p-2">{t.toBase?.name}</td>
                    <td className="p-2">{t.assets[0]?.name}</td>
                    <td className="p-2">{t.assets[0]?.type}</td>
                    <td className="p-2">{t.assets[0]?.quantity}</td>
                    <td className="p-2">{t.priority}</td>
                    <td className="p-2">{t.transportDetails?.method}</td>
                    <td className="p-2">{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
} 