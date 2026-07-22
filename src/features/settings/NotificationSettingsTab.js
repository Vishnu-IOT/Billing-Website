/* ===== NOTIFICATION SETTINGS TAB ===== */
import React, { useEffect, useState } from 'react';
import useNotificationStore from '../../store/notificationStore';
import { Button } from '../../components/ui';
import { useToast } from '../../hooks/useToast';

const CHANNELS = [
  { key: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { key: 'sms', label: 'SMS', icon: '📱' },
  { key: 'email', label: 'Email', icon: '✉️' },
];

const TEMPLATE_TYPES = [
  { key: 'invoice', label: 'Invoice Share' },
  { key: 'overdue', label: 'Overdue Payment Reminder' },
];

export default function NotificationSettingsTab() {
  const { templates, loadTemplates, updateTemplates } = useNotificationStore();
  const toast = useToast();
  const [form, setForm] = useState(templates);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    setForm(templates);
  }, [templates]);

  function handleChange(channel, templateKey, value) {
    setForm((f) => ({
      ...f,
      [channel]: { ...f[channel], [templateKey]: value },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateTemplates(form);
      toast.success('Notification templates saved');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="card__header">
        <span className="card__title">Notifications & Templates</span>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
          WhatsApp, SMS & Email message templates
        </span>
      </div>
      <div className="card__body">
        <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: 16 }}>
          Variables: {'{{partyName}}'}, {'{{invoiceNo}}'}, {'{{amount}}'}, {'{{companyName}}'}, {'{{days}}'}
        </p>
        {CHANNELS.map(({ key, label, icon }) => (
          <div key={key} style={{ marginBottom: 24 }}>
            <h4 style={{ marginBottom: 12 }}>
              {icon} {label}
            </h4>
            {TEMPLATE_TYPES.map(({ key: tKey, label: tLabel }) => (
              <div className="form-group" key={tKey} style={{ marginBottom: 12 }}>
                <label className="form-label">{tLabel}</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={form[key]?.[tKey] || ''}
                  onChange={(e) => handleChange(key, tKey, e.target.value)}
                />
              </div>
            ))}
          </div>
        ))}
        <Button variant="primary" loading={saving} onClick={handleSave}>
          Save Templates
        </Button>
      </div>
    </div>
  );
}
