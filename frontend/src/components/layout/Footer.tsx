import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Phone, MapPin, Leaf } from 'lucide-react';

export const Footer: React.FC = () => {
  const { t } = useTranslation();

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
            {t('footer.tagline', 'Empowering migrants and communities through verified NGO coordination, rapid relief, and compassionate aid.')}
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-display font-semibold text-white text-lg mb-4">
            {t('footer.quickLinks', 'Quick Links')}
          </h4>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link to="/request-help" className="hover:text-white transition-colors">
                {t('footer.forMigrants', 'For Migrants')}
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-white transition-colors">
                {t('footer.forNgos', 'For NGOs')}
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-white transition-colors">
                {t('footer.forVolunteers', 'For Volunteers')}
              </Link>
            </li>
            <li>
              <Link to="/admin" className="hover:text-white transition-colors">
                {t('footer.adminLogin', 'Admin Access')}
              </Link>
            </li>
          </ul>
        </div>

        {/* Platform & Guidelines */}
        <div>
          <h4 className="font-display font-semibold text-white text-lg mb-4">
            {t('footer.platform', 'Platform')}
          </h4>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link to="/ngos" className="hover:text-white transition-colors">
                {t('navbar.findNgos', 'Find NGOs')}
              </Link>
            </li>
            <li>
              <Link to="/ngo-portal/verification" className="hover:text-white transition-colors">
                {t('footer.verifyNgo', 'NGO Verification')}
              </Link>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                {t('footer.privacyPolicy', 'Privacy Policy')}
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                {t('footer.termsOfService', 'Terms of Service')}
              </a>
            </li>
          </ul>
        </div>

        {/* Contact Info */}
        <div>
          <h4 className="font-display font-semibold text-white text-lg mb-4">
            {t('footer.contactSupport', 'Emergency & Support')}
          </h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center space-x-3">
              <Mail className="w-4 h-4 text-accent shrink-0" />
              <span className="opacity-90">{t('footer.emailSupport', 'support@sahay.org')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Phone className="w-4 h-4 text-accent shrink-0" />
              <span className="opacity-90">{t('footer.helpline', '24/7 Helpline: 1800-111-222')}</span>
            </li>
            <li className="flex items-start space-x-3">
              <MapPin className="w-4 h-4 text-accent mt-0.5 shrink-0" />
              <span className="opacity-90 font-sans">
                {t('footer.address', 'Ahmedabad & National Network, India')}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-sm opacity-80 gap-2">
        <p>© {new Date().getFullYear()} Sahay. {t('footer.rightsReserved', 'All rights reserved. Dedicated to humanitarian service.')}</p>
        <p className="flex items-center gap-1">
          Made with heart <span className="text-rose-400">♥</span> and care for humanity.
        </p>
      </div>
    </footer>
  );
};
