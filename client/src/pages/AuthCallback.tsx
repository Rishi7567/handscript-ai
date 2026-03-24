import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Spinner from '../components/ui/Spinner';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import axios from 'axios';

const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      addToast('Authentication failed — no token received', 'error');
      navigate('/');
      return;
    }

    const fetchUser = async () => {
      try {
        const { data } = await axios.get('http://localhost:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAuth(data.user, token);
        addToast('Welcome!', 'success');
        navigate('/generator');
      } catch {
        addToast('Authentication failed', 'error');
        navigate('/');
      }
    };

    fetchUser();
  }, [searchParams, navigate, setAuth, addToast]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Spinner size="lg" />
      <p className="text-sm text-ink-secondary">Signing you in…</p>
    </div>
  );
};

export default AuthCallback;
