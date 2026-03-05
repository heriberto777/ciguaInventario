import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '@/services/serverConfig';

const { width } = Dimensions.get('window');

interface AIAuditItem {
    id: string;
    countCode: string;
    timestamp: string;
    summary: string;
    findings: string[];
    recommendations: string[];
    accuracy: number;
    netCost: number;
}

export default function AIAuditScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [audits, setAudits] = useState<AIAuditItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);

    const fetchAudits = async () => {
        try {
            const baseUrl = await getApiBaseUrl();
            const token = await AsyncStorage.getItem('auth_token');

            const response = await fetch(`${baseUrl}/reports/historical-audit`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    const mapped = result.data.slice(0, 10).map((audit: any) => ({
                        id: audit.id,
                        countCode: String(audit.code),
                        timestamp: audit.date,
                        accuracy: audit.accuracy,
                        netCost: audit.netCost,
                        summary: `Desempeño del ${audit.accuracy?.toFixed(1)}%`,
                        findings: [`Impacto neto: ${audit.netCost} DOP`, `${audit.variances} varianzas`],
                        recommendations: ['Auditar mermas críticas']
                    }));
                    setAudits(mapped);
                }
            }
        } catch (error) {
            console.error('Error fetching audits:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAudits();
    }, []);

    const handleDeepAudit = async () => {
        if (selectedIds.length === 0) return;
        setAnalyzing(true);
        try {
            const baseUrl = await getApiBaseUrl();
            const token = await AsyncStorage.getItem('auth_token');
            const res = await fetch(`${baseUrl}/reports/ai-audit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ auditIds: selectedIds })
            });
            const data = await res.json();
            if (data.success) {
                setLastAnalysis(data.analysis);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setAnalyzing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchAudits();
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    // Datos para los "Gráficos" (Últimos 5)
    const chartData = audits.slice(0, 5).reverse();
    const maxCost = Math.max(...chartData.map(d => Math.abs(d.netCost)), 1);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🧠 AI Auditor Hub</Text>
                <Text style={styles.headerSubtitle}>Insights Estratégicos e Inteligencia</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* TENDENCIAS VISUALES (REPLICANDO WEB) */}
                <View style={styles.chartsRow}>
                    <View style={styles.chartCard}>
                        <Text style={styles.chartLabel}>Precisión (%)</Text>
                        <View style={styles.barChartContainer}>
                            {chartData.map((d, i) => (
                                <View key={i} style={styles.barWrapper}>
                                    <View style={[styles.bar, { height: `${d.accuracy}%`, backgroundColor: d.accuracy > 95 ? '#10b981' : d.accuracy > 85 ? '#f59e0b' : '#ef4444' }]} />
                                    <Text style={styles.barTag}>#{d.countCode}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={styles.chartCard}>
                        <Text style={styles.chartLabel}>Impacto Financiero</Text>
                        <View style={styles.barChartContainer}>
                            {chartData.map((d, i) => (
                                <View key={i} style={styles.barWrapper}>
                                    <View style={[styles.bar, {
                                        height: `${(Math.abs(d.netCost) / maxCost) * 100}%`,
                                        backgroundColor: d.netCost >= 0 ? '#10b981' : '#ef4444',
                                        width: 10
                                    }]} />
                                    <Text style={styles.barTag}>#{d.countCode}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* ACCIÓN DE IA */}
                {selectedIds.length > 0 && (
                    <TouchableOpacity style={styles.aiButton} onPress={handleDeepAudit} disabled={analyzing}>
                        {analyzing ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.aiButtonText}>🤖 Analizar {selectedIds.length} Conteos con AI</Text>
                        )}
                    </TouchableOpacity>
                )}

                {/* ANALISIS RECIENTE */}
                {lastAnalysis && (
                    <View style={styles.analysisBox}>
                        <Text style={styles.analysisTitle}>🧠 Auditoría Profunda IA</Text>
                        <Text style={styles.analysisText}>{lastAnalysis.substring(0, 500)}...</Text>
                        <TouchableOpacity onPress={() => setLastAnalysis(null)} style={styles.dismissBtn}>
                            <Text style={styles.dismissText}>Cerrar Análisis</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* LISTADO PARA SELECCIÓN */}
                <Text style={styles.sectionTitle}>Historial para Auditoría</Text>
                {audits.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={[styles.auditItem, selectedIds.includes(item.id) && styles.selectedItem]}
                        onPress={() => toggleSelect(item.id)}
                    >
                        <View style={[styles.check, selectedIds.includes(item.id) && styles.checked]}>
                            {selectedIds.includes(item.id) && <Text style={styles.checkIcon}>✓</Text>}
                        </View>
                        <View style={styles.itemInfo}>
                            <View style={styles.itemHeader}>
                                <Text style={styles.itemCode}>Conteo #{item.countCode}</Text>
                                <Text style={styles.itemDate}>{new Date(item.timestamp).toLocaleDateString()}</Text>
                            </View>
                            <View style={styles.statsRow}>
                                <View style={styles.statMini}>
                                    <Text style={styles.statLabel}>ERI</Text>
                                    <Text style={[styles.statValue, { color: item.accuracy > 95 ? '#10b981' : '#f59e0b' }]}>{item.accuracy.toFixed(1)}%</Text>
                                </View>
                                <View style={[styles.statMini, { borderLeftWidth: 1, borderLeftColor: '#f1f5f9', paddingLeft: 12 }]}>
                                    <Text style={styles.statLabel}>Impacto</Text>
                                    <Text style={[styles.statValue, { color: item.netCost >= 0 ? '#10b981' : '#ef4444' }]}>${item.netCost.toLocaleString()}</Text>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    headerTitle: { fontSize: 26, fontWeight: '900', color: '#0f172a', letterSpacing: -1 },
    headerSubtitle: { fontSize: 13, color: '#64748b', fontWeight: '500' },
    scrollContent: { padding: 16 },
    chartsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    chartCard: { flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, borderSize: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
    chartLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 15, letterSpacing: 1 },
    barChartContainer: { height: 80, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4 },
    barWrapper: { flex: 1, alignItems: 'center' },
    bar: { width: 14, borderRadius: 7 },
    barTag: { fontSize: 8, color: '#94a3b8', marginTop: 4, fontWeight: '700' },
    aiButton: { backgroundColor: '#6366f1', padding: 18, borderRadius: 20, alignItems: 'center', marginBottom: 20, shadowColor: '#6366f1', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
    aiButtonText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: -0.5 },
    sectionTitle: { fontSize: 12, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 15 },
    auditItem: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
    selectedItem: { borderColor: '#6366f1', backgroundColor: '#f5f3ff' },
    check: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: '#e2e8f0', marginRight: 15, alignItems: 'center', justifyContent: 'center' },
    checked: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    checkIcon: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    itemInfo: { flex: 1 },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    itemCode: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
    itemDate: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
    statsRow: { flexDirection: 'row', gap: 20 },
    statMini: { flexDirection: 'column' },
    statLabel: { fontSize: 9, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' },
    statValue: { fontSize: 13, fontWeight: '800', marginTop: 1 },
    analysisBox: { backgroundColor: '#1e293b', padding: 20, borderRadius: 24, marginBottom: 25 },
    analysisTitle: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 10 },
    analysisText: { color: '#cbd5e1', fontSize: 14, lineHeight: 22 },
    dismissBtn: { marginTop: 15, alignSelf: 'flex-end', padding: 8 },
    dismissText: { color: '#6366f1', fontWeight: '800', fontSize: 12 }
});
