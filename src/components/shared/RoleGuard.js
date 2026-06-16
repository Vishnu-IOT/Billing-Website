import React, { useEffect } from 'react';
import useAuthStore from '../../store/authStore';

export default function RoleGuard({ allowedRoles, children }) {
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user && !allowedRoles.includes(user.role)) {
      console.warn(`Access denied. Role ${user.role} is not allowed to access this resource.`);
      // Redirect to dashboard
      window.location.hash = 'dashboard';
    }
  }, [isAuthenticated, user, allowedRoles]);

  if (!isAuthenticated || !user || !allowedRoles.includes(user.role)) {
    return null;
  }

  return children;
}
