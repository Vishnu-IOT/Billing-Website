import { axios, BASE_URL, getAuthHeaders } from './client';

/**
 * Fetch all application settings from backend
 */
export async function fetchAppSettingsAPI(companyId = 1) {
    try {
        const response = await axios.get(`${BASE_URL}/app-settings`, {
            params: { companyId },
            ...getAuthHeaders(),
        });
        return response.data?.data || null;
    } catch (err) {
        console.error('Error fetching app settings:', err);
        return null;
    }
}

/**
 * Update all application settings
 */
export async function updateAppSettingsAPI(settings, companyId = 1) {
    try {
        const response = await axios.put(
            `${BASE_URL}/app-settings`,
            { settings, companyId },
            getAuthHeaders()
        );
        return response.data?.data || null;
    } catch (err) {
        console.error('Error updating app settings:', err);
        throw err;
    }
}

/**
 * Update a single settings field
 * @param {string} field - The field name (e.g., 'invoicePrefix')
 * @param {any} value - The new value
 */
export async function updateSettingFieldAPI(field, value, companyId = 1) {
    try {
        const response = await axios.patch(
            `${BASE_URL}/app-settings/${field}`,
            { value, companyId },
            getAuthHeaders()
        );
        return response.data?.data || null;
    } catch (err) {
        console.error(`Error updating setting ${field}:`, err);
        throw err;
    }
}

/**
 * Reset settings to defaults
 */
export async function resetSettingsAPI(companyId = 1) {
    try {
        const response = await axios.post(
            `${BASE_URL}/app-settings/reset`,
            { companyId },
            getAuthHeaders()
        );
        return response.data?.data || null;
    } catch (err) {
        console.error('Error resetting settings:', err);
        throw err;
    }
}

/**
 * Get settings for multiple companies
 */
export async function getSettingsByCompaniesAPI(companyIds) {
    try {
        const idString = Array.isArray(companyIds) ? companyIds.join(',') : companyIds;
        const response = await axios.get(
            `${BASE_URL}/app-settings/companies/${idString}`,
            getAuthHeaders()
        );
        return response.data?.data || [];
    } catch (err) {
        console.error('Error fetching settings by companies:', err);
        return [];
    }
}