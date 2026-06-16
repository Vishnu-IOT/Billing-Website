import React, { useState, useEffect } from 'react';
import { fetchFinancialDetailsAPI, updateFinancialDetailsAPI } from '../../api';
import { Button, ToastContainer } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import '../../styles/Financials.css';

export default function Financials() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    id: '',
    gstin: '',
    pan: '',
    tan: '',
    cin: '',
    bank_name: '',
    bank_account_enc: '',
    ifsc_code: '',
    account_type: 'Current',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    async function loadFinancials() {
      setLoading(true);
      try {
        // Fetch financial details using companyId = 1
        const response = await fetchFinancialDetailsAPI(1);
        const data = response.data;
        if (data) {
          setForm({
            id: data.id || '',
            gstin: data.gstin || '',
            pan: data.pan || '',
            tan: data.tan || '',
            cin: data.cin || '',
            bank_name: data.bank_name || '',
            bank_account_enc: data.bank_account_enc || '',
            ifsc_code: data.ifsc_code || '',
            account_type: data.account_type || 'Current',
          });
        }
      } catch (err) {
        toast.error('Failed to load financial details.');
      } finally {
        setLoading(false);
      }
    }
    loadFinancials();
  }, []);

  function validate() {
    const tempErrors = {};

    // GSTIN Validation (15-character alphanumeric, e.g., 22AAAAA1111A1Z1)
    if (form.gstin) {
      const gstinRegex =
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
      if (!gstinRegex.test(form.gstin)) {
        tempErrors.gstin = 'Invalid GSTIN format (e.g. 22AAAAA1111A1Z1)';
      }
    }

    // PAN Validation (10-character alphanumeric, e.g., AAAAA1111A)
    if (form.pan) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;
      if (!panRegex.test(form.pan)) {
        tempErrors.pan = 'Invalid PAN format (e.g. AAAAA1111A)';
      }
    }

    // TAN Validation (10-character alphanumeric, e.g. ABCD12345E)
    if (form.tan) {
      const tanRegex = /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/i;
      if (!tanRegex.test(form.tan)) {
        tempErrors.tan = 'Invalid TAN format (e.g. ABCD12345E)';
      }
    }

    // CIN Validation (21-character alphanumeric, e.g., L21000MH1990PLC056635)
    if (form.cin) {
      const cinRegex = /^[LU]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/i;
      if (!cinRegex.test(form.cin)) {
        tempErrors.cin = 'Invalid CIN format (e.g. L21000MH1990PLC056635)';
      }
    }

    // Bank Account Number (Between 9 and 18 digits)
    if (form.bank_account_enc) {
      if (!/^\d{9,18}$/.test(form.bank_account_enc)) {
        tempErrors.bank_account_enc =
          'Account number must be between 9 and 18 digits';
      }
    }

    // IFSC Code Validation (11-character alphanumeric, e.g., SBIN0020123)
    if (form.ifsc_code) {
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/i;
      if (!ifscRegex.test(form.ifsc_code)) {
        tempErrors.ifsc_code = 'Invalid IFSC format (e.g. SBIN0020123)';
      }
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!validate()) {
      toast.warning('Please fix the errors before saving.');
      return;
    }
    setSaving(true);
    try {
      const result = await updateFinancialDetailsAPI(1, form.id, form);
      if (result) {
        toast.success('Financial details updated successfully.');
      } else {
        toast.error('Could not save financial details.');
      }
    } catch (err) {
      toast.error('Error occurred while updating financials.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          height: '50dvh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ fontSize: 'var(--fs-base)', color: 'var(--text-muted)' }}>
          Loading Financial Details...
        </p>
      </div>
    );
  }

  return (
    <div className="fin-page">
      <ToastContainer toasts={toast.toasts} />

      <div className="page-header">
        <div className="page-header__left">
          <h1>Financial Details</h1>
          <p className="page-header__sub">
            Manage tax registrations and corporate bank accounts
          </p>
        </div>
      </div>

      <div className="fin-card">
        <div className="fin-card-header">
          <span className="fin-card-title">Tax &amp; Registrations</span>
        </div>
        <div className="fin-card-body">
          <form onSubmit={handleSave}>
            <div className="fin-form-layout">
              <div className="fin-form-grid-2">
                <div className="fin-form-group">
                  <label className="fin-form-label">GSTIN</label>
                  <input
                    type="text"
                    name="gstin"
                    className={`fin-form-input ${errors.gstin ? 'fin-form-input--error' : ''}`}
                    value={form.gstin}
                    onChange={handleChange}
                    placeholder="15-digit GSTIN number"
                    maxLength={15}
                    style={{ textTransform: 'uppercase' }}
                  />
                  {errors.gstin && (
                    <span className="fin-error-text">{errors.gstin}</span>
                  )}
                </div>

                <div className="fin-form-group">
                  <label className="fin-form-label">PAN</label>
                  <input
                    type="text"
                    name="pan"
                    className={`fin-form-input ${errors.pan ? 'fin-form-input--error' : ''}`}
                    value={form.pan}
                    onChange={handleChange}
                    placeholder="10-digit PAN number"
                    maxLength={10}
                    style={{ textTransform: 'uppercase' }}
                  />
                  {errors.pan && (
                    <span className="fin-error-text">{errors.pan}</span>
                  )}
                </div>

                <div className="fin-form-group">
                  <label className="fin-form-label">TAN</label>
                  <input
                    type="text"
                    name="tan"
                    className={`fin-form-input ${errors.tan ? 'fin-form-input--error' : ''}`}
                    value={form.tan}
                    onChange={handleChange}
                    placeholder="10-digit TAN number"
                    maxLength={10}
                    style={{ textTransform: 'uppercase' }}
                  />
                  {errors.tan && (
                    <span className="fin-error-text">{errors.tan}</span>
                  )}
                </div>

                <div className="fin-form-group">
                  <label className="fin-form-label">CIN</label>
                  <input
                    type="text"
                    name="cin"
                    className={`fin-form-input ${errors.cin ? 'fin-form-input--error' : ''}`}
                    value={form.cin}
                    onChange={handleChange}
                    placeholder="21-digit CIN number"
                    maxLength={21}
                    style={{ textTransform: 'uppercase' }}
                  />
                  {errors.cin && (
                    <span className="fin-error-text">{errors.cin}</span>
                  )}
                </div>
              </div>

              <div
                className="fin-form-section-title"
                style={{ marginTop: 'var(--sp-2)' }}
              >
                Bank Account Details
              </div>

              <div className="fin-form-grid-2">
                <div className="fin-form-group">
                  <label className="fin-form-label">Bank Name</label>
                  <input
                    type="text"
                    name="bank_name"
                    className="fin-form-input"
                    value={form.bank_name}
                    onChange={handleChange}
                    placeholder="e.g. HDFC Bank, ICICI Bank"
                  />
                </div>

                <div className="fin-form-group">
                  <label className="fin-form-label">Account Type</label>
                  <select
                    name="account_type"
                    className="fin-form-select"
                    value={form.account_type}
                    onChange={handleChange}
                  >
                    <option value="Current">Current Account</option>
                    <option value="Savings">Savings Account</option>
                    <option value="Salary">Salary Account</option>
                    <option value="Other">Others</option>
                  </select>
                </div>

                <div className="fin-form-group">
                  <label className="fin-form-label">Account Number</label>
                  <input
                    type="text"
                    name="bank_account_enc"
                    className={`fin-form-input ${errors.bank_account_enc ? 'fin-form-input--error' : ''}`}
                    value={form.bank_account_enc}
                    onChange={handleChange}
                    placeholder="Bank account number"
                    maxLength={18}
                  />
                  {errors.bank_account_enc && (
                    <span className="fin-error-text">
                      {errors.bank_account_enc}
                    </span>
                  )}
                </div>

                <div className="fin-form-group">
                  <label className="fin-form-label">IFSC Code</label>
                  <input
                    type="text"
                    name="ifsc_code"
                    className={`fin-form-input ${errors.ifsc_code ? 'fin-form-input--error' : ''}`}
                    value={form.ifsc_code}
                    onChange={handleChange}
                    placeholder="11-digit IFSC code"
                    maxLength={11}
                    style={{ textTransform: 'uppercase' }}
                  />
                  {errors.ifsc_code && (
                    <span className="fin-error-text">{errors.ifsc_code}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="fin-actions">
              <Button
                type="submit"
                variant="primary"
                loading={saving}
                size="lg"
              >
                Save Financial Details
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
