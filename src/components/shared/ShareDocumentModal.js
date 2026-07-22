/* ===== SHARE DOCUMENT MODAL — WhatsApp / SMS / Email ===== */
import React, { useState } from 'react';
import { Modal, Button } from '../ui';
import useNotificationStore from '../../store/notificationStore';
import useAppStore from '../../store/appStore';
import { useToast } from '../../hooks/useToast';

function applyTemplate(template, vars) {
  let result = template || '';
  Object.entries(vars).forEach(([key, val]) => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), val ?? '');
  });
  return result;
}

export default function ShareDocumentModal({ open, onClose, bill, party, channel: initialChannel = 'whatsapp' }) {
  const templates = useNotificationStore((s) => s.templates);
  const sendNotification = useNotificationStore((s) => s.sendNotification);
  const companies = useAppStore((s) => s.companies);
  const toast = useToast();

  const [channel, setChannel] = useState(initialChannel);
  const [sending, setSending] = useState(false);

  const vars = {
    partyName: party?.name || bill?.Party?.name || bill?.name || 'Customer',
    invoiceNo: bill?.invoiceNumber || bill?.invoiceNo || bill?.documentNumber || '',
    amount: bill?.totalAmount || 0,
    companyName: companies?.legal_name || companies?.companyName || 'Our Business',
    days: bill?.overdueDays || '',
  };

  const templateKey = bill?.overdueDays ? 'overdue' : 'invoice';
  const message = applyTemplate(templates[channel]?.[templateKey] || '', vars);

  const phone = party?.phone || bill?.phone || bill?.Party?.phone || '';
  const email = party?.email || bill?.email || bill?.Party?.email || '';

  async function handleSend() {
    setSending(true);
    try {
      await sendNotification({
        channel,
        to: channel === 'email' ? email : phone,
        message,
        billId: bill?.id || bill?._id,
        templateKey,
      });
      toast.success(`Sent via ${channel}`);
      onClose();
    } catch {
      toast.error('Send failed');
    } finally {
      setSending(false);
    }
  }

  function handleNativeShare() {
    if (channel === 'whatsapp' && phone) {
      const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      onClose();
      return;
    }
    if (channel === 'sms' && phone) {
      window.open(`sms:${phone}?body=${encodeURIComponent(message)}`, '_self');
      onClose();
      return;
    }
    if (channel === 'email' && email) {
      window.open(
        `mailto:${email}?subject=${encodeURIComponent(`Invoice ${vars.invoiceNo}`)}&body=${encodeURIComponent(message)}`,
        '_self'
      );
      onClose();
      return;
    }
    handleSend();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Share Document"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={sending} onClick={handleNativeShare}>
            Send
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['whatsapp', 'sms', 'email'].map((ch) => (
            <button
              key={ch}
              className={`bill-type-btn ${channel === ch ? 'active' : ''}`}
              onClick={() => setChannel(ch)}
              style={{ flex: 1, textTransform: 'capitalize' }}
            >
              {ch}
            </button>
          ))}
        </div>
        <div className="form-group">
          <label className="form-label">Recipient</label>
          <input
            className="form-input"
            readOnly
            value={channel === 'email' ? email || 'No email on file' : phone || 'No phone on file'}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Message Preview</label>
          <textarea className="form-textarea" rows={5} readOnly value={message} />
        </div>
      </div>
    </Modal>
  );
}
