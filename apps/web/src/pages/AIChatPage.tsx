import { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { AdminLayout } from '@/components/templates/AdminLayout';
import { getApiClient } from '@/services/api';
import { Button } from '@/components/atoms/Button';
import { useQuery } from '@tanstack/react-query';

const apiClient = getApiClient();

interface Message {
    role: 'user' | 'assistant';
    content: string;
    createdAt?: string;
}

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308'];

function ChartRenderer({ content }: { content: string }) {
    const chartData = useMemo(() => {
        try {
            // Buscamos un bloque de código JSON que empiece por { "chartType": ... }
            const jsonMatch = content.match(/```(?:json|chart)?\s*(\{[\s\S]*?\})\s*```/);
            if (!jsonMatch) return null;
            return JSON.parse(jsonMatch[1]);
        } catch (e) {
            console.error('Error parseando datos del gráfico:', e);
            return null;
        }
    }, [content]);

    if (!chartData || !chartData.type || !chartData.data) return null;

    const { type, data, title } = chartData;

    return (
        <div className="mt-4 p-4 bg-slate-900/50 rounded-2xl border border-white/5 shadow-2xl overflow-hidden min-h-[300px]">
            {title && <h4 className="text-center text-xs font-black uppercase tracking-widest text-blue-400 mb-4">{title}</h4>}
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {type === 'bar' ? (
                        /* @ts-ignore - React 19 types mismatch */
                        <BarChart data={data}>
                            {/* @ts-ignore */}
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            {/* @ts-ignore */}
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} />
                            {/* @ts-ignore */}
                            <YAxis stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} />
                            {/* @ts-ignore */}
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                itemStyle={{ fontWeight: 'bold' }}
                            />
                            {/* @ts-ignore */}
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {data.map((entry: any, index: number) => (
                                    /* @ts-ignore */
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    ) : type === 'pie' ? (
                        /* @ts-ignore */
                        <PieChart>
                            {/* @ts-ignore */}
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry: any, index: number) => (
                                    /* @ts-ignore */
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            {/* @ts-ignore */}
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                            />
                            {/* @ts-ignore */}
                            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                        </PieChart>
                    ) : (
                        /* @ts-ignore */
                        <LineChart data={data}>
                            {/* @ts-ignore */}
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            {/* @ts-ignore */}
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                            {/* @ts-ignore */}
                            <YAxis stroke="#94a3b8" fontSize={10} />
                            {/* @ts-ignore */}
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                            />
                            {/* @ts-ignore */}
                            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} />
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
    const scrollRef = useRef<HTMLDivElement>(null);

    // Cargar historial desde el servidor
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
                    { role: 'assistant', content: '¡Hola! Soy tu Asistente de Inventario Pro. He cargado nuestro historial. ¿En qué puedo ayudarte a analizar hoy?' }
                ]);
            }
        }
    }, [historyData]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await apiClient.post('/reports/chat-ai', {
                message: input,
                context: {
                    previousMessages: messages.slice(-5)
                }
            });

            const assistantMsg: Message = {
                role: 'assistant',
                content: response.data.analysis
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Lo siento, hubo un error al procesar tu consulta. Verifica la configuración de tu IA o tu conexión.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AdminLayout title="Cigua AI Auditor VIP">
            <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] flex flex-col bg-slate-950/40 backdrop-blur-xl rounded-[2.5rem] shadow-[0_32px_120px_-20px_rgba(0,0,0,0.5)] border border-white/5 overflow-hidden relative">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50"></div>

                {/* Header Premium (Glassy) */}
                <div className="bg-white/[0.02] backdrop-blur-md p-8 flex items-center justify-between border-b border-white/5 relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className="absolute -inset-1 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl blur opacity-30 animate-pulse"></div>
                            <div className="relative w-14 h-14 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center text-3xl border border-white/10 shadow-2xl">
                                🤖
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-black text-white tracking-tight">Cigua Auditor <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">VIP</span></h2>
                                <span className="bg-blue-500/10 text-blue-400 text-[10px] uppercase font-black px-2 py-0.5 rounded-md border border-blue-500/20 tracking-widest">Enterprise AI</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse"></span>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Motor de Auditoría Activo</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="hidden lg:flex flex-col items-end px-6 border-r border-white/5">
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Estado Global</span>
                            <span className="text-sm font-bold text-slate-200">Sincronizado</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Sessión</span>
                            <span className="text-sm font-bold text-white uppercase tracking-tighter">Premium User</span>
                        </div>
                    </div>
                </div>

                {/* Chat Area con diseño inmersivo */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-10 space-y-10 scroll-smooth custom-scrollbar bg-slate-950/20"
                >
                    {isLoadingHistory ? (
                        <div className="flex flex-col items-center justify-center h-full gap-6">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin"></div>
                            </div>
                            <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] animate-pulse">Restaurando Contexto Seguro...</p>
                        </div>
                    ) : (
                        messages.map((msg, i) => (
                            <div key={i} className={`flex transition-all duration-500 ease-out ${msg.role === 'user' ? 'justify-end animate-in slide-in-from-right-8' : 'justify-start animate-in slide-in-from-left-8'}`}>
                                <div className={`flex gap-5 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-sm ring-1 ring-white/10 shadow-xl overflow-hidden
                                        ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800'}`}>
                                        {msg.role === 'user' ? (
                                            <span className="font-black">U</span>
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center font-black">AI</div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className={`p-6 rounded-[2rem] backdrop-blur-md shadow-lg transition-all border
                                            ${msg.role === 'user'
                                                ? 'bg-indigo-600/90 text-white border-white/10 rounded-tr-none'
                                                : 'bg-white/5 border-white/5 text-slate-100 rounded-tl-none hover:bg-white/[0.08]'
                                            }`}>
                                            <div className="text-[14px] leading-relaxed markdown-content">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {msg.content}
                                                </ReactMarkdown>
                                                {msg.role === 'assistant' && <ChartRenderer content={msg.content} />}
                                            </div>
                                        </div>
                                        {msg.createdAt && (
                                            <span className={`text-[9px] px-2 opacity-40 font-black uppercase tracking-widest
                                                ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    {isLoading && (
                        <div className="flex justify-start animate-in fade-in duration-300">
                            <div className="flex gap-5 items-start">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center text-xs font-black shadow-xl animate-pulse">
                                    AI
                                </div>
                                <div className="bg-white/5 border border-white/5 p-6 rounded-[2rem] rounded-tl-none backdrop-blur-sm flex gap-2 items-center">
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-duration:1s]"></div>
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.2s]"></div>
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.4s]"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area Futurista */}
                <div className="p-8 bg-black/20 border-t border-white/5 relative z-10 backdrop-blur-md">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex gap-4 items-end bg-white/5 p-2 rounded-[2rem] border border-white/10 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all group overflow-hidden shadow-2xl">
                            <textarea
                                className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-white placeholder:text-slate-500 resize-none py-4 px-6 scrollbar-none"
                                placeholder="Escribe tu consulta estratégica..."
                                rows={1}
                                style={{ minHeight: '60px', maxHeight: '150px' }}
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
                                className={`w-14 h-14 rounded-full transition-all flex items-center justify-center shadow-2xl mr-1 mb-1
                                    ${!input.trim() || isLoading
                                        ? 'bg-slate-800 text-slate-600 grayscale'
                                        : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white hover:scale-110 active:scale-95 shadow-blue-500/20'}`}
                            >
                                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                </svg>
                            </button>
                        </div>

                        {/* Quick Prompts con estilo premium */}
                        <div className="mt-6 flex flex-wrap gap-3 justify-center">
                            <button
                                onClick={() => setInput("Lista los productos que faltan por contar hoy.")}
                                className="text-[10px] font-black tracking-widest uppercase py-2 px-5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl border border-white/5 transition-all active:scale-95 shadow-lg"
                            >
                                📋 Pendientes Hoy
                            </button>
                            <button
                                onClick={() => setInput("Dime qué productos tienen existencia 0 en sistema.")}
                                className="text-[10px] font-black tracking-widest uppercase py-2 px-5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl border border-white/5 transition-all active:scale-95 shadow-lg"
                            >
                                🚫 Stock Cero
                            </button>
                            <button
                                onClick={() => setInput("Análisis de impacto financiero en marca M96.")}
                                className="text-[10px] font-black tracking-widest uppercase py-2 px-5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl border border-white/5 transition-all active:scale-95 shadow-lg"
                            >
                                📉 Impacto Financiero
                            </button>
                            <button
                                onClick={() => setInput("¿Qué mejoras sugieres para el almacén central?")}
                                className="text-[10px] font-black tracking-widest uppercase py-2 px-5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl border border-white/5 transition-all active:scale-95 shadow-lg"
                            >
                                💡 Sugerencias Operativas
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
                .markdown-content table { border-collapse: collapse; width: 100%; margin: 1em 0; background: rgba(255,255,255,0.02); border-radius: 0.8rem; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
                .markdown-content th, .markdown-content td { padding: 0.8rem 1rem; border: 1px solid rgba(255,255,255,0.05); text-align: left; }
                .markdown-content th { background: rgba(255,255,255,0.05); color: #60a5fa; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em; }
                .markdown-content p { margin-bottom: 0.75rem; }
                .markdown-content p:last-child { margin-bottom: 0; }
                .markdown-content strong { color: #fff; font-weight: 800; }
                .markdown-content ul, .markdown-content ol { margin: 1rem 0; padding-left: 1.5rem; }
                .markdown-content li { margin-bottom: 0.5rem; }
                .markdown-content h1, .markdown-content h2, .markdown-content h3 { color: #fff; font-weight: 800; margin: 1.5rem 0 1rem 0; }
                .markdown-content code { background: rgba(0,0,0,0.3); padding: 0.2rem 0.4rem; rounded: 0.4rem; font-family: monospace; font-size: 0.9em; color: #fbbf24; }
            `}</style>
        </AdminLayout>
    );
}
