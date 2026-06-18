import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { AdminLayout } from '@/components/templates/AdminLayout';
import { getApiClient } from '@/services/api';
import { useQuery } from '@tanstack/react-query';

const apiClient = getApiClient();

interface Message {
    role: 'user' | 'assistant';
    content: string;
    createdAt?: string;
}

const COLORS = [
    'var(--accent-primary)',
    'var(--accent-secondary)',
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444'
];

function ChartRenderer({ content }: { content: string }) {
    const chartData = useMemo(() => {
        try {
            // 1. Intentar con bloques de código markdown (el método más limpio)
            const blockMatch = content.match(/```(?:json|json-chart|chart)?\s*(\{[\s\S]*?\})\s*```/);
            if (blockMatch) return JSON.parse(blockMatch[1]);
            
            // 2. Extractor Robusto de "Llaves Balanceadas" para JSON sueltos
            const startIdx = content.search(/\{\s*"type"\s*:\s*"(?:bar|line|pie)"/);
            if (startIdx !== -1) {
                let braceCount = 0;
                let endIdx = -1;
                for (let i = startIdx; i < content.length; i++) {
                    if (content[i] === '{') braceCount++;
                    if (content[i] === '}') {
                        braceCount--;
                        if (braceCount === 0) {
                            endIdx = i;
                            break;
                        }
                    }
                }
                if (endIdx !== -1) {
                    const rawJson = content.slice(startIdx, endIdx + 1);
                    return JSON.parse(rawJson);
                }
            }

            return null;
        } catch (e) {
            return null;
        }
    }, [content]);

    if (!chartData || !chartData.type || !chartData.data) return null;
    const { type, data, title } = chartData;

    // Normalización agresiva de datos
    const normalizedData = Array.isArray(data) ? data.map((d: any) => ({
        name: d.name || d.label || 'N/A',
        value: Number(d.value || d.amount || 0)
    })) : [];

    if (normalizedData.length === 0) return null;

    return (
        <div className="mt-6 p-6 bg-white rounded-lg border border-slate-200 overflow-hidden min-h-[350px] shadow-sm">
            {title && (
                <div className="mb-8 text-center">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-accent-primary mb-1">Visualización Estratégica</h4>
                    <p className="text-sm font-bold text-primary">{title}</p>
                </div>
            )}
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {type === 'bar' ? (
                        <BarChart data={normalizedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} opacity={0.3} />
                            <XAxis dataKey="name" fontSize={9} tick={{ fill: 'var(--text-secondary)', fontWeight: 800 }} axisLine={false} tickLine={false} />
                            <YAxis fontSize={10} tick={{ fill: 'var(--text-secondary)', fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <RechartsTooltip
                                contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '16px', fontSize: '11px', fontWeight: 700, boxShadow: 'var(--shadow-xl)' }}
                                cursor={{ fill: 'var(--bg-hover)', opacity: 0.4 }}
                            />
                            {/* Base 0 para manejar positivos y negativos */}
                            <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={32}>
                                {normalizedData.map((entry: any, index: number) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={entry.value < 0 ? 'var(--accent-danger, #ef4444)' : COLORS[index % COLORS.length]} 
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    ) : type === 'pie' ? (
                        <PieChart>
                            <Pie
                                data={normalizedData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={85}
                                paddingAngle={10}
                                dataKey="value"
                                stroke="none"
                            >
                                {normalizedData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip
                                contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '16px', fontSize: '11px', fontWeight: 700 }}
                            />
                            <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '20px' }} />
                        </PieChart>
                    ) : (
                        <LineChart data={normalizedData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} opacity={0.3} />
                            <XAxis dataKey="name" fontSize={9} tick={{ fill: 'var(--text-secondary)', fontWeight: 800 }} axisLine={false} />
                            <YAxis fontSize={10} tick={{ fill: 'var(--text-secondary)', fontWeight: 700 }} axisLine={false} />
                            <RechartsTooltip
                                contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '16px', fontSize: '11px', fontWeight: 700 }}
                            />
                            <Line type="monotone" dataKey="value" stroke="var(--accent-primary)" strokeWidth={4} dot={{ r: 4, fill: 'var(--accent-primary)', strokeWidth: 2, stroke: 'var(--bg-card)' }} activeDot={{ r: 6 }} />
                        </LineChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export function AIChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const location = useLocation();
    const scrollRef = useRef<HTMLDivElement>(null);

    const { data: historyData, isLoading: isLoadingHistory } = useQuery({
        queryKey: ['chat-history'],
        queryFn: async () => {
            const response = await apiClient.get('/reports/chat-history');
            return response.data.data;
        }
    });

    useEffect(() => {
        if (historyData) {
            const mappedMessages = historyData.map((m: any) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
                createdAt: m.createdAt
            }));
            if (mappedMessages.length > 0) {
                setMessages(mappedMessages);
            } else {
                setMessages([
                    { role: 'assistant', content: '¡Hola! Soy tu Asistente de Inventario Inteligente. ¿Qué deseas auditar hoy?' }
                ]);
            }
        }
    }, [historyData]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // Auto-trigger from state
    useEffect(() => {
        if (location.state?.message && !isLoading && !isLoadingHistory) {
            handleSendWithText(location.state.message, location.state.topic);
            // Clear state
            window.history.replaceState({}, document.title);
        }
    }, [location.state, historyData, isLoadingHistory]);

    const handleSendWithText = async (text: string, topic?: string) => {
        if (!text.trim() || isLoading) return;
        const userMsg: Message = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
            const response = await apiClient.post('/reports/chat-ai', {
                message: text,
                topic: topic, // Enviamos el tópico si existe
                context: { previousMessages: messages.slice(-5) }
            });
            setMessages(prev => [...prev, { role: 'assistant', content: response.data.analysis }]);
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Lo siento, hubo un error al procesar tu consulta estratégica.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        await handleSendWithText(input);
        setInput('');
    };

    return (
        <>
            <AdminLayout title="Cigua AI Intelligence">
                <div className="w-full h-[calc(100vh-120px)] flex flex-col bg-slate-50 border border-slate-200 shadow-sm overflow-hidden rounded-xl">
                    {/* Header Solid & Professional */}
                    <div className="px-8 py-6 flex items-center justify-between border-b border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center text-2xl shadow-inner">
                                🤖
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Cigua Core AI</h2>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Consultoría de Inventario Activa</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setMessages([{ role: 'assistant', content: 'Sesión reiniciada. ¿Qué datos del inventario deseas explorar hoy?' }])}
                                className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-rose-600 transition-colors border border-transparent hover:border-rose-100 rounded-md"
                            >
                                Limpiar Canal
                            </button>
                        </div>
                    </div>

                    {/* Chat Area - Solid & Structured */}
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 scroll-smooth custom-scrollbar bg-slate-50"
                    >
                        {isLoadingHistory ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4">
                                <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Sincronizando con el núcleo...</p>
                            </div>
                        ) : (
                            messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`w-9 h-9 rounded-md flex-shrink-0 flex items-center justify-center text-[10px] font-bold shadow-sm
                                            ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-900 border border-slate-200'}`}>
                                            {msg.role === 'user' ? 'USR' : 'AI'}
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <div className={`px-6 py-4 rounded-lg shadow-sm border
                                                ${msg.role === 'user'
                                                    ? 'bg-indigo-600 text-white border-indigo-700'
                                                    : 'bg-white border-slate-200 text-slate-800'
                                                }`}>
                                                <div className={`text-[14px] leading-relaxed markdown-content ${msg.role === 'user' ? 'text-white' : 'text-slate-700'}`}>
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                    {msg.role === 'assistant' && <ChartRenderer content={msg.content} />}
                                                </div>
                                            </div>
                                            {msg.createdAt && (
                                                <span className={`text-[9px] font-bold text-slate-400 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="flex gap-4">
                                    <div className="w-9 h-9 rounded-md bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400">
                                        ...
                                    </div>
                                    <div className="bg-white border border-slate-200 px-5 py-3 rounded-lg flex gap-1.5 items-center shadow-sm">
                                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area - Full Width Solid */}
                    <div className="p-6 bg-white border-t border-slate-200">
                        <div className="w-full flex flex-col gap-4">
                            <div className="flex gap-3 items-end bg-slate-50 p-2 rounded-lg border border-slate-200 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-100 transition-all group">
                                <textarea
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-[14px] text-slate-800 placeholder:text-slate-400 resize-none py-3 px-4 min-h-[50px] max-h-[200px]"
                                    placeholder="Escribe tu consulta sobre mermas, stock o auditorías..."
                                    rows={1}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isLoading}
                                    className={`px-6 h-11 rounded-md font-bold text-xs uppercase tracking-widest transition-all
                                        ${!input.trim() || isLoading
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm active:scale-95'}`}
                                >
                                    Enviar
                                </button>
                            </div>

                            {/* Action Pills */}
                            <div className="flex flex-wrap gap-2 justify-start">
                                {["Comparar Conteos", "Mermas por Marca", "Valoración Total"].map(label => (
                                    <button
                                        key={label}
                                        onClick={() => setInput(label)}
                                        className="text-[10px] font-bold uppercase tracking-wider py-1.5 px-4 bg-white hover:bg-slate-50 text-slate-600 rounded-md border border-slate-200 transition-all"
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </AdminLayout>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
                
                .markdown-content table { border-collapse: separate; border-spacing: 0; width: 100%; margin: 1.5rem 0; background: var(--bg-hover); border-radius: 1rem; overflow: hidden; border: 1px solid var(--border-default); box-shadow: var(--shadow-lg); }
                .markdown-content th, .markdown-content td { padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-default); text-align: left; font-size: 14px; }
                .markdown-content tr:last-child td { border-bottom: none; }
                .markdown-content th { background: var(--bg-app); color: var(--text-primary); font-weight: 900; text-transform: uppercase; font-size: 10px; letter-spacing: 0.15em; border-bottom: 2px solid var(--border-default); }
                .markdown-content p { margin-bottom: 0.75rem; }
                .markdown-content p:last-child { margin-bottom: 0; }
                .markdown-content strong { color: var(--accent-primary); font-weight: 800; }
                .markdown-content ul, .markdown-content ol { margin: 1rem 0; padding-left: 1.5rem; }
                .markdown-content li { margin-bottom: 0.5rem; border-left: 2px solid var(--accent-primary); padding-left: 1rem; list-style: none; }
                .markdown-content h1, .markdown-content h2, .markdown-content h3 { color: var(--text-primary); font-weight: 900; margin: 1.5rem 0 0.75rem 0; letter-spacing: -0.02em; }
                .markdown-content code { background: var(--bg-card); padding: 0.2rem 0.5rem; border-radius: 0.5rem; font-family: 'JetBrains Mono', monospace; font-size: 0.9em; color: var(--accent-secondary); border: 1px solid var(--border-default); }
            `}</style>
        </>
    );
}

export default AIChatPage;
