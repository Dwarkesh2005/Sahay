import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogIn } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
        <div className="hidden md:flex items-center space-x-8">
          <Link
            to="/"
            className="font-medium text-forest-dark hover:text-primary transition-colors"
          >
            Home
          </Link>
          <a
            href="#features"
            className="font-medium text-forest-dark hover:text-primary transition-colors"
            onClick={(e) => {
              e.preventDefault();
              const section = document.getElementById('features');
              if (section) {
                section.scrollIntoView({ behavior: 'smooth' });
              } else {
                navigate('/');
                setTimeout(() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }
            }}
          >
            Services
          </a>
          <a
            href="#how-it-works"
            className="font-medium text-forest-dark hover:text-primary transition-colors"
            onClick={(e) => {
              e.preventDefault();
              const section = document.getElementById('how-it-works');
              if (section) {
                section.scrollIntoView({ behavior: 'smooth' });
              } else {
                navigate('/');
                setTimeout(() => {
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }
            }}
          >
            How it Works
          </a>
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
          <div className="flex flex-col p-6 space-y-4">
            <Link
              to="/"
              onClick={() => setIsOpen(false)}
              className="font-medium text-forest-dark hover:text-primary transition-colors py-2 border-b border-forest-light/20"
            >
              Home
            </Link>
            <a
              href="#features"
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
                const section = document.getElementById('features');
                if (section) {
                  section.scrollIntoView({ behavior: 'smooth' });
                } else {
                  navigate('/');
                  setTimeout(() => {
                    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }
              }}
              className="font-medium text-forest-dark hover:text-primary transition-colors py-2 border-b border-forest-light/20"
            >
              Services
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
                const section = document.getElementById('how-it-works');
                if (section) {
                  section.scrollIntoView({ behavior: 'smooth' });
                } else {
                  navigate('/');
                  setTimeout(() => {
                    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }
              }}
              className="font-medium text-forest-dark hover:text-primary transition-colors py-2 border-b border-forest-light/20"
            >
              How it Works
            </a>
            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              className="font-medium text-forest-dark hover:text-primary transition-colors py-2 border-b border-forest-light/20 flex items-center gap-2"
            >
              <LogIn className="w-5 h-5" /> Login
            </Link>
            <Link
              to="/register"
              onClick={() => setIsOpen(false)}
              className="bg-primary hover:bg-forest-dark text-white text-center font-medium py-3 rounded-xl shadow-md transition-all duration-300"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};
