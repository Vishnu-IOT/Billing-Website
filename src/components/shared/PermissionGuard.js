import React from 'react';
import useAuthStore from '../../store/authStore';
import { canAccessPage } from '../../utils/permissions';

export default function PermissionGuard({ page, searchParams, children }) {
  const user = useAuthStore((state) => state.user);
  if (!canAccessPage(user, page, searchParams)) {
    return (
      <div role="alert" style={{ padding: 24 }}>
        <h2>Access denied</h2>
        <p>Your role does not have permission to open this page.</p>
      </div>
    );
  }
  return children;
}
