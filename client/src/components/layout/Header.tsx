import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import AuthModal from '../ui/AuthModal';
import Button from '../ui/Button';

const Header: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [authModal, setAuthModal] = useState<{ open: boolean; view: 'signin' | 'signup' }>({
    open: false,
    view: 'signin',
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const showGlass = scrolled || !isLanding;
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  const navLinks = isAuthenticated
    ? [
        { to: '/generator', label: 'Generator' },
        { to: '/library', label: 'Library' },
      ]
    : [];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          showGlass ? 'glass border-b border-border shadow-sm' : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-baseline gap-0.5 shrink-0">
            <span className="font-serif text-xl text-ink">HandScript</span>
            <span className="font-serif text-xl italic text-accent">AI</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? 'text-accent bg-accent-light'
                    : 'text-ink-secondary hover:text-ink hover:bg-paper-section'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-3">
            {!isAuthenticated ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAuthModal({ open: true, view: 'signin' })}
                >
                  Sign in
                </Button>
                <Button
                  size="sm"
                  onClick={() => setAuthModal({ open: true, view: 'signup' })}
                >
                  Get started
                </Button>
              </>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-paper-section transition-colors"
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-xs font-semibold">
                      {initials}
                    </div>
                  )}
                  <span className="text-sm font-medium text-ink max-w-[120px] truncate">
                    {user?.name}
                  </span>
                  <svg
                    className={`w-4 h-4 text-ink-muted transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-paper-card border border-border rounded-xl shadow-lg py-1 animate-scale-in origin-top-right">
                    <Link
                      to="/library"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-paper-section transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <svg className="w-4 h-4 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      My Styles
                    </Link>
                    <div className="border-t border-border my-1" />
                    <button
                      onClick={() => {
                        logout();
                        setDropdownOpen(false);
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 -mr-2 text-ink"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-16 right-0 bottom-0 w-72 bg-paper-card border-l border-border shadow-xl z-30 md:hidden animate-slide-in-right">
            <div className="flex flex-col p-6 gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? 'text-accent bg-accent-light'
                      : 'text-ink hover:bg-paper-section'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {isAuthenticated && (
                <>
                  <div className="border-t border-border my-3" />
                  <div className="flex items-center gap-3 px-4 py-2">
                    <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-xs font-semibold">
                      {initials}
                    </div>
                    <span className="text-sm font-medium text-ink">{user?.name}</span>
                  </div>
                  <Link
                    to="/library"
                    className="px-4 py-3 rounded-xl text-sm text-ink hover:bg-paper-section transition-colors"
                  >
                    My Styles
                  </Link>
                  <button
                    onClick={logout}
                    className="px-4 py-3 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                  >
                    Sign out
                  </button>
                </>
              )}
              {!isAuthenticated && (
                <>
                  <div className="border-t border-border my-3" />
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setAuthModal({ open: true, view: 'signin' });
                    }}
                  >
                    Sign in
                  </Button>
                  <Button
                    className="mt-1"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setAuthModal({ open: true, view: 'signup' });
                    }}
                  >
                    Get started
                  </Button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <AuthModal
        isOpen={authModal.open}
        onClose={() => setAuthModal({ ...authModal, open: false })}
        initialView={authModal.view}
      />
    </>
  );
};

export default Header;
