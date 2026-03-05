import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { useLogout, useAppConfig } from '@/hooks/useApi';

interface NavItem {
    label: string;
    path: string;
    icon: ReactNode;
    exact?: boolean;
    requiredPermission?: string;
}

interface NavSection {
    label: string;
    items: NavItem[];
}

// ─── Ícono SVG minimalista ──────────────────────────────────────────
const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
    </svg>
);

const NAV_SECTIONS: NavSection[] = [
    {
        label: 'Inventario',
        items: [
            {
                label: 'Dashboard',
                path: '/inventory',
                icon: <Icon d="M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 3a4 4 0 1 0 8 0 4 4 0 0 0-8 0" />,
                requiredPermission: 'dashboards:view',
            },
            {
                label: 'Conteos',
                path: '/inventory/counts',
                icon: <Icon d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />,
                requiredPermission: 'inv_counts:view',
            },
            {
                label: 'Varianzas',
                path: '/inventory/variances',
                icon: <Icon d="M18 20V10M12 20V4M6 20v-6" />,
                requiredPermission: 'inventory:view_variances',
            },
            {
                label: 'Chat con IA',
                path: '/inventory/chat-ai',
                icon: <Icon d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm1-13h-2v2h2zm0 4h-2v6h2z" />,
                requiredPermission: 'ai:chat',
            },
            {
                label: 'Reportes',
                path: '/reports',
                icon: <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" />,
                requiredPermission: 'reports:view',
            },
            {
                label: 'Auditoría IA',
                path: '/inventory/audit',
                icon: <Icon d="M9 12l2 2 4-4M3 21h18M3 10V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5" />,
                requiredPermission: 'ai:audit',
            },
        ],
    },
    {
        label: 'Maestros',
        items: [
            {
                label: 'Almacenes',
                path: '/inventory/warehouses',
                icon: <Icon d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" />,
                requiredPermission: 'warehouses:view',
            },
            {
                label: 'Clasificaciones',
                path: '/admin/classifications',
                icon: <Icon d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM12 12H8M16 12h-1" />,
                requiredPermission: 'classifications:view',
            },
            {
                label: 'Empresas',
                path: '/admin/companies',
                icon: <Icon d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
                requiredPermission: 'companies:view',
            },
        ],
    },
    {
        label: 'Configuración ERP',
        items: [
            {
                label: 'Conexión',
                path: '/admin/erp-connections',
                icon: <Icon d="M5 12h14M12 5v14M5.5 5.5l13 13M18.5 5.5l-13 13" />,
                requiredPermission: 'erp_conn:view',
            },
            {
                label: 'Mapping',
                path: '/admin/mapping',
                icon: <Icon d="M8 3H2v6h6V3zM16 15h6v6h-6v-6zM15 3l6 6-6 6M9 15l-6 6 6 6" />,
                requiredPermission: 'mappings:view',
            },
            {
                label: 'Explorer',
                path: '/admin/query-explorer',
                icon: <Icon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
                requiredPermission: 'queries:view',
            },
        ],
    },
    {
        label: 'Seguridad',
        items: [
            {
                label: 'Usuarios',
                path: '/admin/users',
                icon: <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
                requiredPermission: 'users:view',
            },
            {
                label: 'Roles',
                path: '/admin/roles',
                icon: <Icon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
                requiredPermission: 'roles:view',
            },
            {
                label: 'Permisos',
                path: '/admin/permissions',
                icon: <Icon d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />,
                requiredPermission: 'permissions:view',
            },
        ],
    },
    {
        label: 'Sistema',
        items: [
            {
                label: 'Auditoría',
                path: '/admin/audit-logs',
                icon: <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
                requiredPermission: 'audit:view',
            },
            {
                label: 'Sesiones',
                path: '/admin/sessions',
                icon: <Icon d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10zm0-6v-4m0-4h.01" />,
                requiredPermission: 'sessions:view',
            },
            {
                label: 'Personalización',
                path: '/admin/branding',
                icon: <Icon d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />,
                requiredPermission: 'branding:view',
            },
        ],
    },
];

interface AppShellProps {
    children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuthStore();
    const { theme, toggleTheme } = useThemeStore();
    const { mutate: logoutApi } = useLogout();
    const { data: config } = useAppConfig();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

    const isDark = theme === 'dark';

    useEffect(() => {
        if (config?.appTitle) {
            document.title = config.appTitle;
        }
    }, [config]);

    const handleLogout = () => {
        logoutApi();
        useAuthStore.getState().logout();
        navigate('/login');
    };

    const isActive = (path: string) => {
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    // Initiales del usuario para el avatar
    const initials = user?.name
        ? user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
        : user?.email?.[0]?.toUpperCase() ?? 'U';

    return (
        <div className="app-shell">
            {/* Overlay para móvil */}
            {isMobileMenuOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* ─── Sidebar ─── */}
            <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
                {/* Logo */}
                <div className="sidebar-logo">
                    {config?.logoUrl ? (
                        <img
                            src={config.logoUrl}
                            alt="Logo"
                            style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'contain', flexShrink: 0 }}
                        />
                    ) : (
                        <div style={{
                            width: 36, height: 36,
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            borderRadius: 10,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <Icon d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2ZM16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" size={20} />
                        </div>
                    )}
                    <div>
                        <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2 }}>
                            {config?.appTitle || 'Cigua Inv'}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.7rem' }}>v2.0</div>
                    </div>
                </div>

                {/* Nav sections */}
                <nav className="flex-1 pb-3">
                    {NAV_SECTIONS.map((section) => {
                        const permissions = user?.permissions || [];
                        const roles = user?.roles || [];
                        const isSuperAdmin = roles.includes('SuperAdmin');

                        const visibleItems = section.items.filter(item =>
                            isSuperAdmin || !item.requiredPermission || permissions.includes(item.requiredPermission)
                        );

                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={section.label}>
                                <div className="sidebar-section-label">{section.label}</div>
                                {visibleItems.map((item) => (
                                    <button
                                        key={item.path}
                                        onClick={() => {
                                            navigate(item.path);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
                                        title={item.label}
                                    >
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        );
                    })}
                </nav>

                {/* Theme toggle en sidebar bottom */}
                <div className="px-4 py-3 border-t border-white/5 flex items-center gap-2.5">
                    <div className="text-muted">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {isDark
                                ? <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                                : <><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>
                            }
                        </svg>
                    </div>
                    <button
                        onClick={toggleTheme}
                        className={`theme-toggle ${isDark ? 'on' : ''}`}
                        aria-label="Cambiar tema"
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                        {isDark ? 'Oscuro' : 'Claro'}
                    </span>
                </div>
            </aside>

            {/* ─── Top Bar ─── */}
            <header className="topbar">
                {/* Hamburger Menu (Sólo Mobile) */}
                <button
                    className="lg:hidden p-2 -ml-2 text-primary hover:bg-hover rounded-lg transition-colors"
                    onClick={toggleMobileMenu}
                    aria-label="Abrir menú"
                >
                    <Icon d="M4 6h16M4 12h16M4 18h16" size={24} />
                </button>

                {/* Breadcrumb / Page title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {location.pathname.split('/').filter(Boolean).join(' / ')}
                    </span>
                </div>

                {/* Right side: user menu */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '6px 10px', borderRadius: 8,
                            transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                        {/* Avatar */}
                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {initials}
                        </div>
                        <div className="text-left">
                            <div className="text-sm font-semibold text-primary">
                                {user?.name || 'Usuario'}
                            </div>
                            <div className="text-xs text-muted">
                                {user?.email}
                            </div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" className="text-muted">
                            <path d="M6 9l6 6 6-6" />
                        </svg>
                    </button>

                    {/* Dropdown */}
                    {showUserMenu && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setShowUserMenu(false)}
                            />
                            <div className="absolute right-0 top-full mt-2 bg-card border border-border-default rounded-lg shadow-lg min-w-[180px] z-50 overflow-hidden">
                                <div className="p-4 border-b border-border-default">
                                    <div className="text-sm font-semibold text-primary">
                                        {user?.name}
                                    </div>
                                    <div className="text-xs text-muted">
                                        {user?.email}
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
                                    className="flex items-center gap-2.5 w-full p-4 bg-transparent border-none cursor-pointer text-sm text-primary text-left hover:bg-hover"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                                    </svg>
                                    Configuración
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2.5 w-full p-4 bg-transparent border-none cursor-pointer text-sm text-danger text-left hover:bg-danger/10"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                                    </svg>
                                    Cerrar sesión
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </header>

            {/* ─── Main Content ─── */}
            <main className="main-content fade-in">
                {children}
            </main>
        </div>
    );
}
