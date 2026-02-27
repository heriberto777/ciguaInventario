import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AdminLayout } from '@/components/templates/AdminLayout';
import { getApiClient } from '@/services/api';
import { Button } from '@/components/atoms/Button';
import { Label } from '@/components/atoms/Label';
import { Input } from '@/components/atoms/Input';

const apiClient = getApiClient();

export function AIConfigPage() {
    const [formData, setFormData] = useState({
        provider: 'OPENAI',
        apiKey: '',
        modelName: 'gpt-4',
        baseUrl: '',
        systemPrompt: '',
        isActive: true
    });

    const { data: config, isLoading, refetch } = useQuery({
        queryKey: ['ai-config'],
        queryFn: async () => {
            const resp = await apiClient.get('/reports/ai-config');
            if (resp.data.data) {
                setFormData(resp.data.data);
            }
            return resp.data.data;
        }
    });

    const mutation = useMutation({
        mutationFn: (data: any) => apiClient.post('/reports/ai-config', data),
        onSuccess: () => {
            alert('Configuración guardada correctamente');
            refetch();
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    if (isLoading) return <AdminLayout title="Configuración IA"><div>Cargando...</div></AdminLayout>;

    return (
        <AdminLayout title="Configuración de Inteligencia Artificial">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-800">Proveedor de LLM</h3>
                    <p className="text-sm text-gray-500">Configura la conexión con tu modelo de lenguaje preferido.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <Label>Proveedor</Label>
                            <select
                                className="w-full mt-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                value={formData.provider}
                                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                            >
                                <option value="OPENAI">OpenAI (GPT-4)</option>
                                <option value="CLAUDE">Anthropic (Claude 3)</option>
                                <option value="GEMINI">Google Gemini</option>
                                <option value="LOCAL">Local (Ollama / Custom Endpoint)</option>
                            </select>
                        </div>

                        <div>
                            <Label>Modelo (ID)</Label>
                            <Input
                                value={formData.modelName || ''}
                                onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
                                placeholder="ej: gpt-4, claude-3-opus, gemini-1.5-pro"
                            />
                        </div>

                        <div>
                            <Label>API Key</Label>
                            <Input
                                type="password"
                                value={formData.apiKey || ''}
                                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                                placeholder="sk-..."
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Tu llave se guarda de forma segura en el servidor.</p>
                        </div>

                        {formData.provider === 'LOCAL' && (
                            <div>
                                <Label>Base URL (Opcional)</Label>
                                <Input
                                    value={formData.baseUrl || ''}
                                    onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                                    placeholder="http://localhost:11434/v1"
                                />
                            </div>
                        )}

                        <div>
                            <Label>System Prompt (Personalización)</Label>
                            <textarea
                                className="w-full mt-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                rows={5}
                                value={formData.systemPrompt || ''}
                                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                                placeholder="Instrucciones para la IA..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Guardando...' : 'Guardar Configuración'}
                        </Button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
