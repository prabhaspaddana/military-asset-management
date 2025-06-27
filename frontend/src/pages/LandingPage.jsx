import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 to-blue-600 text-white">
      <div className="max-w-xl w-full px-6 py-12 bg-white/10 rounded-xl shadow-lg flex flex-col items-center">
        <h1 className="text-4xl font-bold mb-4 text-center">Military Asset Management System</h1>
        <p className="mb-8 text-center text-lg">
          Securely manage, track, and control critical military assets across multiple bases.<br />
          Streamline logistics, ensure accountability, and empower your command.
        </p>
        <div className="flex gap-4">
          <Link to="/login" className="px-6 py-2 bg-white text-blue-700 font-semibold rounded shadow hover:bg-blue-100 transition">Login</Link>
          <Link to="/register" className="px-6 py-2 bg-blue-700 border border-white font-semibold rounded shadow hover:bg-blue-800 transition">Register</Link>
        </div>
      </div>
      <footer className="mt-12 text-white/70 text-sm">© {new Date().getFullYear()} Military Asset Management</footer>
    </div>
  );
}
