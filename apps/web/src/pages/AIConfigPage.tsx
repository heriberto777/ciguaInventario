import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AdminLayout } from '@/components/templates/AdminLayout';
import { getApiClient } from '@/services/api';
import { Button } from '@/components/atoms/Button';
import { Label } from '@/components/atoms/Label';
import { Input } from '@/components/atoms/Input';
import { NotificationModal } from '@/components/atoms/NotificationModal';

const apiClient = getApiClient();

export function AIConfigPage() {
    const [activeTab, setActiveTab] = useState<'config' | 'prompts'>('config');

    // --- CONFIG TAB STATE ---
    const [editingConfig, setEditingConfig] = useState<any>(null);

    // --- PROMPTS TAB STATE ---
    const [editingPrompt, setEditingPrompt] = useState<any>(null);

    const [notification, setNotification] = useState<{
        isOpen: boolean;
        type: 'success' | 'error' | 'warning' | 'info';
        title: string;
        message: string;
    }>({
        isOpen: false,
        type: 'info',
        title: '',
        message: '',
    });

    // QUERIES
    const { data: configs = [], isLoading, refetch: refetchConfigs } = useQuery({
        queryKey: ['ai-config'],
        queryFn: async () => {
            const resp = await apiClient.get('/reports/ai-config');
            return resp.data.data || [];
        }
    });

    const { data: prompts = [], refetch: refetchPrompts } = useQuery({
        queryKey: ['ai-prompts'],
        queryFn: async () => {
            const resp = await apiClient.get('/reports/ai-prompts');
            return resp.data.data;
        }
    });

    // MUTATIONS
    const configMutation = useMutation({
        mutationFn: (data: any) => apiClient.post('/reports/ai-config', data),
        onSuccess: () => {
            setNotification({ isOpen: true, type: 'success', title: '✅ Guardado', message: 'Configuración de IA actualizada.' });
            setEditingConfig(null);
            refetchConfigs();
        },
        onError: (error: any) => {
            setNotification({ isOpen: true, type: 'error', title: '❌ Error', message: error.response?.data?.error || 'Error al guardar configuración.' });
        }
    });

    const deleteConfigMutation = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/reports/ai-config/${id}`),
        onSuccess: () => {
            setNotification({ isOpen: true, type: 'success', title: '✅ Eliminado', message: 'Conexión eliminada correctamente.' });
            refetchConfigs();
        }
    });

    const savePromptMutation = useMutation({
        mutationFn: (data: any) => apiClient.post('/reports/ai-prompts', data),
        onSuccess: () => {
            setNotification({ isOpen: true, type: 'success', title: '✅ Guardado', message: 'Prompt guardado correctamente.' });
            setEditingPrompt(null);
            refetchPrompts();
        },
        onError: (error: any) => {
            setNotification({ isOpen: true, type: 'error', title: '❌ Error', message: error.message });
        }
    });

    const deletePromptMutation = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/reports/ai-prompts/${id}`),
        onSuccess: () => {
            setNotification({ isOpen: true, type: 'success', title: '✅ Eliminado', message: 'Prompt eliminado correctamente.' });
            refetchPrompts();
        }
    });

    // HANDLERS
    const handleConfigSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        configMutation.mutate(editingConfig);
    };

    const handlePromptSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        savePromptMutation.mutate(editingPrompt);
    };

    if (isLoading) return <AdminLayout title="Configuración IA"><div>Cargando...</div></AdminLayout>;

    return (
        <AdminLayout title="Configuración de Inteligencia Artificial">
            
            {/* TABS NAVIGATION */}
            <div className="flex border-b border-[var(--border-default)] mb-6">
                <button
                    onClick={() => setActiveTab('config')}
                    className={`px-6 py-3 font-bold text-sm uppercase tracking-wider transition-all ${
                        activeTab === 'config' 
                        ? 'border-b-2 border-blue-600 text-blue-600' 
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                >
                    ⚙️ Motor API
                </button>
                <button
                    onClick={() => setActiveTab('prompts')}
                    className={`px-6 py-3 font-bold text-sm uppercase tracking-wider transition-all ${
                        activeTab === 'prompts' 
                        ? 'border-b-2 border-purple-600 text-purple-600' 
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                >
                    🧠 Biblioteca de Prompts
                </button>
            </div>

            {/* TAB: CONFIGURACIÓN MOTOR */}
            {activeTab === 'config' && (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                    {!editingConfig ? (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-black text-gray-800">Conexiones a Motores IA</h2>
                                    <p className="text-sm text-gray-500">Configura diferentes proveedores (OpenAI, Claude, Local) y elige cuál usar.</p>
                                </div>
                                <Button 
                                    onClick={() => setEditingConfig({ name: 'Nueva Configuración', provider: 'OPENAI', modelName: 'gpt-4', apiKey: '', isActive: true })}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    + Añadir Conexión
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {configs.length === 0 && (
                                    <div className="col-span-full p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-500">
                                        No hay conexiones configuradas. Añade una para empezar.
                                    </div>
                                )}
                                {configs.map((c: any) => (
                                    <div key={c.id} className={`bg-white border ${c.isActive ? 'border-blue-500 shadow-md ring-1 ring-blue-500' : 'border-gray-200 shadow-sm'} rounded-xl p-6 hover:shadow-md transition-all relative`}>
                                        {c.isActive && (
                                            <span className="absolute top-4 right-4 px-2 py-1 bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-widest rounded">
                                                Activo Actual
                                            </span>
                                        )}
                                        <div className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">{c.provider}</div>
                                        <h3 className="font-bold text-gray-900 text-lg mb-1 truncate">{c.name}</h3>
                                        <p className="text-xs text-gray-500 mb-6 font-mono">{c.modelName}</p>
                                        
                                        <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                                            <button 
                                                onClick={() => deleteConfigMutation.mutate(c.id)}
                                                className="text-xs text-red-500 font-bold hover:text-red-700 uppercase tracking-wider"
                                            >
                                                Eliminar
                                            </button>
                                            <Button 
                                                variant="secondary" 
                                                size="sm" 
                                                onClick={() => setEditingConfig(c)}
                                            >
                                                Editar
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-2xl mx-auto bg-[var(--bg-card)] rounded-xl shadow-lg border border-[var(--border-default)] overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                            <div className="p-6 border-b border-[var(--border-default)] bg-[var(--bg-hover)] flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-[var(--text-primary)]">{editingConfig.id ? 'Editar Conexión' : 'Nueva Conexión'}</h3>
                                    <p className="text-sm text-[var(--text-secondary)]">Configura las credenciales para el motor de Inteligencia Artificial.</p>
                                </div>
                                <button onClick={() => setEditingConfig(null)} className="text-gray-400 hover:text-gray-800 font-bold text-xl">✕</button>
                            </div>

                            <form onSubmit={handleConfigSubmit} className="p-6 space-y-6">
                                <div className="grid grid-cols-1 gap-6">
                                    <div>
                                        <Label>Nombre Identificador</Label>
                                        <Input
                                            value={editingConfig.name || ''}
                                            onChange={(e) => setEditingConfig({ ...editingConfig, name: e.target.value })}
                                            placeholder="Ej: OpenAI Producción"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <Label>Proveedor</Label>
                                            <select
                                                className="w-full mt-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
                                                value={editingConfig.provider}
                                                onChange={(e) => setEditingConfig({ ...editingConfig, provider: e.target.value })}
                                            >
                                                <option value="OPENAI">OpenAI (GPT)</option>
                                                <option value="CLAUDE">Anthropic (Claude)</option>
                                                <option value="GEMINI">Google Gemini</option>
                                                <option value="LOCAL">Local (Ollama / Ollama-like)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <Label>Modelo Exacto (ID)</Label>
                                            <Input
                                                value={editingConfig.modelName || ''}
                                                onChange={(e) => setEditingConfig({ ...editingConfig, modelName: e.target.value })}
                                                placeholder="ej: gpt-4o, claude-3-5-sonnet-20240620"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label>API Key</Label>
                                        <Input
                                            type={editingConfig.id ? "password" : "text"}
                                            value={editingConfig.apiKey || ''}
                                            onChange={(e) => setEditingConfig({ ...editingConfig, apiKey: e.target.value })}
                                            placeholder="sk-..."
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">La llave se encripta y guarda de forma segura.</p>
                                    </div>

                                    {editingConfig.provider === 'LOCAL' && (
                                        <div>
                                            <Label>Base URL (Endpoint Personalizado)</Label>
                                            <Input
                                                value={editingConfig.baseUrl || ''}
                                                onChange={(e) => setEditingConfig({ ...editingConfig, baseUrl: e.target.value })}
                                                placeholder="http://localhost:11434/v1"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <Label>System Prompt (Global Fallback)</Label>
                                        <textarea
                                            className="w-full mt-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-3 font-mono bg-gray-50"
                                            rows={4}
                                            value={editingConfig.systemPrompt || ''}
                                            onChange={(e) => setEditingConfig({ ...editingConfig, systemPrompt: e.target.value })}
                                            placeholder="Instrucciones globales si un módulo no tiene un prompt especializado..."
                                        />
                                    </div>
                                    
                                    <div className="flex items-center gap-2 pt-2">
                                        <input 
                                            type="checkbox" 
                                            id="isActiveConfig" 
                                            checked={editingConfig.isActive}
                                            onChange={e => setEditingConfig({...editingConfig, isActive: e.target.checked})}
                                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                        />
                                        <label htmlFor="isActiveConfig" className="text-sm font-bold text-gray-700 cursor-pointer">
                                            Activar y usar esta conexión en toda la plataforma
                                        </label>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
                                    <Button type="button" variant="secondary" onClick={() => setEditingConfig(null)}>Cancelar</Button>
                                    <Button type="submit" disabled={configMutation.isPending}>
                                        {configMutation.isPending ? 'Guardando...' : 'Guardar Conexión'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}

            {/* TAB: BIBLIOTECA DE PROMPTS */}
            {activeTab === 'prompts' && (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                    {!editingPrompt ? (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-black text-gray-800">Prompts Especializados</h2>
                                    <p className="text-sm text-gray-500">Administra las instrucciones para cada módulo de la IA.</p>
                                </div>
                                <Button 
                                    onClick={() => setEditingPrompt({ name: '', topic: 'GENERAL_CHAT', content: '', isDefault: true })}
                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                    + Crear Nuevo Prompt
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {prompts.length === 0 && (
                                    <div className="col-span-full p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-500">
                                        No hay prompts configurados. Crea uno para empezar.
                                    </div>
                                )}
                                {prompts.map((p: any) => (
                                    <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative">
                                        {p.isDefault && (
                                            <span className="absolute top-4 right-4 px-2 py-1 bg-green-100 text-green-700 text-[9px] font-black uppercase tracking-widest rounded">
                                                Activo
                                            </span>
                                        )}
                                        <div className="text-[10px] font-black text-purple-600 mb-2 uppercase tracking-widest">{p.topic}</div>
                                        <h3 className="font-bold text-gray-900 text-lg mb-2 truncate">{p.name}</h3>
                                        <p className="text-xs text-gray-500 mb-6 line-clamp-3 bg-gray-50 p-2 rounded border border-gray-100">
                                            {p.content}
                                        </p>
                                        
                                        <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                                            <button 
                                                onClick={() => deletePromptMutation.mutate(p.id)}
                                                className="text-xs text-red-500 font-bold hover:text-red-700 uppercase tracking-wider"
                                            >
                                                Eliminar
                                            </button>
                                            <Button 
                                                variant="secondary" 
                                                size="sm" 
                                                onClick={() => setEditingPrompt(p)}
                                            >
                                                Editar
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <div>
                                    <h3 className="font-black text-lg text-gray-800">{editingPrompt.id ? 'Editar Prompt' : 'Nuevo Prompt'}</h3>
                                    <p className="text-xs text-gray-500">Define las reglas de negocio para este módulo.</p>
                                </div>
                                <button onClick={() => setEditingPrompt(null)} className="text-gray-400 hover:text-gray-800 font-bold text-xl">✕</button>
                            </div>
                            <form onSubmit={handlePromptSubmit} className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <Label>Nombre Descriptivo</Label>
                                        <Input 
                                            value={editingPrompt.name} 
                                            onChange={e => setEditingPrompt({...editingPrompt, name: e.target.value})}
                                            placeholder="Ej: Análisis Cruzado Premium"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label>Módulo / Tópico</Label>
                                        <select 
                                            className="w-full mt-1 rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 bg-white"
                                            value={editingPrompt.topic}
                                            onChange={e => setEditingPrompt({...editingPrompt, topic: e.target.value})}
                                            required
                                        >
                                            <option value="GENERAL_CHAT">Chat General</option>
                                            <option value="VARIANCE_AUDIT">Auditoría de Varianzas</option>
                                            <option value="CROSS_COUNT">Auditoría Cruzada</option>
                                            <option value="DATA_MAPPING">Mapeo de Datos</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <Label>Contenido del Prompt (Instrucciones)</Label>
                                    <textarea
                                        className="w-full mt-1 rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm p-4 font-mono bg-gray-50"
                                        rows={12}
                                        value={editingPrompt.content}
                                        onChange={e => setEditingPrompt({...editingPrompt, content: e.target.value})}
                                        placeholder="Escribe las instrucciones detalladas aquí..."
                                        required
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        id="isDefault" 
                                        checked={editingPrompt.isDefault}
                                        onChange={e => setEditingPrompt({...editingPrompt, isDefault: e.target.checked})}
                                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                                    />
                                    <label htmlFor="isDefault" className="text-sm font-bold text-gray-700 cursor-pointer">
                                        Establecer como Prompt Activo por Defecto para este Tópico
                                    </label>
                                </div>

                                <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
                                    <Button type="button" variant="secondary" onClick={() => setEditingPrompt(null)}>Cancelar</Button>
                                    <Button type="submit" disabled={savePromptMutation.isPending} className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
                                        {savePromptMutation.isPending ? 'Guardando...' : 'Guardar Prompt'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}

            <NotificationModal
                isOpen={notification.isOpen}
                onClose={() => setNotification({ ...notification, isOpen: false })}
                type={notification.type}
                title={notification.title}
                message={notification.message}
            />
        </AdminLayout>
    );
}
