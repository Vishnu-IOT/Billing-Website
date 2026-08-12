import { useEffect, useState } from 'react';
import useSettingsStore from '../store/settingsStore-DB';
import useAuthStore from '../store/authStore';

/**
 * Hook to initialize settings from database when app loads
 * Should be called once in AppShell or root component
 */
export function useSettingsInit() {
    const [isInitializing, setIsInitializing] = useState(true);
    const [initError, setInitError] = useState(null);

    const initializeSettings = useSettingsStore((state) => state.initializeSettings);
    const getSyncStatus = useSettingsStore((state) => state.getSyncStatus);
    const user = useAuthStore((state) => state.user);

    useEffect(() => {
        const init = async () => {
            try {
                setIsInitializing(true);

                // Get company ID from user (or default to 1)
                const companyId = user?.companyId || 1;

                // Initialize settings from DB
                const success = await initializeSettings(companyId);

                if (!success) {
                    console.warn('Settings loaded from cache (DB unavailable)');
                } else {
                    console.log('Settings synced from database');
                }

                setIsInitializing(false);
            } catch (error) {
                console.error('Failed to initialize settings:', error);
                setInitError(error.message);
                setIsInitializing(false);
            }
        };

        init();
    }, [user?.companyId]); // Re-init if company changes

    return {
        isInitializing,
        initError,
        syncStatus: getSyncStatus(),
    };
}

/**
 * Hook to get current sync status
 */
export function useSettingsSyncStatus() {
    const [syncStatus, setSyncStatus] = useState(null);
    const store = useSettingsStore();

    useEffect(() => {
        const status = store.getSyncStatus();
        setSyncStatus(status);

        // Optional: Re-check sync status periodically
        const interval = setInterval(() => {
            setSyncStatus(store.getSyncStatus());
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return syncStatus;
}

/**
 * Hook to subscribe to settings changes across devices
 * For multi-tab/multi-device sync (using polling)
 */
export function useSettingsAutoSync(interval = 60000) {
    const syncFromDB = useSettingsStore((state) => state.syncFromDB);

    useEffect(() => {
        // Sync every interval (default: 1 minute)
        const syncTimer = setInterval(async () => {
            console.log('Auto-syncing settings from DB...');
            await syncFromDB();
        }, interval);

        return () => clearInterval(syncTimer);
    }, [syncFromDB, interval]);
}