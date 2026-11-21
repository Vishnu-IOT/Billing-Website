import usePosStore from './posStore';
import { fetchCurrentShiftAPI } from '../api/pos';

jest.mock('../api/pos', () => ({
  fetchCurrentShiftAPI: jest.fn(),
  startShiftAPI: jest.fn(),
  endShiftAPI: jest.fn(),
  holdCartAPI: jest.fn(),
  fetchHoldCartsAPI: jest.fn(),
  resumeHoldCartAPI: jest.fn(),
  cancelHoldCartAPI: jest.fn(),
  fetchShiftDetailsAPI: jest.fn(),
}));

describe('POS active shift user context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePosStore.getState().clearActiveShift();
  });

  test('loads the current shift using the authenticated user and company IDs', async () => {
    const shift = { id: 21, userId: 7, companyId: 3, status: 'OPEN' };
    fetchCurrentShiftAPI.mockResolvedValue(shift);

    await usePosStore.getState().checkCurrentShift(7, 3);

    expect(fetchCurrentShiftAPI).toHaveBeenCalledWith(7, 3);
    expect(usePosStore.getState().activeShift).toEqual(shift);
    expect(usePosStore.getState().activeShiftContext).toEqual({
      userId: 7,
      companyId: 3,
    });
  });

  test('does not let a previous user request replace the latest user shift', async () => {
    let resolveUserA;
    let resolveUserB;
    fetchCurrentShiftAPI
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveUserA = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveUserB = resolve;
          }),
      );

    const userARequest = usePosStore.getState().checkCurrentShift(7, 3);
    const userBRequest = usePosStore.getState().checkCurrentShift(8, 3);

    resolveUserA({ id: 21, userId: 7, companyId: 3, status: 'OPEN' });
    await userARequest;
    expect(usePosStore.getState().activeShift).toBeNull();

    const userBShift = { id: 22, userId: 8, companyId: 3, status: 'OPEN' };
    resolveUserB(userBShift);
    await userBRequest;
    expect(usePosStore.getState().activeShift).toEqual(userBShift);
  });

  test('clears the active shift when the authenticated identity is unavailable', async () => {
    usePosStore.setState({
      activeShift: { id: 21, userId: 7, companyId: 3, status: 'OPEN' },
    });

    await usePosStore.getState().checkCurrentShift(null, null);

    expect(fetchCurrentShiftAPI).not.toHaveBeenCalled();
    expect(usePosStore.getState().activeShift).toBeNull();
    expect(usePosStore.getState().activeShiftContext).toBeNull();
  });
});
