import React from 'react';
import useUIStore from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import { canAccessPage } from '../../utils/permissions';

export default function RoleGuard({ children }) {
  const user = useAuthStore((state) => state.user);
  const { page, searchParams } = useUIStore();
  if (!user || !canAccessPage(user, page, searchParams)) {
    return null;
  }
  return children;
}
