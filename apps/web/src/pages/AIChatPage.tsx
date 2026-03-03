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
            const jsonMatch = content.match(/```(?:json|chart)?\s*(\{[\s\S]*?\})\s*```/);
            if (!jsonMatch) return null;
            return JSON.parse(jsonMatch[1]);
        } catch (e) {
            return null;
        }
    }, [content]);

    if (!chartData || !chartData.type || !chartData.data) return null;
    const { type, data, title } = chartData;

    return (
        <div className="mt-6 p-8 bg-app rounded-3xl border border-border-default overflow-hidden min-h-[320px] shadow-inner">
            {title && <h4 className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-8">{title}</h4>}
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {type === 'bar' ? (
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} opacity={0.5} />
                            <XAxis dataKey="name" fontSize={10} tick={{ fill: 'var(--text-secondary)', fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <YAxis fontSize={10} tick={{ fill: 'var(--text-secondary)', fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <RechartsTooltip
                                contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '12px', fontSize: '11px', fontWeight: 700, boxShadow: 'var(--shadow-lg)' }}
                                cursor={{ fill: 'var(--bg-hover)', opacity: 0.4 }}
                            />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={35}>
                                {data.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    ) : type === 'pie' ? (
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={90}
                                paddingAngle={8}
                                dataKey="value"
                                stroke="none"
                            >
                                {data.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip
                                contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: '20px' }} />
                        </PieChart>
                    ) : (
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} opacity={0.5} />
                            <XAxis dataKey="name" fontSize={10} tick={{ fill: 'var(--text-secondary)', fontWeight: 700 }} axisLine={false} />
                            <YAxis fontSize={10} tick={{ fill: 'var(--text-secondary)', fontWeight: 700 }} axisLine={false} />
                            <RechartsTooltip
                                contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}
                            />
                            <Line type="monotone" dataKey="value" stroke="var(--accent-primary)" strokeWidth={4} dot={{ r: 5, fill: 'var(--accent-primary)', strokeWidth: 2, stroke: 'var(--bg-card)' }} activeDot={{ r: 7, strokeWidth: 0 }} />
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
            handleSendWithText(location.state.message);
            // Clear state
            window.history.replaceState({}, document.title);
        }
    }, [location.state, historyData, isLoadingHistory]);

    const handleSendWithText = async (text: string) => {
        if (!text.trim() || isLoading) return;
        const userMsg: Message = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
            const response = await apiClient.post('/reports/chat-ai', {
                message: text,
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
                <div className="max-w-5xl mx-auto h-[calc(100vh-140px)] flex flex-col bg-card rounded-[2.5rem] border border-border-default shadow-2xl overflow-hidden">
                    {/* Header Flat */}
                    <div className="p-8 flex items-center justify-between border-b border-border-default bg-hover/30 backdrop-blur-md">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-card rounded-2xl flex items-center justify-center text-3xl border border-border-default shadow-lg">
                                🧠
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-primary tracking-tight">Cigua Core AI</h2>
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 bg-success rounded-full animate-pulse"></span>
                                    <p className="text-[10px] text-secondary font-black uppercase tracking-[0.2em]">Auditoría en tiempo real</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <button
                                onClick={() => setMessages([{ role: 'assistant', content: 'Sesión reiniciada. ¿En qué puedo ayudarte?' }])}
                                className="text-[10px] font-black uppercase tracking-widest text-muted hover:text-danger hover:scale-105 transition-all"
                            >
                                Limpiar Canal
                            </button>
                        </div>
                    </div>

                    {/* Chat Area Flat */}
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-10 space-y-10 scroll-smooth custom-scrollbar bg-card/50"
                    >
                        {isLoadingHistory ? (
                            <div className="flex flex-col items-center justify-center h-full gap-6">
                                <div className="w-12 h-12 border-4 border-border-default border-t-accent-primary rounded-full animate-spin"></div>
                                <p className="text-muted text-[10px] font-black uppercase tracking-[0.3em]">Iniciando Protocolos AI...</p>
                            </div>
                        ) : (
                            messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-500`}>
                                    <div className={`flex gap-5 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-[10px] font-black border border-border-default shadow-md
                                            ${msg.role === 'user' ? 'bg-accent-primary text-white border-none' : 'bg-hover text-primary'}`}>
                                            {msg.role === 'user' ? 'USR' : 'BOT'}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <div className={`p-6 rounded-[1.8rem] border shadow-xl transition-all
                                                ${msg.role === 'user'
                                                    ? 'bg-accent-primary/5 text-primary border-accent-primary/20 rounded-tr-none'
                                                    : 'bg-hover/50 border-border-default text-primary rounded-tl-none'
                                                }`}>
                                                <div className="text-[15px] leading-relaxed markdown-content font-medium">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                    {msg.role === 'assistant' && <ChartRenderer content={msg.content} />}
                                                </div>
                                            </div>
                                            {msg.createdAt && (
                                                <span className={`text-[9px] font-black uppercase tracking-widest text-muted/50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        {isLoading && (
                            <div className="flex justify-start animate-pulse">
                                <div className="flex gap-5">
                                    <div className="w-10 h-10 rounded-xl bg-hover border border-border-default flex items-center justify-center text-[10px] font-bold">
                                        ...
                                    </div>
                                    <div className="bg-hover/50 border border-border-default px-6 py-4 rounded-[1.8rem] rounded-tl-none flex gap-2 items-center shadow-lg">
                                        <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                        <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area Flat */}
                    <div className="p-8 border-t border-border-default bg-card">
                        <div className="max-w-4xl mx-auto">
                            <div className="flex gap-4 items-end bg-hover/40 p-3 rounded-3xl border border-border-default focus-within:border-accent-primary/50 focus-within:bg-hover/60 transition-all shadow-inner group">
                                <textarea
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] text-primary placeholder:text-muted/50 resize-none py-4 px-5 min-h-[60px] max-h-[180px] font-medium"
                                    placeholder="Consultar métricas, discrepancias o tendencias..."
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
                                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shrink-0 mb-1.5 mr-1.5 shadow-xl
                                        ${!input.trim() || isLoading
                                            ? 'bg-border-default text-muted'
                                            : 'bg-accent-primary text-white hover:bg-accent-hover hover:scale-105 active:scale-95'}`}
                                >
                                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                                        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                    </svg>
                                </button>
                            </div>

                            {/* Quick Prompts Flat */}
                            <div className="mt-6 flex flex-wrap gap-3 justify-center">
                                {["Resumen de Inventario", "Altas Varianzas", "Valoración de Stock"].map(label => (
                                    <button
                                        key={label}
                                        onClick={() => setInput(label)}
                                        className="text-[10px] font-black uppercase tracking-widest py-2 px-5 bg-hover/50 hover:bg-border-default text-secondary rounded-xl border border-border-default transition-all hover:scale-105 active:scale-95 shadow-md"
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
