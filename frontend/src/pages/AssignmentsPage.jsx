import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SidebarLayout from '../components/SidebarLayout';
import { useAuth } from '../context/AuthContext';

const ASSET_TYPES = ['vehicle', 'weapon', 'ammunition', 'equipment'];
const CONDITIONS = ['excellent', 'good', 'fair', 'poor'];
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export default function AssignmentsPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [filters, setFilters] = useState({ status: '', assetType: '', assignedTo: '', startDate: '', endDate: '' });
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    assetType: '',
    asset: '',
    assignedTo: '',
    assignmentDate: '',
    expectedReturnDate: '',
    purpose: '',
    mission: '',
    condition: 'good',
    notes: ''
  });
  const [expending, setExpending] = useState(null); // assignmentId being expended
  const [expendForm, setExpendForm] = useState({ reason: '', location: '', mission: '', witness: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch available assets for assignment
  useEffect(() => {
    const fetchAssets = async () => {
      if (!form.assetType) return setAssets([]);
      try {
        const token = localStorage.getItem('token');
        const params = { assetType: form.assetType };
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
  }, [form.assetType]);

  // Fetch users for assignment
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/api/assignments/users/available`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(res.data.data);
      } catch (err) {
        setUsers([]);
      }
    };
    fetchUsers();
    // eslint-disable-next-line
  }, []);

  // Fetch assignments with filters
  useEffect(() => {
    const fetchAssignments = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const params = {};
        if (filters.status) params.status = filters.status;
        if (filters.assetType) params.assetType = filters.assetType;
        if (filters.assignedTo) params.assignedTo = filters.assignedTo;
        if (filters.startDate && filters.endDate) {
          params.startDate = filters.startDate;
          params.endDate = filters.endDate;
        }
        const res = await axios.get(`${API_BASE_URL}/api/assignments`, {
          headers: { Authorization: `Bearer ${token}` },
          params
        });
        setAssignments(res.data.data);
      } catch (err) {
        setError('Failed to load assignments');
      }
      setLoading(false);
    };
    fetchAssignments();
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

  // Handle assignment form submit
  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const payload = {
        asset: form.asset,
        assignedTo: form.assignedTo,
        assignmentDate: form.assignmentDate,
        expectedReturnDate: form.expectedReturnDate,
        purpose: form.purpose,
        mission: form.mission,
        condition: { assigned: form.condition },
        notes: form.notes
      };
      await axios.post(`${API_BASE_URL}/api/assignments`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Asset assigned successfully!');
      setForm({ assetType: '', asset: '', assignedTo: '', assignmentDate: '', expectedReturnDate: '', purpose: '', mission: '', condition: 'good', notes: '' });
      setFilters(f => ({ ...f })); // Refresh table
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign asset');
    }
  };

  // Handle expend action
  const handleExpend = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE_URL}/api/assignments/${expending}/expend`, expendForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Asset marked as expended!');
      setExpending(null);
      setExpendForm({ reason: '', location: '', mission: '', witness: '' });
      setFilters(f => ({ ...f })); // Refresh table
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to expend asset');
    }
  };

  const canCreate = user && (user.role === 'Admin' || user.role === 'Base Commander');

  return (
    <SidebarLayout>
      <h1 className="text-2xl font-bold mb-6">Assignments & Expenditures</h1>
      {canCreate && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <label className="block mb-1 font-semibold">Assign To</label>
            <select name="assignedTo" value={form.assignedTo} onChange={handleFormChange} className="w-full border rounded px-3 py-2" required>
              <option value="">Select user</option>
              {users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.rank})</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1 font-semibold">Assignment Date</label>
            <input name="assignmentDate" type="date" value={form.assignmentDate} onChange={handleFormChange} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Expected Return Date</label>
            <input name="expectedReturnDate" type="date" value={form.expectedReturnDate} onChange={handleFormChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Purpose</label>
            <input name="purpose" value={form.purpose} onChange={handleFormChange} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Mission</label>
            <input name="mission" value={form.mission} onChange={handleFormChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Condition</label>
            <select name="condition" value={form.condition} onChange={handleFormChange} className="w-full border rounded px-3 py-2" required>
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block mb-1 font-semibold">Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleFormChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div className="md:col-span-2 flex gap-4">
            <button type="submit" className="bg-blue-700 text-white px-6 py-2 rounded hover:bg-blue-800 transition">Assign Asset</button>
            {success && <span className="text-green-700 self-center">{success}</span>}
            {error && <span className="text-red-600 self-center">{error}</span>}
          </div>
        </form>
      )}
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <div className="flex flex-wrap gap-4 mb-4">
          <select name="status" value={filters.status} onChange={handleFilterChange} className="border rounded px-3 py-2">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="returned">Returned</option>
            <option value="expended">Expended</option>
            <option value="lost">Lost</option>
            <option value="damaged">Damaged</option>
          </select>
          <select name="assetType" value={filters.assetType} onChange={handleFilterChange} className="border rounded px-3 py-2">
            <option value="">All Types</option>
            {ASSET_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          <select name="assignedTo" value={filters.assignedTo} onChange={handleFilterChange} className="border rounded px-3 py-2">
            <option value="">All Users</option>
            {users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.rank})</option>)}
          </select>
          <input name="startDate" type="date" value={filters.startDate} onChange={handleFilterChange} className="border rounded px-3 py-2" />
          <input name="endDate" type="date" value={filters.endDate} onChange={handleFilterChange} className="border rounded px-3 py-2" />
        </div>
        {loading ? (
          <div>Loading assignments...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Asset</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">Assigned To</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Purpose</th>
                  <th className="p-2 text-left">Condition</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 ? (
                  <tr><td colSpan={8} className="text-center p-4">No assignments found.</td></tr>
                ) : assignments.map(a => (
                  <tr key={a._id} className="border-b">
                    <td className="p-2">{a.assignmentDate ? new Date(a.assignmentDate).toLocaleDateString() : ''}</td>
                    <td className="p-2">{a.asset?.name}</td>
                    <td className="p-2">{a.asset?.type}</td>
                    <td className="p-2">{a.assignedTo?.name} ({a.assignedTo?.rank})</td>
                    <td className="p-2">{a.status}</td>
                    <td className="p-2">{a.purpose}</td>
                    <td className="p-2">{a.condition?.assigned}</td>
                    <td className="p-2">
                      {a.status === 'active' && canCreate && (
                        <button className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700" onClick={() => setExpending(a._id)}>Expend</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Expend Modal */}
      {expending && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow p-8 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-500" onClick={() => setExpending(null)}>&times;</button>
            <h2 className="text-xl font-bold mb-4">Mark Asset as Expended</h2>
            <form onSubmit={handleExpend} className="space-y-4">
              <input name="reason" placeholder="Reason" value={expendForm.reason} onChange={e => setExpendForm(f => ({ ...f, reason: e.target.value }))} className="w-full border rounded px-3 py-2" required />
              <input name="location" placeholder="Location" value={expendForm.location} onChange={e => setExpendForm(f => ({ ...f, location: e.target.value }))} className="w-full border rounded px-3 py-2" required />
              <input name="mission" placeholder="Mission" value={expendForm.mission} onChange={e => setExpendForm(f => ({ ...f, mission: e.target.value }))} className="w-full border rounded px-3 py-2" />
              <input name="witness" placeholder="Witness (User ID)" value={expendForm.witness} onChange={e => setExpendForm(f => ({ ...f, witness: e.target.value }))} className="w-full border rounded px-3 py-2" />
              <div className="flex gap-4">
                <button type="submit" className="bg-red-700 text-white px-6 py-2 rounded hover:bg-red-800 transition">Expend</button>
                <button type="button" className="bg-gray-300 px-6 py-2 rounded" onClick={() => setExpending(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
} 