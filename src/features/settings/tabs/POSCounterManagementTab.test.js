import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import POSCounterManagementTab from './POSCounterManagementTab';
import { fetchCompanyUsersAPI } from '../../../api';
import { fetchPosCountersAPI } from '../../../api/pos';

jest.mock('../../../api', () => ({
  fetchCompanyUsersAPI: jest.fn(),
}));

jest.mock('../../../api/pos', () => ({
  fetchPosCountersAPI: jest.fn(),
  createPosCounterAPI: jest.fn(),
  updatePosCounterAPI: jest.fn(),
}));

jest.mock('../../../store/authStore', () => ({
  __esModule: true,
  default: (selector) => selector({ user: { companyId: 5 } }),
}));

jest.mock('../../../store/appStore', () => ({
  __esModule: true,
  default: (selector) => selector({ companies: [{ id: 5 }] }),
}));

test('counter assignment lists only active Staff users accepted by the API', async () => {
  fetchPosCountersAPI.mockResolvedValue([]);
  fetchCompanyUsersAPI.mockResolvedValue({
    data: [
      { id: 1, name: 'Active Staff', role: 'Staff', is_active: true },
      { id: 2, name: 'Admin', role: 'Admin', is_active: true },
      { id: 3, name: 'Owner', role: 'Owner', is_active: true },
      { id: 4, name: 'Inactive Staff', role: 'Staff', is_active: false },
      { id: 5, name: 'String Inactive Staff', role: 'Staff', is_active: '0' },
    ],
  });

  render(<POSCounterManagementTab />);

  await waitFor(() => {
    expect(screen.getByRole('option', { name: 'Active Staff' })).toBeTruthy();
  });
  expect(screen.queryByRole('option', { name: 'Admin' })).toBeNull();
  expect(screen.queryByRole('option', { name: 'Owner' })).toBeNull();
  expect(screen.queryByRole('option', { name: 'Inactive Staff' })).toBeNull();
  expect(
    screen.queryByRole('option', { name: 'String Inactive Staff' }),
  ).toBeNull();
});
