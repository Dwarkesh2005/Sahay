import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Leaf } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="relative bg-forest-dark text-emerald-100 pt-16 pb-8 overflow-hidden z-10">
      {/* Decorative leaf shape */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10 border-b border-primary/20 pb-12 mb-8">
        {/* Brand Column */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary shadow-sm">
              <Leaf className="w-5 h-5 fill-current" />
            </div>
            <span className="font-display font-bold text-2xl tracking-wide text-white">
              SAHAY
            </span>
          </div>
          <p className="text-sm leading-relaxed opacity-85">
            Connecting migrants with verified NGOs, volunteers, and caring community members. Together, we build a warmer and safer tomorrow.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-display font-semibold text-white text-lg mb-4">Quick Links</h4>
          <ul className="space-y-2.5 text-sm">
            <li>
              <a href="#features" className="hover:text-white transition-colors">Our Services</a>
            </li>
            <li>
              <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
            </li>
            <li>
              <Link to="/register" className="hover:text-white transition-colors">Register as Volunteer</Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-white transition-colors">Register as NGO</Link>
            </li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="font-display font-semibold text-white text-lg mb-4">Support</h4>
          <ul className="space-y-2.5 text-sm">
            <li>
              <a href="#" className="hover:text-white transition-colors">Help Center / FAQs</a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">NGO Partnership Plan</a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </li>
          </ul>
        </div>

        {/* Contact Info */}
        <div>
          <h4 className="font-display font-semibold text-white text-lg mb-4">Get In Touch</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center space-x-3">
              <Mail className="w-4 h-4 text-accent" />
              <span className="opacity-90">support@sahayplatform.org</span>
            </li>
            <li className="flex items-center space-x-3">
              <Phone className="w-4 h-4 text-accent" />
              <span className="opacity-90">+91 98765 43210</span>
            </li>
            <li className="flex items-center space-x-3">
              <MapPin className="w-4 h-4 text-accent" />
              <span className="opacity-90 font-sans">Bihar & Uttar Pradesh Migrant Support Division, India</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-sm opacity-80">
        <p>© {new Date().getFullYear()} Sahay Community Platform. All rights reserved.</p>
        <p className="flex items-center gap-1 mt-2 md:mt-0">
          Made with heart <span className="text-rose-400">♥</span> and care for humanity.
        </p>
      </div>
    </footer>
  );
};
