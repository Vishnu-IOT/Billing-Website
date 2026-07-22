import { axios, BASE_URL, getAuthHeaders } from './client';

export async function fetchNotificationTemplatesAPI() {
  try {
    const response = await axios.get(
      `${BASE_URL}/notifications/get-Templates`,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    console.error(err);
    return getDefaultTemplates();
  }
}

export async function updateNotificationTemplatesAPI(templates) {
  try {
    const response = await axios.post(
      `${BASE_URL}/notifications/update-Templates`,
      templates,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    console.error(err);
    return { success: true, templates };
  }
}

export async function sendNotificationAPI(payload) {
  try {
    const response = await axios.post(
      `${BASE_URL}/notifications/send-Notification`,
      payload,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

export async function sendOverdueReminderAPI(partyId) {
  try {
    const response = await axios.post(
      `${BASE_URL}/notifications/send-OverdueReminder/${partyId}`,
      {},
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    alert(err);
  }
}

function getDefaultTemplates() {
  return {
    whatsapp: {
      invoice: 'Hi {{partyName}}, your invoice {{invoiceNo}} for {{amount}} is ready. Thank you!',
      overdue: 'Dear {{partyName}}, payment of {{amount}} for invoice {{invoiceNo}} is overdue by {{days}} days.',
    },
    sms: {
      invoice: 'Invoice {{invoiceNo}} amount {{amount}} from {{companyName}}.',
      overdue: 'Overdue: {{invoiceNo}} - {{amount}} due {{days}} days.',
    },
    email: {
      invoice: 'Dear {{partyName}},\n\nPlease find invoice {{invoiceNo}} for {{amount}}.\n\nRegards,\n{{companyName}}',
      overdue: 'Dear {{partyName}},\n\nInvoice {{invoiceNo}} of {{amount}} is overdue by {{days}} days.\n\nRegards,\n{{companyName}}',
    },
  };
}

export { getDefaultTemplates };
