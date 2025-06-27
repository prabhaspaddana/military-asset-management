import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SidebarLayout from '../components/SidebarLayout';
import { useAuth } from '../context/AuthContext';

const ASSET_TYPES = ['vehicle', 'weapon', 'ammunition', 'equipment'];
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export default function PurchasesPage() {
  const { user } = useAuth();
  const [bases, setBases] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [filters, setFilters] = useState({ assetType: '', startDate: '', endDate: '' });
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    assetType: '',
    name: '',
    category: '',
    quantity: 1,
    unitCost: 0,
    supplierName: '',
    supplierContact: '',
    base: '',
    date: '',
    poNumber: '',
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
          setForm(f => ({ ...f, base: res.data.data[0]._id }));
        }
      } catch (err) {
        setError('Failed to load bases');
      }
    };
    fetchBases();
    // eslint-disable-next-line
  }, []);

  // Fetch purchases with filters
  useEffect(() => {
    const fetchPurchases = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const params = {};
        if (filters.assetType) params.assetType = filters.assetType;
        if (filters.startDate && filters.endDate) {
          params.startDate = filters.startDate;
          params.endDate = filters.endDate;
        }
        const res = await axios.get(`${API_BASE_URL}/api/purchases`, {
          headers: { Authorization: `Bearer ${token}` },
          params
        });
        setPurchases(res.data.data);
      } catch (err) {
        setError('Failed to load purchases');
      }
      setLoading(false);
    };
    fetchPurchases();
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
      const items = [{
        assetType: form.assetType,
        name: form.name,
        category: form.category,
        quantity: Number(form.quantity),
        unitCost: Number(form.unitCost),
        totalCost: Number(form.quantity) * Number(form.unitCost)
      }];
      const payload = {
        base: form.base,
        items,
        supplier: { name: form.supplierName, contact: form.supplierContact },
        purchaseOrder: { number: form.poNumber, date: form.date },
        notes: form.notes
      };
      await axios.post(`${API_BASE_URL}/api/purchases`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Purchase recorded successfully!');
      setForm({
        assetType: '', name: '', category: '', quantity: 1, unitCost: 0, supplierName: '', supplierContact: '', base: '', date: '', poNumber: '', notes: ''
      });
      setFilters(f => ({ ...f })); // Refresh table
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record purchase');
    }
  };

  const canCreate = user && (user.role === 'admin' || user.role === 'commander');

  return (
    <SidebarLayout>
      <h1 className="text-2xl font-bold mb-6">Purchases</h1>
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
            <label className="block mb-1 font-semibold">Name</label>
            <input name="name" value={form.name} onChange={handleFormChange} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Category</label>
            <input name="category" value={form.category} onChange={handleFormChange} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Quantity</label>
            <input name="quantity" type="number" min="1" value={form.quantity} onChange={handleFormChange} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Unit Cost</label>
            <input name="unitCost" type="number" min="0" value={form.unitCost} onChange={handleFormChange} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Supplier Name</label>
            <input name="supplierName" value={form.supplierName} onChange={handleFormChange} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Supplier Contact</label>
            <input name="supplierContact" value={form.supplierContact} onChange={handleFormChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Base</label>
            <select name="base" value={form.base} onChange={handleFormChange} className="w-full border rounded px-3 py-2" required>
              <option value="">Select base</option>
              {bases.map(base => <option key={base._id} value={base._id}>{base.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1 font-semibold">Purchase Date</label>
            <input name="date" type="date" value={form.date} onChange={handleFormChange} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block mb-1 font-semibold">PO Number</label>
            <input name="poNumber" value={form.poNumber} onChange={handleFormChange} className="w-full border rounded px-3 py-2" required />
          </div>
          <div className="md:col-span-2">
            <label className="block mb-1 font-semibold">Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleFormChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div className="md:col-span-2 flex gap-4">
            <button type="submit" className="bg-blue-700 text-white px-6 py-2 rounded hover:bg-blue-800 transition">Record Purchase</button>
            {success && <span className="text-green-700 self-center">{success}</span>}
            {error && <span className="text-red-600 self-center">{error}</span>}
          </div>
        </form>
      )}
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <div className="flex flex-wrap gap-4 mb-4">
          <select name="assetType" value={filters.assetType} onChange={handleFilterChange} className="border rounded px-3 py-2">
            <option value="">All Types</option>
            {ASSET_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          <input name="startDate" type="date" value={filters.startDate} onChange={handleFilterChange} className="border rounded px-3 py-2" />
          <input name="endDate" type="date" value={filters.endDate} onChange={handleFilterChange} className="border rounded px-3 py-2" />
        </div>
        {loading ? (
          <div>Loading purchases...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">PO Number</th>
                  <th className="p-2 text-left">Base</th>
                  <th className="p-2 text-left">Asset Type</th>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Category</th>
                  <th className="p-2 text-left">Quantity</th>
                  <th className="p-2 text-left">Unit Cost</th>
                  <th className="p-2 text-left">Total Cost</th>
                  <th className="p-2 text-left">Supplier</th>
                  <th className="p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 ? (
                  <tr><td colSpan={11} className="text-center p-4">No purchases found.</td></tr>
                ) : purchases.map(p => (
                  <tr key={p._id} className="border-b">
                    <td className="p-2">{p.purchaseOrder?.date ? new Date(p.purchaseOrder.date).toLocaleDateString() : ''}</td>
                    <td className="p-2">{p.purchaseOrder?.number}</td>
                    <td className="p-2">{p.base?.name}</td>
                    <td className="p-2">{p.items[0]?.assetType}</td>
                    <td className="p-2">{p.items[0]?.name}</td>
                    <td className="p-2">{p.items[0]?.category}</td>
                    <td className="p-2">{p.items[0]?.quantity}</td>
                    <td className="p-2">{p.items[0]?.unitCost}</td>
                    <td className="p-2">{p.items[0]?.totalCost}</td>
                    <td className="p-2">{p.supplier?.name}</td>
                    <td className="p-2">{p.status}</td>
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