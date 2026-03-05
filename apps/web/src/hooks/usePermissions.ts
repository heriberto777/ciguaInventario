import { useAuthStore } from '@/store/auth';

export function usePermissions() {
    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    const permissions = user?.permissions || [];
    const roles = user?.roles || [];

    const hasPermission = (permission: string): boolean => {
        if (!isAuthenticated) return false;
        if (roles.includes('SuperAdmin')) return true;
        return permissions.includes(permission);
    };

    const hasRole = (role: string): boolean => {
        if (!isAuthenticated) return false;
        return roles.includes(role);
    };

    const isSuperAdmin = roles.includes('SuperAdmin');

    return {
        permissions,
        roles,
        isAuthenticated,
        hasPermission,
        hasRole,
        isSuperAdmin,
        user,
    };
}
