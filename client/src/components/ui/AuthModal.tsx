import React, { useState, useEffect, useCallback } from 'react';
import Button from './Button';
import Input from './Input';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'signin' | 'signup';
}

const GoogleLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialView = 'signin' }) => {
  const [view, setView] = useState<'signin' | 'signup'>(initialView);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { login, signup, loginWithGoogle, loginAsGuest, isLoading } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
      setName('');
      setErrors({});
    }
  }, [isOpen, view]);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (view === 'signup' && !name.trim()) errs.name = 'Name is required';
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'At least 6 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      if (view === 'signin') {
        await login(email, password);
        addToast('Welcome back!', 'success');
      } else {
        await signup(name, email, password);
        addToast('Account created successfully!', 'success');
      }
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Something went wrong', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-paper-card rounded-2xl shadow-2xl animate-scale-in p-8">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-muted hover:text-ink transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="font-serif text-2xl text-ink">
            {view === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-ink-muted text-sm mt-1">
            {view === 'signin'
              ? 'Sign in to continue to HandScript AI'
              : 'Start creating beautiful handwriting'}
          </p>
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-white hover:bg-paper-section transition-colors text-sm font-medium text-ink"
        >
          <GoogleLogo />
          Continue with Google
        </button>

        {/* Guest */}
        <button
          type="button"
          onClick={() => {
            loginAsGuest();
            addToast('Welcome! You\'re using guest mode.', 'success');
            onClose();
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-white hover:bg-paper-section transition-colors text-sm font-medium text-ink mt-2"
        >
          <svg className="w-5 h-5 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          Continue as Guest
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-ink-muted">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {view === 'signup' && (
            <Input
              label="Full name"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
            />
          )}
          <Input
            label="Email"
            type="email"
            placeholder="jane@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            hint={view === 'signup' ? 'At least 6 characters' : undefined}
          />
          <Button type="submit" isLoading={isLoading} className="mt-1 w-full">
            {view === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        {/* Toggle */}
        <p className="text-center text-sm text-ink-muted mt-6">
          {view === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => setView(view === 'signin' ? 'signup' : 'signin')}
            className="text-accent font-medium hover:underline"
          >
            {view === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
