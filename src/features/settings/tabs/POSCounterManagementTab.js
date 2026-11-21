import React, { useCallback, useEffect, useState } from 'react';
import { FiEdit2, FiPlus, FiRefreshCw, FiX } from 'react-icons/fi';
import { Button, LoadingSpinner } from '../../../components/ui';
import { fetchCompanyUsersAPI } from '../../../api';
import {
  createPosCounterAPI,
  fetchPosCountersAPI,
  updatePosCounterAPI,
} from '../../../api/pos';
import useAuthStore from '../../../store/authStore';
import useAppStore from '../../../store/appStore';

const emptyForm = { counterName: '', assignedUserId: '', status: 'ACTIVE' };

export default function POSCounterManagementTab({ onSaveToast }) {
  const authUser = useAuthStore((state) => state.user);
  const companies = useAppStore((state) => state.companies);
  const companyId = authUser?.companyId || (
    Array.isArray(companies) ? companies[0]?.id : companies?.id
  );
  const [counters, setCounters] = useState([]);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (!companyId) {
        throw new Error('Company context is required to manage POS counters.');
      }
      const [counterRows, staffResponse] = await Promise.all([
        fetchPosCountersAPI(),
        fetchCompanyUsersAPI(companyId),
      ]);
      if (!Array.isArray(counterRows)) {
        throw new Error('Counter list response is invalid.');
      }
      if (!Array.isArray(staffResponse?.data)) {
        throw new Error(staffResponse?.message || 'Staff list response is invalid.');
      }
      setCounters(counterRows);
      setStaff(staffResponse.data.filter(
        (user) =>
          user.role === 'Staff' &&
          (user.is_active === true ||
            user.is_active === 1 ||
            user.is_active === '1' ||
            user.is_active === 'true'),
      ));
    } catch (error) {
      onSaveToast?.(
        typeof error === 'string' ? error : error.message || 'Could not load POS counters.',
        'error',
      );
    } finally {
      setLoading(false);
    }
  }, [companyId, onSaveToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const counterName = form.counterName.trim();
    if (!counterName) {
      onSaveToast?.('Enter a counter name.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        counterName,
        assignedUserId: form.assignedUserId || null,
        status: form.status,
      };
      if (editingId) {
        await updatePosCounterAPI(editingId, payload);
      } else {
        await createPosCounterAPI(payload);
      }
      onSaveToast?.(editingId ? 'POS counter updated.' : 'POS counter created.');
      resetForm();
      await loadData();
    } catch (error) {
      onSaveToast?.(
        typeof error === 'string' ? error : error.message || 'Could not save POS counter.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (counter) => {
    setEditingId(counter.id);
    setForm({
      counterName: counter.counterName || '',
      assignedUserId: counter.assignedUserId ? String(counter.assignedUserId) : '',
      status: counter.status || 'ACTIVE',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div className="card">
        <div className="card__header">
          <span className="card__title">POS Counter Management</span>
          <span className="badge badge--info">{counters.length} counters</span>
        </div>
        <div className="card__body">
          <p style={{ margin: '0 0 var(--sp-4)', color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)' }}>
            Assign each active staff member to one counter. Each counter can have one
            assigned staff member; only one open shift may use a counter at a time.
          </p>
          <form onSubmit={handleSubmit} className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="pos-counter-name">Counter name</label>
              <input
                id="pos-counter-name"
                className="form-input"
                maxLength={120}
                value={form.counterName}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  counterName: event.target.value,
                }))}
                placeholder="e.g. Main Billing Counter"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="pos-counter-staff">Assigned staff</label>
              <select
                id="pos-counter-staff"
                className="form-select"
                value={form.assignedUserId}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  assignedUserId: event.target.value,
                }))}
              >
                <option value="">Unassigned</option>
                {staff.map((user) => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
            {editingId && (
              <div className="form-group">
                <label className="form-label" htmlFor="pos-counter-status">Status</label>
                <select
                  id="pos-counter-status"
                  className="form-select"
                  value={form.status}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'end', gap: 'var(--sp-2)' }}>
              <Button variant="primary" type="submit" loading={saving}>
                {editingId ? 'Save Counter' : <><FiPlus /> Add Counter</>}
              </Button>
              {editingId && (
                <Button variant="secondary" type="button" onClick={resetForm}>
                  <FiX /> Cancel
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <span className="card__title">Configured Counters</span>
          <Button variant="secondary" size="sm" onClick={loadData} disabled={loading}>
            <FiRefreshCw /> Refresh
          </Button>
        </div>
        {loading ? (
          <div className="card__body"><LoadingSpinner message="Loading POS counters..." /></div>
        ) : counters.length === 0 ? (
          <div className="card__body" style={{ color: 'var(--text-muted)' }}>
            No counters configured. Add a counter to enable POS shift assignment.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Counter</th>
                  <th>Code</th>
                  <th>Assigned staff</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {counters.map((counter) => (
                  <tr key={counter.id}>
                    <td>{counter.counterName}</td>
                    <td>{counter.counterCode}</td>
                    <td>{counter.assignedUser?.name || 'Unassigned'}</td>
                    <td>{counter.status === 'ACTIVE' ? 'Active' : 'Inactive'}</td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(counter)}
                        aria-label={`Edit ${counter.counterName}`}
                      >
                        <FiEdit2 /> Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
