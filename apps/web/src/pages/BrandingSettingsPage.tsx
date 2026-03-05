import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/templates/AdminLayout';
import { useAppConfig, useUpdateAppConfig } from '@/hooks/useApi';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { usePermissions } from '@/hooks/usePermissions';

const BrandingSettingsPage: React.FC = () => {
    const { data: config, isLoading } = useAppConfig();
    const updateMutation = useUpdateAppConfig();
    const { hasPermission } = usePermissions();
    const canManage = hasPermission('branding:manage');

    const [formData, setFormData] = useState({
        appTitle: '',
        logoUrl: '',
        primaryColor: '#6366f1',
        secondaryColor: '#8b5cf6',
        loginMessage: '',
        footerText: ''
    });

    useEffect(() => {
        if (config) {
            setFormData({
                appTitle: config.appTitle || '',
                logoUrl: config.logoUrl || '',
                primaryColor: config.primaryColor || '#6366f1',
                secondaryColor: config.secondaryColor || '#8b5cf6',
                loginMessage: config.loginMessage || '',
                footerText: config.footerText || ''
            });
        }
    }, [config]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setFormData(prev => ({ ...prev, logoUrl: base64String }));
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate(formData);
    };

    if (isLoading) return <AdminLayout title="Cargando..."><div>Cargando configuración...</div></AdminLayout>;

    return (
        <AdminLayout title="Personalización de Marca">
            <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700 pb-16">
                {/* Visual Identity Hero */}
                <div className="relative overflow-hidden p-8 md:p-12 rounded-2xl bg-card border border-border-default shadow-lg">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent-primary/10 blur-3xl rounded-full -mr-20 -mt-20" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-secondary/10 blur-3xl rounded-full -ml-10 -mb-10" />

                    <div className="relative flex flex-col md:flex-row items-center gap-10">
                        <div className="p-6 bg-app rounded-2xl shadow-inner border border-border-default ring-8 ring-card">
                            {formData.logoUrl ? (
                                <img src={formData.logoUrl} alt="Logo Preview" className="h-32 w-32 object-contain" />
                            ) : (
                                <div className="h-32 w-32 flex items-center justify-center bg-hover rounded-2xl text-muted text-6xl">
                                    🏢
                                </div>
                            )}
                        </div>
                        <div className="flex-1 text-center md:text-left space-y-2">
                            <h2 className="text-3xl font-black text-primary tracking-tight">
                                {formData.appTitle || 'Título de App'}
                            </h2>
                            <p className="text-secondary text-lg max-w-lg">
                                Define la personalidad visual de tu plataforma. Estos cambios se aplicarán globalmente en Web y Móvil.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form Column */}
                    <div className="lg:col-span-2 space-y-8">
                        {canManage ? (
                            <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border-default shadow-xl overflow-hidden p-8 space-y-8">
                                <div className="space-y-6">
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted">Configuración General</h3>

                                    <Input
                                        label="Título de la Aplicación"
                                        name="appTitle"
                                        value={formData.appTitle}
                                        onChange={handleChange}
                                        placeholder="Ej: Cigua Inventory"
                                    />

                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-secondary ml-1 uppercase tracking-wider">Logotipo</label>
                                        <div className="flex flex-col gap-4">
                                            <div className="flex gap-4">
                                                <Input
                                                    name="logoUrl"
                                                    value={formData.logoUrl}
                                                    onChange={handleChange}
                                                    placeholder="URL de imagen o carga un archivo..."
                                                    className="flex-1"
                                                />
                                                <label className="cursor-pointer">
                                                    <div className="h-full px-6 flex items-center justify-center border border-border-default rounded-xl font-bold text-sm bg-hover hover:bg-border-default transition-colors">
                                                        Subir
                                                    </div>
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6 pt-6 border-t border-border-default">
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted">Paleta de Colores</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-secondary ml-1 uppercase tracking-wider">Color Primario</label>
                                            <div className="flex gap-3">
                                                <div
                                                    className="w-12 h-12 rounded-xl shadow-lg border-2 border-white/20 relative cursor-pointer overflow-hidden"
                                                    style={{ backgroundColor: formData.primaryColor }}
                                                >
                                                    <input
                                                        type="color"
                                                        name="primaryColor"
                                                        value={formData.primaryColor}
                                                        onChange={handleChange}
                                                        className="absolute inset-x-0 inset-y-0 opacity-0 cursor-pointer scale-150"
                                                    />
                                                </div>
                                                <Input
                                                    name="primaryColor"
                                                    value={formData.primaryColor}
                                                    onChange={handleChange}
                                                    className="flex-1 font-mono uppercase"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-secondary ml-1 uppercase tracking-wider">Color Secundario</label>
                                            <div className="flex gap-3">
                                                <div
                                                    className="w-12 h-12 rounded-xl shadow-lg border-2 border-white/20 relative cursor-pointer overflow-hidden"
                                                    style={{ backgroundColor: formData.secondaryColor }}
                                                >
                                                    <input
                                                        type="color"
                                                        name="secondaryColor"
                                                        value={formData.secondaryColor}
                                                        onChange={handleChange}
                                                        className="absolute inset-x-0 inset-y-0 opacity-0 cursor-pointer scale-150"
                                                    />
                                                </div>
                                                <Input
                                                    name="secondaryColor"
                                                    value={formData.secondaryColor}
                                                    onChange={handleChange}
                                                    className="flex-1 font-mono uppercase"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6 pt-6 border-t border-border-default">
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted">Contenido Adicional</h3>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-secondary ml-1 uppercase tracking-wider">Mensaje de Login</label>
                                        <textarea
                                            name="loginMessage"
                                            value={formData.loginMessage}
                                            onChange={handleChange}
                                            rows={3}
                                            className="w-full px-4 py-3 rounded-2xl bg-app text-primary border border-border-default focus:border-accent-primary focus:ring-4 focus:ring-accent-primary/10 transition-all outline-none resize-none placeholder:text-muted/50"
                                            placeholder="Mensaje personalizado en la pantalla de acceso..."
                                        />
                                    </div>
                                    <Input
                                        label="Texto del Pie de Página"
                                        name="footerText"
                                        value={formData.footerText}
                                        onChange={handleChange}
                                        placeholder="© 2026 Cigua Inventory"
                                    />
                                </div>

                                <div className="pt-8 flex items-center justify-between border-t border-border-default">
                                    <Button variant="secondary" type="button" onClick={() => window.location.reload()}>
                                        Cancelar Cambios
                                    </Button>
                                    <Button
                                        type="submit"
                                        size="lg"
                                        disabled={updateMutation.isPending}
                                        className="px-12 rounded-2xl shadow-xl shadow-accent-primary/20"
                                    >
                                        {updateMutation.isPending ? 'Guardando...' : 'Guardar Identidad'}
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <div className="bg-card rounded-2xl border border-border-default p-12 text-center shadow-xl">
                                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <span className="text-4xl">🔒</span>
                                </div>
                                <h3 className="text-xl font-bold text-primary mb-2">Acceso Restringido</h3>
                                <p className="text-secondary max-w-sm mx-auto">
                                    No tienes permisos suficientes para modificar la identidad visual del sistema. Contacta a un administrador.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Preview Column */}
                    <div className="space-y-8">
                        <div className="sticky top-8 space-y-8">
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted text-center">Previsualización Real</h3>

                            {/* Mobile/Sidebar Mockup */}
                            <div className="bg-[#020617] rounded-3xl p-6 shadow-2xl border border-white/5 space-y-8">
                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/10">
                                    {formData.logoUrl ? (
                                        <img src={formData.logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded-lg" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">L</div>
                                    )}
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-white font-bold text-xs truncate leading-none">{formData.appTitle || 'Título'}</p>
                                        <p className="text-slate-500 text-[8px] mt-1 uppercase tracking-widest font-black">Sistema Activo</p>
                                    </div>
                                </div>

                                <div className="space-y-3 opacity-20">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex gap-3 items-center">
                                            <div className="w-4 h-4 rounded-md bg-slate-700" />
                                            <div className="h-2 flex-1 bg-slate-800 rounded-full" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Accent Colors Preview */}
                            <div className="bg-card rounded-3xl p-8 border border-border-default shadow-xl space-y-6 text-center">
                                <div className="flex justify-between items-center px-2">
                                    <span className="text-xs font-black text-secondary uppercase tracking-tight">Contrastes</span>
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: formData.primaryColor }} />
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: formData.secondaryColor }} />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="p-4 rounded-2xl text-white text-xs font-bold shadow-lg" style={{ backgroundColor: formData.primaryColor }}>
                                        Acción Principal
                                    </div>
                                    <div className="p-4 rounded-2xl text-white text-xs font-bold shadow-lg opacity-80" style={{ backgroundColor: formData.secondaryColor }}>
                                        Acción Secundaria
                                    </div>
                                </div>
                            </div>

                            {updateMutation.isSuccess && (
                                <div className="p-4 bg-success/10 text-success rounded-2xl border border-success/20 text-center text-sm font-bold animate-bounce mt-4">
                                    ✓ Identidad Actualizada
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default BrandingSettingsPage;
