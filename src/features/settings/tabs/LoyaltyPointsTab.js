import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ConfirmModal, Button } from '../../../components/ui';
import { fetchAppSettingsAPI, updateAppSettingsAPI } from '../../../api/appSettings';
import useAuthStore from '../../../store/authStore';
import useSettingsStore from '../../../store/settingsStore-DB';

function formatAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  return amount.toFixed(2).replace(/\.?0+$/, '');
}

export default function LoyaltyPointsTab({ onSaveToast }) {
  const companyId = useSettingsStore((state) => state.companyId || 1);
  const savedEnabled = useSettingsStore((state) => state.loyaltyEnabled);
  const savedAmountPerPoint = useSettingsStore(
    (state) => state.loyaltyAmountPerPoint
  );
  const savedPointsPerUnit = useSettingsStore(
    (state) => state.loyaltyPointsPerUnit
  );
  const userRole = useAuthStore((state) => state.user?.role);
  const canManage = ['OWNER', 'ADMIN'].includes(
    String(userRole || '').toUpperCase()
  );
  const [form, setForm] = useState({
    loyaltyEnabled: savedEnabled ?? true,
    loyaltyAmountPerPoint: String(savedAmountPerPoint ?? ''),
    loyaltyPointsPerUnit: String(savedPointsPerUnit ?? ''),
    loyaltyRedemptionEnabled:
      useSettingsStore.getState().loyaltyRedemptionEnabled ?? false,
    loyaltyRedemptionAmountPerPoint: String(
      useSettingsStore.getState().loyaltyRedemptionAmountPerPoint ?? 1
    ),
    loyaltyMinimumRedemptionPoints: String(
      useSettingsStore.getState().loyaltyMinimumRedemptionPoints ?? 1
    ),
    loyaltyMaxRedemptionPercentage: String(
      useSettingsStore.getState().loyaltyMaxRedemptionPercentage ?? 100
    ),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');
  const [refreshWarning, setRefreshWarning] = useState('');

  const currentSettings = useMemo(
    () => ({
      loyaltyEnabled: form.loyaltyEnabled,
      loyaltyAmountPerPoint: Number(form.loyaltyAmountPerPoint),
      loyaltyPointsPerUnit: Number(form.loyaltyPointsPerUnit),
      loyaltyRedemptionEnabled: form.loyaltyRedemptionEnabled,
      loyaltyRedemptionAmountPerPoint: Number(
        form.loyaltyRedemptionAmountPerPoint
      ),
      loyaltyMinimumRedemptionPoints: Number(
        form.loyaltyMinimumRedemptionPoints
      ),
      loyaltyMaxRedemptionPercentage: Number(
        form.loyaltyMaxRedemptionPercentage
      ),
    }),
    [form]
  );

  const explanationAmount = formatAmount(form.loyaltyAmountPerPoint);
  const explanationPoints = Number(form.loyaltyPointsPerUnit);
  const canSave =
    canManage &&
    !loading &&
    !saving &&
    Number.isFinite(currentSettings.loyaltyAmountPerPoint) &&
    (form.loyaltyEnabled
      ? currentSettings.loyaltyAmountPerPoint > 0
      : currentSettings.loyaltyAmountPerPoint >= 0) &&
    /^\d+(\.\d{1,2})?$/.test(String(form.loyaltyAmountPerPoint)) &&
    Number.isInteger(currentSettings.loyaltyPointsPerUnit) &&
    currentSettings.loyaltyPointsPerUnit > 0 &&
    Number.isFinite(currentSettings.loyaltyRedemptionAmountPerPoint) &&
    currentSettings.loyaltyRedemptionAmountPerPoint > 0 &&
    /^\d+(\.\d{1,2})?$/.test(
      String(form.loyaltyRedemptionAmountPerPoint)
    ) &&
    Number.isInteger(currentSettings.loyaltyMinimumRedemptionPoints) &&
    currentSettings.loyaltyMinimumRedemptionPoints > 0 &&
    Number.isFinite(currentSettings.loyaltyMaxRedemptionPercentage) &&
    currentSettings.loyaltyMaxRedemptionPercentage >= 0 &&
    currentSettings.loyaltyMaxRedemptionPercentage <= 100 &&
    /^\d+(\.\d{1,2})?$/.test(
      String(form.loyaltyMaxRedemptionPercentage)
    );

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    setRefreshWarning('');
    try {
      const settings = await fetchAppSettingsAPI(companyId);
      if (!settings) {
        throw new Error('Unable to load loyalty settings from the server.');
      }

      setForm({
        loyaltyEnabled:
          settings.loyaltyEnabled ?? useSettingsStore.getState().loyaltyEnabled ?? true,
        loyaltyAmountPerPoint: String(
          settings.loyaltyAmountPerPoint ??
            useSettingsStore.getState().loyaltyAmountPerPoint ??
            ''
        ),
        loyaltyPointsPerUnit: String(
          settings.loyaltyPointsPerUnit ??
            useSettingsStore.getState().loyaltyPointsPerUnit ??
            ''
        ),
        loyaltyRedemptionEnabled:
          settings.loyaltyRedemptionEnabled ??
          useSettingsStore.getState().loyaltyRedemptionEnabled ??
          false,
        loyaltyRedemptionAmountPerPoint: String(
          settings.loyaltyRedemptionAmountPerPoint ??
            useSettingsStore.getState().loyaltyRedemptionAmountPerPoint ??
            1
        ),
        loyaltyMinimumRedemptionPoints: String(
          settings.loyaltyMinimumRedemptionPoints ??
            useSettingsStore.getState().loyaltyMinimumRedemptionPoints ??
            1
        ),
        loyaltyMaxRedemptionPercentage: String(
          settings.loyaltyMaxRedemptionPercentage ??
            useSettingsStore.getState().loyaltyMaxRedemptionPercentage ??
            100
        ),
      });
      useSettingsStore.setState({
        ...settings,
        companyId,
        isLoaded: true,
        isSyncing: false,
        syncError: null,
        lastSyncTime: new Date(),
      });
    } catch (loadError) {
      setError(loadError.message || 'Unable to load loyalty settings.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  function handleInputChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    setError('');
    setRefreshWarning('');
    try {
      const saved = await updateAppSettingsAPI(currentSettings, companyId);
      if (!saved) {
        throw new Error('The server did not return the saved settings.');
      }

      useSettingsStore.setState({
        ...saved,
        companyId,
        isLoaded: true,
        isSyncing: false,
        syncError: null,
        lastSyncTime: new Date(),
      });

      try {
        const refreshed = await fetchAppSettingsAPI(companyId);
        if (refreshed) {
          setForm({
            loyaltyEnabled: refreshed.loyaltyEnabled === true,
            loyaltyAmountPerPoint: String(
              refreshed.loyaltyAmountPerPoint ?? ''
            ),
            loyaltyPointsPerUnit: String(
              refreshed.loyaltyPointsPerUnit ?? ''
            ),
            loyaltyRedemptionEnabled:
              refreshed.loyaltyRedemptionEnabled === true,
            loyaltyRedemptionAmountPerPoint: String(
              refreshed.loyaltyRedemptionAmountPerPoint ?? 1
            ),
            loyaltyMinimumRedemptionPoints: String(
              refreshed.loyaltyMinimumRedemptionPoints ?? 1
            ),
            loyaltyMaxRedemptionPercentage: String(
              refreshed.loyaltyMaxRedemptionPercentage ?? 100
            ),
          });
          useSettingsStore.setState({
            ...refreshed,
            companyId,
            isLoaded: true,
            isSyncing: false,
            syncError: null,
            lastSyncTime: new Date(),
          });
        } else {
          setForm({
            loyaltyEnabled: saved.loyaltyEnabled === true,
            loyaltyAmountPerPoint: String(saved.loyaltyAmountPerPoint ?? ''),
            loyaltyPointsPerUnit: String(saved.loyaltyPointsPerUnit ?? ''),
            loyaltyRedemptionEnabled:
              saved.loyaltyRedemptionEnabled === true,
            loyaltyRedemptionAmountPerPoint: String(
              saved.loyaltyRedemptionAmountPerPoint ?? 1
            ),
            loyaltyMinimumRedemptionPoints: String(
              saved.loyaltyMinimumRedemptionPoints ?? 1
            ),
            loyaltyMaxRedemptionPercentage: String(
              saved.loyaltyMaxRedemptionPercentage ?? 100
            ),
          });
          setRefreshWarning(
            'Settings were saved. The reload could not be completed, so values from the save response are shown.'
          );
        }
      } catch {
        setRefreshWarning(
          'Settings were saved. The reload could not be completed, so values from the save response are shown.'
        );
      }

      setConfirmOpen(false);
      onSaveToast?.('Loyalty points settings saved');
    } catch (saveError) {
      setError(
        saveError.response?.data?.message ||
          saveError.message ||
          'Unable to save loyalty settings.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ConfirmModal
        open={confirmOpen}
        onClose={() => {
          if (!saving) setConfirmOpen(false);
        }}
        onConfirm={handleSave}
        title="Save loyalty points settings?"
        message="This changes future loyalty earning and POS redemption rules. Existing customer balances and loyalty history will not be recalculated."
        confirmLabel="Save settings"
        loading={saving}
        icon="⭐"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
        <div className="card">
          <div className="card__header">
            <span className="card__title">Loyalty Points Configuration</span>
          </div>
          <div
            className="card__body"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--sp-4)',
            }}
          >
            {loading ? (
              <p role="status">Loading loyalty settings…</p>
            ) : (
              <>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="loyalty-amount-per-point">
                      Purchase Amount (₹)
                    </label>
                    <input
                      id="loyalty-amount-per-point"
                      name="loyaltyAmountPerPoint"
                      className="form-input"
                      type="number"
                      min={form.loyaltyEnabled ? '0.01' : '0'}
                      step="0.01"
                      value={form.loyaltyAmountPerPoint}
                      onChange={handleInputChange}
                      disabled={!canManage || saving}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="loyalty-minimum-redemption-points">
                      Minimum Points to Redeem
                    </label>
                    <input
                      id="loyalty-minimum-redemption-points"
                      name="loyaltyMinimumRedemptionPoints"
                      className="form-input"
                      type="number"
                      min="1"
                      step="1"
                      value={form.loyaltyMinimumRedemptionPoints}
                      onChange={handleInputChange}
                      disabled={!canManage || saving}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="loyalty-points-per-unit">
                      Points to Award
                    </label>
                    <input
                      id="loyalty-points-per-unit"
                      name="loyaltyPointsPerUnit"
                      className="form-input"
                      type="number"
                      min="1"
                      step="1"
                      value={form.loyaltyPointsPerUnit}
                      onChange={handleInputChange}
                      disabled={!canManage || saving}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    padding: '12px 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 'var(--fs-sm)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      Loyalty points earning
                    </div>
                    <div
                      style={{
                        fontSize: 'var(--fs-xs)',
                        color: 'var(--text-muted)',
                        marginTop: 2,
                      }}
                    >
                      Turn off to stop awarding points on future eligible sales.
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.loyaltyEnabled}
                    aria-label="Loyalty points earning status"
                    onClick={() =>
                      setForm((previous) => ({
                        ...previous,
                        loyaltyEnabled: !previous.loyaltyEnabled,
                      }))
                    }
                    disabled={!canManage || saving}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      background: form.loyaltyEnabled
                        ? 'var(--primary)'
                        : '#cbd5e1',
                      border: 'none',
                      cursor: canManage ? 'pointer' : 'not-allowed',
                      position: 'relative',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 2,
                        left: form.loyaltyEnabled ? 22 : 2,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: '#fff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    />
                  </button>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="loyalty-redemption-value">
                      Redemption Value per Point (₹)
                    </label>
                    <input
                      id="loyalty-redemption-value"
                      name="loyaltyRedemptionAmountPerPoint"
                      className="form-input"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.loyaltyRedemptionAmountPerPoint}
                      onChange={handleInputChange}
                      disabled={!canManage || saving}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="loyalty-redemption-limit">
                      Maximum Bill Redemption (%)
                    </label>
                    <input
                      id="loyalty-redemption-limit"
                      name="loyaltyMaxRedemptionPercentage"
                      className="form-input"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.loyaltyMaxRedemptionPercentage}
                      onChange={handleInputChange}
                      disabled={!canManage || saving}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    padding: '12px 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>
                      POS loyalty redemption
                    </div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                      Cashiers must opt in at checkout. Redemption cannot exceed available points or this bill limit.
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.loyaltyRedemptionEnabled}
                    aria-label="POS loyalty redemption status"
                    onClick={() =>
                      setForm((previous) => ({
                        ...previous,
                        loyaltyRedemptionEnabled: !previous.loyaltyRedemptionEnabled,
                      }))
                    }
                    disabled={!canManage || saving}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      background: form.loyaltyRedemptionEnabled
                        ? 'var(--primary)'
                        : '#cbd5e1',
                      border: 'none',
                      cursor: canManage ? 'pointer' : 'not-allowed',
                      position: 'relative',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 2,
                        left: form.loyaltyRedemptionEnabled ? 22 : 2,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: '#fff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    />
                  </button>
                </div>

                {explanationAmount && explanationPoints > 0 && (
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--primary-light)',
                      color: 'var(--text-primary)',
                      fontSize: 'var(--fs-sm)',
                    }}
                  >
                    {form.loyaltyEnabled
                      ? `Customers earn ${explanationPoints} loyalty ${
                          explanationPoints === 1 ? 'point' : 'points'
                        } for every ₹${explanationAmount} spent.`
                      : 'Loyalty points earning is inactive.'}
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 'var(--fs-xs)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      The backend calculates awards for eligible sales; existing
                      points are not changed.
                    </div>
                  </div>
                )}
              </>
            )}

            {!canManage && !loading && (
              <div role="status" style={{ color: 'var(--text-muted)' }}>
                Only an Owner or Admin can update loyalty earning settings.
              </div>
            )}
            {error && (
              <div role="alert" style={{ color: 'var(--danger, #b91c1c)' }}>
                {error}
              </div>
            )}
            {refreshWarning && (
              <div role="status" style={{ color: 'var(--text-muted)' }}>
                {refreshWarning}
              </div>
            )}

            {!loading && (
              <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                <Button
                  variant="primary"
                  loading={saving}
                  disabled={!canSave}
                  onClick={() => {
                    if (!canSave) return;
                    setError('');
                    setConfirmOpen(true);
                  }}
                >
                  Save Loyalty Settings
                </Button>
                <Button
                  variant="secondary"
                  disabled={saving}
                  onClick={loadSettings}
                >
                  Refresh
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card__body" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
            Configuration history is not available in the current backend API.
          </div>
        </div>
      </div>
    </>
  );
}
