import React, { useState, useEffect } from 'react';
import { fetchCompaniesAPI, updateCompanyAPI } from '../../api';
import { Button, ToastContainer } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import '../../styles/Company.css';

export default function Company() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    legal_name: '',
    display_name: '',
    business_type: '',
    industry: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state_code: '',
    pincode: '',
    country_code: '',
    phone: '',
    email: '',
    website: '',
    logo_url: '',
    brand_color: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    async function loadCompany() {
      setLoading(true);
      try {
        const response = await fetchCompaniesAPI(1);
        const data = response.data;
        if (data) {
          setForm({
            legal_name: data.legal_name || '',
            display_name: data.display_name || '',
            business_type: data.business_type || '',
            industry: data.industry || '',
            address_line1: data.address_line1 || '',
            address_line2: data.address_line2 || '',
            city: data.city || '',
            state_code: data.state_code || '',
            country_code: data.country_code || '',
            pincode: data.pincode || '',
            phone: data.phone || '',
            email: data.email || '',
            website: data.website || '',
            logo_url: data.logo_url || '',
            brand_color: data.brand_color || '',
          });
        }
      } catch (err) {
        toast.error('Failed to load company details.');
      } finally {
        setLoading(false);
      }
    }
    loadCompany();
  }, []);

  function validate() {
    const tempErrors = {};
    if (!form.legal_name.trim()) {
      tempErrors.legal_name = 'Company legal name is required';
    }
    if (!form.display_name.trim()) {
      tempErrors.display_name = 'Company display name is required';
    }
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
      tempErrors.email = 'Invalid email address';
    }
    if (form.phone && !/^\d{10}$/.test(form.phone)) {
      tempErrors.phone = 'Phone number must be exactly 10 digits';
    }
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
      tempErrors.pincode = 'Pincode must be exactly 6 digits';
    }
    if (
      form.website &&
      !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(
        form.website
      )
    ) {
      tempErrors.website = 'Invalid website URL format';
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
      const result = await updateCompanyAPI(1, form);
      if (result) {
        toast.success('Company details updated successfully.');
      } else {
        toast.error('Could not save company details.');
      }
    } catch (err) {
      toast.error('Error occurred while updating company.');
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
          Loading Company Profile...
        </p>
      </div>
    );
  }

  return (
    <div className="com-page">
      <ToastContainer toasts={toast.toasts} />

      <div className="page-header">
        <div className="page-header__left">
          <h1>Company Profile</h1>
          <p className="page-header__sub">
            Edit and update your corporate credentials
          </p>
        </div>
      </div>

      <div className="com-card">
        <div className="com-card-header">
          <span className="com-card-title">Corporate Information</span>
        </div>
        <div className="com-card-body">
          <form onSubmit={handleSave}>
            <div className="com-form-layout">
              <div className="com-form-img">
                <img src="/mps.png" alt="LOGO" />
              </div>
              <div className="com-form-group">
                <label className="com-form-label com-form-label--required">
                  Legal Name
                </label>
                <input
                  type="text"
                  name="legal_name"
                  className={`com-form-input ${errors.legal_name ? 'com-form-input--error' : ''}`}
                  value={form.legal_name}
                  onChange={handleChange}
                  placeholder="e.g. Acme Corporation Pvt. Ltd."
                />
                {errors.legal_name && (
                  <span className="com-error-text">{errors.legal_name}</span>
                )}
              </div>

              <div className="com-form-group">
                <label className="com-form-label com-form-label--required">
                  Display Name
                </label>
                <input
                  type="text"
                  name="display_name"
                  className={`com-form-input ${errors.display_name ? 'com-form-input--error' : ''}`}
                  value={form.display_name}
                  onChange={handleChange}
                  placeholder="e.g. Acme Corporation Pvt. Ltd."
                />
                {errors.display_name && (
                  <span className="com-error-text">{errors.display_name}</span>
                )}
              </div>

              <div className="com-form-group">
                <label className="com-form-label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  className={`com-form-input ${errors.email ? 'com-form-input--error' : ''}`}
                  value={form.email}
                  onChange={handleChange}
                  placeholder="corporate@company.com"
                />
                {errors.email && (
                  <span className="com-error-text">{errors.email}</span>
                )}
              </div>

              {/* <div className="com-form-grid-2"> */}
              <div className="com-form-group">
                <label className="com-form-label">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  className={`com-form-input ${errors.phone ? 'com-form-input--error' : ''}`}
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="10 digit number"
                  maxLength={10}
                />
                {errors.phone && (
                  <span className="com-error-text">{errors.phone}</span>
                )}
              </div>

              <div className="com-form-group">
                <label className="com-form-label com-form-label--required">
                  Business Type
                </label>

                <select
                  name="business_type"
                  className={`com-form-input ${
                    errors.business_type ? 'com-form-input--error' : ''
                  }`}
                  value={form.business_type}
                  onChange={handleChange}
                >
                  <option value="">Select Business Type</option>
                  <option value="Retail">Retail</option>
                  <option value="Wholesale">Wholesale</option>
                  <option value="Service">Service</option>
                  <option value="Manufacturing">Manufacturing</option>
                </select>

                {errors.business_type && (
                  <span className="com-error-text">{errors.business_type}</span>
                )}
              </div>
              {/* </div> */}

              <div className="com-form-group">
                <label className="com-form-label">Address Line 1</label>
                <input
                  type="text"
                  name="address_line1"
                  className="com-form-input"
                  value={form.address_line1}
                  onChange={handleChange}
                  placeholder="Street address, P.O. box, company name"
                />
              </div>

              <div className="com-form-group">
                <label className="com-form-label">Address Line 2</label>
                <input
                  type="text"
                  name="address_line2"
                  className="com-form-input"
                  value={form.address_line2}
                  onChange={handleChange}
                  placeholder="Apartment, suite, unit, building, floor, etc."
                />
              </div>

              {/* <div className="com-form-grid-2"> */}
              <div className="com-form-group">
                <label className="com-form-label">City</label>
                <input
                  type="text"
                  name="city"
                  className="com-form-input"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="e.g. Hyderabad"
                />
              </div>

              <div className="com-form-group">
                <label className="com-form-label">State Code</label>
                <input
                  type="text"
                  name="state_code"
                  className="com-form-input"
                  value={form.state_code}
                  onChange={handleChange}
                  placeholder="e.g. TG, MH, DL"
                  maxLength={5}
                />
              </div>

              <div className="com-form-group">
                <label className="com-form-label">Country Code</label>
                <input
                  type="text"
                  name="country_code"
                  className="com-form-input"
                  value={form.country_code}
                  onChange={handleChange}
                  placeholder="e.g. IN, RA, DL"
                  maxLength={5}
                />
              </div>

              <div className="com-form-group">
                <label className="com-form-label">Pincode</label>
                <input
                  type="text"
                  name="pincode"
                  className={`com-form-input ${errors.pincode ? 'com-form-input--error' : ''}`}
                  value={form.pincode}
                  onChange={handleChange}
                  placeholder="6 digit pincode"
                  maxLength={6}
                />
                {errors.pincode && (
                  <span className="com-error-text">{errors.pincode}</span>
                )}
              </div>

              <div className="com-form-group">
                <label className="com-form-label">Website</label>
                <input
                  type="text"
                  name="website"
                  className={`com-form-input ${errors.website ? 'com-form-input--error' : ''}`}
                  value={form.website}
                  onChange={handleChange}
                  placeholder="https://example.com"
                />
                {errors.website && (
                  <span className="com-error-text">{errors.website}</span>
                )}
              </div>

              <div className="com-form-group">
                <label className="com-form-label">Brand Color</label>
                <select
                  name="brand_color"
                  className={`com-form-input ${
                    errors.brand_color ? 'com-form-input--error' : ''
                  }`}
                  value={form.brand_color}
                  onChange={handleChange}
                >
                  <option value="">Select Brand Color</option>
                  <option value="#0000FF">Blue</option>
                  <option value="#800080">Purple</option>
                  <option value="#8F00FF">Violet</option>
                  <option value="#AEC6CF">Pastel Blue</option>
                </select>
              </div>

              <div className="com-form-group">
                <label className="com-form-label">Logo URL</label>

                <input
                  type="url"
                  name="logo_url"
                  className="com-form-input"
                  value={form.logo_url}
                  onChange={handleChange}
                  placeholder="https://drive.google.com/..."
                />
              </div>
              {/* </div> */}
            </div>
            <div className="com-actions">
              <Button
                type="submit"
                variant="primary"
                loading={saving}
                size="lg"
              >
                Update Profile
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
