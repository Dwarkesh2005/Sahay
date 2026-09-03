import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogIn, LogOut, LayoutDashboard, Search, PlusCircle, Building2, Shield, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/');
  };

  const roleBadgeColor = {
    ADMIN: 'bg-amber-100 text-amber-800',
    NGO: 'bg-blue-100 text-blue-800',
    VOLUNTEER: 'bg-purple-100 text-purple-800',
    MIGRANT: 'bg-emerald-100 text-emerald-800',
  };

  const roleLabel = {
    ADMIN: 'Admin',
    NGO: 'NGO',
    VOLUNTEER: 'Volunteer',
    MIGRANT: 'User',
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled ? 'glass-navbar py-3 shadow-sm' : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2 group">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-md shadow-primary/20 transform group-hover:rotate-12 transition-transform duration-300">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M17,8C8,10 5.9,16.17 3.82,21.34C5.71,20.09 9.38,18.66 14.18,17.86C18.98,17.06 21,13 21,13C21,13 20.35,10.23 17,8Z" />
            </svg>
          </div>
          <span className="font-display font-bold text-2xl tracking-wide text-forest-dark">
            SAHAY
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-6">
          <Link
            to="/"
            className="font-medium text-forest-dark hover:text-primary transition-colors"
          >
            Home
          </Link>
          <Link
            to="/ngos"
            className="font-medium text-forest-dark hover:text-primary transition-colors flex items-center gap-1"
          >
            <Search className="w-4 h-4" /> Find NGOs
          </Link>

          {isAuthenticated && user ? (
            <>
              {(user.role === 'MIGRANT' || user.role === 'VOLUNTEER' || user.role === 'ADMIN') && (
                <Link
                  to="/request-help"
                  className="font-medium text-forest-dark hover:text-primary transition-colors flex items-center gap-1"
                >
                  <PlusCircle className="w-4 h-4" /> Request Help
                </Link>
              )}
              {(user.role === 'MIGRANT' || user.role === 'VOLUNTEER') && (
                <Link
                  to="/dashboard"
                  className="font-medium text-forest-dark hover:text-primary transition-colors flex items-center gap-1"
                >
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Link>
              )}
              {user.role === 'NGO' && (
                <Link
                  to="/ngo-portal"
                  className="font-medium text-forest-dark hover:text-primary transition-colors flex items-center gap-1"
                >
                  <Building2 className="w-4 h-4" /> NGO Portal
                </Link>
              )}
              {user.role === 'ADMIN' && (
                <Link
                  to="/admin"
                  className="font-medium text-forest-dark hover:text-primary transition-colors flex items-center gap-1"
                >
                  <Shield className="w-4 h-4" /> Admin
                </Link>
              )}

              {/* User Dropdown */}
              <div className="relative group">
                <button
                  className="flex items-center gap-2 font-medium text-forest-dark hover:text-primary transition-colors"
                  aria-label="User menu"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm">{user.full_name.split(' ')[0]}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${roleBadgeColor[user.role]}`}>
                    {roleLabel[user.role]}
                  </span>
                </button>
                <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute right-0 top-full pt-2 w-48 transition-all duration-200">
                  <div className="bg-white rounded-xl shadow-lg border border-forest-light/20 py-2 overflow-hidden">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-forest-dark hover:bg-bg-nature hover:text-primary transition-colors"
                    >
                      My Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="font-medium text-forest-dark hover:text-primary transition-colors flex items-center gap-1.5"
              >
                <LogIn className="w-4 h-4" /> Login
              </Link>
              <Link
                to="/register"
                className="bg-primary hover:bg-forest-dark text-white font-medium px-6 py-2.5 rounded-full shadow-md shadow-primary/25 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <div className="md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-forest-dark hover:text-primary p-2 focus:outline-none"
            aria-label="Toggle Menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden glass-panel-dark mx-4 mt-2 rounded-2xl overflow-hidden shadow-lg border border-primary/10">
          <div className="flex flex-col p-6 space-y-3">
            <Link to="/" onClick={() => setIsOpen(false)} className="font-medium text-forest-dark hover:text-primary transition-colors py-2 border-b border-forest-light/20">
              Home
            </Link>
            <Link to="/ngos" onClick={() => setIsOpen(false)} className="font-medium text-forest-dark hover:text-primary transition-colors py-2 border-b border-forest-light/20 flex items-center gap-2">
              <Search className="w-4 h-4" /> Find NGOs
            </Link>

            {isAuthenticated && user ? (
              <>
                {(user.role === 'MIGRANT' || user.role === 'VOLUNTEER' || user.role === 'ADMIN') && (
                  <Link to="/request-help" onClick={() => setIsOpen(false)} className="font-medium text-forest-dark hover:text-primary transition-colors py-2 border-b border-forest-light/20 flex items-center gap-2">
                    <PlusCircle className="w-4 h-4" /> Request Help
                  </Link>
                )}
                {(user.role === 'MIGRANT' || user.role === 'VOLUNTEER') && (
                  <Link to="/dashboard" onClick={() => setIsOpen(false)} className="font-medium text-forest-dark hover:text-primary transition-colors py-2 border-b border-forest-light/20 flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                  </Link>
                )}
                {user.role === 'NGO' && (
                  <Link to="/ngo-portal" onClick={() => setIsOpen(false)} className="font-medium text-forest-dark hover:text-primary transition-colors py-2 border-b border-forest-light/20 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> NGO Portal
                  </Link>
                )}
                {user.role === 'ADMIN' && (
                  <Link to="/admin" onClick={() => setIsOpen(false)} className="font-medium text-forest-dark hover:text-primary transition-colors py-2 border-b border-forest-light/20 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Admin Console
                  </Link>
                )}
                <Link to="/profile" onClick={() => setIsOpen(false)} className="font-medium text-forest-dark hover:text-primary transition-colors py-2 border-b border-forest-light/20 flex items-center gap-2">
                  <User className="w-4 h-4" /> Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-left font-medium text-rose-600 hover:text-rose-700 transition-colors py-2 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setIsOpen(false)} className="font-medium text-forest-dark hover:text-primary transition-colors py-2 border-b border-forest-light/20 flex items-center gap-2">
                  <LogIn className="w-5 h-5" /> Login
                </Link>
                <Link to="/register" onClick={() => setIsOpen(false)} className="bg-primary hover:bg-forest-dark text-white text-center font-medium py-3 rounded-xl shadow-md transition-all duration-300">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
