import React, { useEffect } from 'react';
import useAuthStore from '../../store/authStore';

export default function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.hash = 'login';
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return null; // Or a loading screen
  }

  return children;
}
