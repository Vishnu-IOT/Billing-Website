export async function fetchSettingsAPI() {
  try {
    return {
      companyName: 'Your Business Name',
      companyAddress: 'Your Address',
      companyGstin: '',
      companyPhone: '',
      billTheme: 'classic',
    };
  } catch (err) {
    alert(err);
  }
}

export async function updateSettingsAPI(settings) {
  try {
    return { success: true, settings };
  } catch (err) {
    alert(err);
  }
}
