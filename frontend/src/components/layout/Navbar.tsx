import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, LogIn, LogOut, LayoutDashboard, Search, PlusCircle, Building2, Shield, User, Bell, CheckCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/api';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { formatLocalizedTimeAgo } from '../../i18n';
import type { Notification } from '../../types';

export const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  // Close notifications popover on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications when popover opens
  const handleToggleNotifications = async () => {
    const nextState = !notificationsOpen;
    setNotificationsOpen(nextState);
    if (nextState) {
      setNotificationsLoading(true);
      try {
        const data = await notificationService.getNotifications({ limit: 10 });
        setNotifications(data.notifications || []);
        if (typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        }
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        setNotificationsLoading(false);
      }
    }
  };

  // Mark single notification as read
  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      try {
        await notificationService.markAsRead(notif.notification_id);
        setNotifications((prev) =>
          prev.map((n) => (n.notification_id === notif.notification_id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }
    setNotificationsOpen(false);

    // Route user based on their role
    if (user?.role === 'NGO') {
      navigate('/ngo-portal');
    } else if (user?.role === 'ADMIN') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  // Fetch unread notification count
  useEffect(() => {
    if (isAuthenticated) {
      notificationService
        .getUnreadCount()
        .then((data) => setUnreadCount(data.unreadCount || 0))
        .catch(() => {});

      const interval = setInterval(() => {
        notificationService
          .getUnreadCount()
          .then((data) => setUnreadCount(data.unreadCount || 0))
          .catch(() => {});
      }, 30000); // Poll every 30s

      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

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

  const roleBadgeColor: Record<string, string> = {
    ADMIN: 'bg-amber-100 text-amber-800',
    NGO: 'bg-blue-100 text-blue-800',
    VOLUNTEER: 'bg-purple-100 text-purple-800',
    MIGRANT: 'bg-emerald-100 text-emerald-800',
  };

  const getRoleLabel = (role: string) => {
    return t(`roles.${role}`, role);
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
        <div className="hidden md:flex items-center space-x-5">
          <Link
            to="/"
            className="font-medium text-forest-dark hover:text-primary transition-colors text-sm"
          >
            {t('navbar.home', 'Home')}
          </Link>
          <Link
            to="/ngos"
            className="font-medium text-forest-dark hover:text-primary transition-colors flex items-center gap-1 text-sm"
          >
            <Search className="w-3.5 h-3.5" /> {t('navbar.findNgos', 'Find NGOs')}
          </Link>

          {isAuthenticated && user ? (
            <>
              {(user.role === 'MIGRANT' || user.role === 'VOLUNTEER' || user.role === 'ADMIN') && (
                <Link
                  to="/request-help"
                  className="font-medium text-forest-dark hover:text-primary transition-colors flex items-center gap-1 text-sm"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> {t('navbar.requestHelp', 'Request Help')}
                </Link>
              )}
              {(user.role === 'MIGRANT' || user.role === 'VOLUNTEER') && (
                <Link
                  to="/dashboard"
                  className="font-medium text-forest-dark hover:text-primary transition-colors flex items-center gap-1 text-sm"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" /> {t('navbar.dashboard', 'Dashboard')}
                </Link>
              )}
              {user.role === 'NGO' && (
                <Link
                  to="/ngo-portal"
                  className="font-medium text-forest-dark hover:text-primary transition-colors flex items-center gap-1 text-sm"
                >
                  <Building2 className="w-3.5 h-3.5" /> {t('navbar.ngoPortal', 'NGO Portal')}
                </Link>
              )}
              {user.role === 'ADMIN' && (
                <Link
                  to="/admin"
                  className="font-medium text-forest-dark hover:text-primary transition-colors flex items-center gap-1 text-sm"
                >
                  <Shield className="w-3.5 h-3.5" /> {t('navbar.adminConsole', 'Admin')}
                </Link>
              )}

              {/* Language Switcher */}
              <LanguageSwitcher variant="navbar" />

              {/* Notification Bell & Dropdown */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={handleToggleNotifications}
                  className="relative p-2 text-forest-dark hover:text-primary transition-colors rounded-full hover:bg-forest-light/10 focus:outline-none"
                  aria-label={t('navbar.notifications', 'Notifications')}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Popover */}
                {notificationsOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-forest-light/20 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-3.5 bg-bg-nature/70 border-b border-forest-light/15 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-forest-dark">
                          {t('navbar.notifications', 'Notifications')}
                        </span>
                        {unreadCount > 0 && (
                          <span className="bg-primary/10 text-primary text-[11px] font-bold px-2 py-0.5 rounded-full">
                            {unreadCount} {t('navbar.new', 'new')}
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-[11px] text-primary hover:text-forest-dark font-medium flex items-center gap-1 transition-colors"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          {t('navbar.markAllRead', 'Mark all read')}
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-forest-light/10">
                      {notificationsLoading ? (
                        <div className="p-8 text-center text-forest-dark/60 flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          <span className="text-xs">{t('navbar.loadingUpdates', 'Loading updates...')}</span>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="p-8 text-center text-forest-dark/60 flex flex-col items-center justify-center gap-2">
                          <Bell className="w-8 h-8 text-forest-light/40" />
                          <p className="text-xs font-medium">{t('navbar.noNotifications', 'No notifications yet')}</p>
                          <p className="text-[11px] text-forest-dark/40">{t('navbar.upToDate', "You're completely up to date!")}</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.notification_id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-3.5 cursor-pointer transition-colors text-left flex gap-3 items-start hover:bg-forest-light/10 ${
                              !notif.is_read ? 'bg-primary/5' : 'bg-transparent'
                            }`}
                          >
                            <div className="mt-1 flex-shrink-0">
                              {!notif.is_read ? (
                                <div className="w-2 h-2 rounded-full bg-primary ring-2 ring-primary/20" />
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-forest-light/30" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h4
                                  className={`text-xs truncate ${
                                    !notif.is_read ? 'font-bold text-forest-dark' : 'font-medium text-forest-dark/80'
                                  }`}
                                >
                                  {notif.title}
                                </h4>
                                <span className="text-[10px] text-forest-dark/50 whitespace-nowrap">
                                  {formatLocalizedTimeAgo(notif.created_at)}
                                </span>
                              </div>
                              <p className="text-[11px] text-forest-dark/70 mt-0.5 line-clamp-2 leading-relaxed">
                                {notif.message}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-2.5 bg-bg-nature/40 border-t border-forest-light/15 text-center">
                      <button
                        onClick={() => {
                          setNotificationsOpen(false);
                          if (user?.role === 'NGO') navigate('/ngo-portal');
                          else if (user?.role === 'ADMIN') navigate('/admin');
                          else navigate('/dashboard');
                        }}
                        className="text-[11px] font-medium text-primary hover:text-forest-dark transition-colors"
                      >
                        {user?.role === 'NGO'
                          ? t('navbar.goToNgoPortal', 'Go to NGO Portal →')
                          : user?.role === 'ADMIN'
                          ? t('navbar.goToAdmin', 'Go to Admin Console →')
                          : t('navbar.goToDashboard', 'Go to User Dashboard →')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* User Dropdown */}
              <div className="relative group">
                <button
                  className="flex items-center gap-2 font-medium text-forest-dark hover:text-primary transition-colors text-sm"
                  aria-label="User menu"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold">{user.full_name.split(' ')[0]}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${roleBadgeColor[user.role] || 'bg-gray-100 text-gray-800'}`}>
                    {getRoleLabel(user.role)}
                  </span>
                </button>
                <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute right-0 top-full pt-2 w-48 transition-all duration-200">
                  <div className="bg-white rounded-xl shadow-lg border border-forest-light/20 py-2 overflow-hidden">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-forest-dark hover:bg-bg-nature hover:text-primary transition-colors"
                    >
                      {t('navbar.myProfile', 'My Profile')}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> {t('navbar.logout', 'Logout')}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Language Switcher for logged-out users */}
              <LanguageSwitcher variant="navbar" />

              <Link
                to="/login"
                className="font-medium text-forest-dark hover:text-primary transition-colors flex items-center gap-1.5 text-sm"
              >
                <LogIn className="w-4 h-4" /> {t('navbar.login', 'Login')}
              </Link>
              <Link
                to="/register"
                className="bg-primary hover:bg-forest-dark text-white font-medium px-5 py-2 rounded-full shadow-md shadow-primary/25 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 text-sm"
              >
                {t('navbar.getStarted', 'Get Started')}
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <div className="md:hidden flex items-center gap-2">
          <LanguageSwitcher variant="navbar" />
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
            {/* Language Selector in Mobile Drawer */}
            <LanguageSwitcher variant="mobile" />

            <Link
              to="/"
              onClick={() => setIsOpen(false)}
              className="font-medium text-forest-dark hover:text-primary transition-colors py-2 border-b border-forest-light/20"
            >
              {t('navbar.home', 'Home')}
            </Link>
            <Link
              to="/ngos"
              onClick={() => setIsOpen(false)}
              className="font-medium text-forest-dark hover:text-primary transition-colors py-2 border-b border-forest-light/20 flex items-center gap-2"
            >
              <Search className="w-4 h-4" /> {t('navbar.findNgos', 'Find NGOs')}
            </Link>

            {isAuthenticated && user ? (
              <>
                {(user.role === 'MIGRANT' || user.role === 'VOLUNTEER' || user.role === 'ADMIN') && (
                  <Link
                    to="/request-help"
                    onClick={() => setIsOpen(false)}
                    className="font-medium text-forest-dark hover:text-primary transition-colors py-2 border-b border-forest-light/20 flex items-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" /> {t('navbar.requestHelp', 'Request Help')}
                  </Link>
                )}
                {(user.role === 'MIGRANT' || user.role === 'VOLUNTEER') && (
                  <Link
                    to="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="font-medium text-forest-dark hover:text-primary transition-colors py-2 border-b border-forest-light/20 flex items-center gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4" /> {t('navbar.dashboard', 'Dashboard')}
                  </Link>
                )}
                {user.role === 'NGO' && (
                  <Link
                    to="/ngo-portal"
                    onClick={() => setIsOpen(false)}
                    className="font-medium text-forest-dark hover:text-primary transition-colors py-2 border-b border-forest-light/20 flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4" /> {t('navbar.ngoPortal', 'NGO Portal')}
                  </Link>
                )}
                {user.role === 'ADMIN' && (
                  <Link
                    to="/admin"
                    onClick={() => setIsOpen(false)}
                    className="font-medium text-forest-dark hover:text-primary transition-colors py-2 border-b border-forest-light/20 flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" /> {t('navbar.adminConsole', 'Admin Console')}
                  </Link>
                )}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    if (user.role === 'NGO') navigate('/ngo-portal');
                    else if (user.role === 'ADMIN') navigate('/admin');
                    else navigate('/dashboard');
                  }}
                  className="font-medium text-forest-dark hover:text-primary transition-colors py-2 border-b border-forest-light/20 flex items-center justify-between w-full text-left"
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4" /> {t('navbar.notifications', 'Notifications')}
                  </div>
                  {unreadCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className="font-medium text-forest-dark hover:text-primary transition-colors py-2 border-b border-forest-light/20 flex items-center gap-2"
                >
                  <User className="w-4 h-4" /> {t('navbar.profile', 'Profile')}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-left font-medium text-rose-600 hover:text-rose-700 transition-colors py-2 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> {t('navbar.logout', 'Logout')}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="font-medium text-forest-dark hover:text-primary transition-colors py-2 border-b border-forest-light/20 flex items-center gap-2"
                >
                  <LogIn className="w-5 h-5" /> {t('navbar.login', 'Login')}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsOpen(false)}
                  className="bg-primary hover:bg-forest-dark text-white text-center font-medium py-3 rounded-xl shadow-md transition-all duration-300"
                >
                  {t('navbar.getStarted', 'Get Started')}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
