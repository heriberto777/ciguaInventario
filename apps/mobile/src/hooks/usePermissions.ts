import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function usePermissions() {
    const [permissions, setPermissions] = useState<string[]>([]);
    const [roles, setRoles] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadAuthScope() {
            try {
                const storedPermissions = await AsyncStorage.getItem('user_permissions');
                const storedRoles = await AsyncStorage.getItem('user_roles');

                if (storedPermissions) {
                    setPermissions(JSON.parse(storedPermissions));
                }
                if (storedRoles) {
                    setRoles(JSON.parse(storedRoles));
                }
            } catch (err) {
                console.error('[usePermissions] Error loading stored auth scope:', err);
            } finally {
                setLoading(false);
            }
        }

        loadAuthScope();
    }, []);

    const hasPermission = (permission: string): boolean => {
        if (roles.includes('SuperAdmin')) return true;
        return permissions.includes(permission);
    };

    const hasRole = (role: string): boolean => {
        return roles.includes(role);
    };

    const isSuperAdmin = roles.includes('SuperAdmin');

    return {
        permissions,
        roles,
        loading,
        hasPermission,
        hasRole,
        isSuperAdmin,
    };
}
