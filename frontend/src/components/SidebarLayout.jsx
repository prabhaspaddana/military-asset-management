import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/purchases', label: 'Purchases' },
  { to: '/transfers', label: 'Transfers' },
  { to: '/assignments', label: 'Assignments' },
];

export default function SidebarLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      <aside className="w-64 bg-blue-900 text-white flex flex-col">
        <div className="p-6 text-2xl font-bold border-b border-blue-800">
          <Link to="/dashboard">Military AMS</Link>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`block px-4 py-2 rounded transition ${
                location.pathname === link.to
                  ? 'bg-blue-700 font-semibold'
                  : 'hover:bg-blue-800'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="m-4 px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition"
        >
          Logout
        </button>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
} 