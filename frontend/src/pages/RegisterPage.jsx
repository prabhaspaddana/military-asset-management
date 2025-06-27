import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

function isStrongPassword(password) {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
    rank: '',
    department: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isStrongPassword(form.password)) {
      setError('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/api/auth/register`, form);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-600">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-800">Register</h2>
        {error && <div className="mb-4 text-red-600 text-center">{error}</div>}
        <input
          name="name"
          type="text"
          placeholder="Full Name"
          className="mb-4 w-full px-3 py-2 border rounded"
          value={form.name}
          onChange={handleChange}
          required
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          className="mb-4 w-full px-3 py-2 border rounded"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          className="mb-4 w-full px-3 py-2 border rounded"
          value={form.password}
          onChange={handleChange}
          required
        />
        <div className="mb-2 text-xs text-gray-600">
          Password must be at least 8 characters and include uppercase, lowercase, number, and special character.
        </div>
        <select
          name="role"
          className="mb-4 w-full px-3 py-2 border rounded"
          value={form.role}
          onChange={handleChange}
        >
          <option value="admin">Admin</option>
          <option value="commander">Base Commander</option>
          <option value="officer">Logistics Officer</option>
        </select>
        <input
          name="rank"
          type="text"
          placeholder="Rank"
          className="mb-4 w-full px-3 py-2 border rounded"
          value={form.rank}
          onChange={handleChange}
          required
        />
        <input
          name="department"
          type="text"
          placeholder="Department"
          className="mb-6 w-full px-3 py-2 border rounded"
          value={form.department}
          onChange={handleChange}
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-700 text-white py-2 rounded hover:bg-blue-800 transition"
        >
          Register
        </button>
        <div className="mt-4 text-center text-sm">
          Already have an account? <Link to="/login" className="text-blue-700 hover:underline">Login</Link>
        </div>
      </form>
    </div>
  );
}
