import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthCallbackPage() {
  const { status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'AUTHENTICATED') navigate('/admin/id-cards', { replace: true });
    if (status === 'UNAUTHENTICATED' || status === 'AUTH_ERROR') navigate('/', { replace: true });
  }, [status, navigate]);

  return <div className="flex h-screen items-center justify-center text-slate-500">Signing you in...</div>;
}
