import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useListInventoryCounts, InventoryCount } from '@/hooks/useInventory';
import { useResponsive } from '@/hooks/useResponsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '@/services/serverConfig';

export default function ReportsScreen() {
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    const { data: allCounts = [], isLoading, refetch } = useListInventoryCounts();
    const { isTablet, spacing } = useResponsive();

    // Estados para el modal de detalle
    const [selectedReport, setSelectedReport] = useState<InventoryCount | null>(null);
    const [reportDetails, setReportDetails] = useState<any[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [summary, setSummary] = useState<any>(null);

    // Filtrar conteos: Activos para monitoreo, y Completados para resultados
    const monitorCounts = allCounts.filter(count =>
        ['ACTIVE', 'SUBMITTED', 'PAUSED'].includes(count.status)
    ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const finishedCounts = allCounts.filter(count =>
        ['COMPLETED', 'CLOSED', 'FINALIZED'].includes(count.status)
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const fetchReportDetails = async (count: InventoryCount) => {
        setSelectedReport(count);
        setLoadingDetails(true);
        try {
            const baseUrl = await getApiBaseUrl();
            const token = await AsyncStorage.getItem('auth_token');

            const [detailsRes, summaryRes] = await Promise.all([
                fetch(`${baseUrl}/reports/${count.id}/physical-inventory`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${baseUrl}/reports/${count.id}/variance-summary`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (detailsRes.ok && summaryRes.ok) {
                const detailsData = await detailsRes.json();
                const summaryData = await summaryRes.json();
                setReportDetails(detailsData.data || []);
                setSummary(summaryData.data || null);
            }
        } catch (error) {
            console.error('Error fetching report details:', error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const renderProgress = (count: InventoryCount) => {
        const total = count.countItems?.length || 0;
        const counted = count.countItems?.filter(i => i.countedQty !== null).length || 0;
        const progress = total > 0 ? counted / total : 0;

        return (
            <View style={styles.progressContainer}>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                </View>
                <Text style={styles.progressText}>{Math.round(progress * 100)}% ({counted}/{total} ítems)</Text>
            </View>
        );
    };

    const renderCounts = (counts: InventoryCount[], title: string, isFinished: boolean) => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {counts.length === 0 ? (
                <Text style={styles.emptySmall}>No hay {title.toLowerCase()} disponibles.</Text>
            ) : (
                counts.map(item => (
                    <TouchableOpacity
                        key={item.id}
                        style={styles.card}
                        onPress={() => isFinished ? fetchReportDetails(item) : router.push(`/${item.id}`)}
                    >
                        <View style={styles.cardHeader}>
                            <View>
                                <Text style={styles.countNumber}>#{item.sequenceNumber}</Text>
                                <Text style={styles.countCode}>{item.code || 'Sin código'}</Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                                <Text style={styles.statusText}>{item.status}</Text>
                            </View>
                        </View>
                        <View style={styles.cardBody}>
                            <Text style={styles.cardDate}>Actualizado: {new Date(item.updatedAt).toLocaleString()}</Text>
                            {!isFinished && renderProgress(item)}
                            {isFinished && (
                                <View style={styles.miniSummary}>
                                    <Text style={styles.miniLabel}>Acción → Ver desglose financiero</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                ))
            )}
        </View>
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return '#3b82f6';
            case 'PAUSED': return '#f59e0b';
            case 'COMPLETED': return '#10b981';
            case 'CLOSED': return '#8b5cf6';
            default: return '#6b7280';
        }
    };

    if (isLoading && !refreshing) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>📊 Hub de Reportes</Text>
                <Text style={styles.headerSubtitle}>Monitoreo y Auditoría de Inventario</Text>
            </View>

            <ScrollView
                contentContainerStyle={{ padding: spacing }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {renderCounts(monitorCounts, "Conteos Activos", false)}
                {renderCounts(finishedCounts, "Historial de Resultados", true)}
            </ScrollView>

            {/* Modal de Detalle de Reporte (Estilo Web) */}
            <Modal visible={!!selectedReport} animationType="slide" transparent={false}>
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setSelectedReport(null)} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.modalTitle}>Reporte #{selectedReport?.sequenceNumber}</Text>
                            <Text style={styles.modalSubtitle}>{selectedReport?.code}</Text>
                        </View>
                    </View>

                    {loadingDetails ? (
                        <View style={styles.centered}><ActivityIndicator size="large" color="#3b82f6" /></View>
                    ) : (
                        <ScrollView contentContainerStyle={styles.modalContent}>
                            {/* Summary Cards */}
                            {summary && (
                                <View style={styles.summaryGrid}>
                                    <View style={[styles.summaryCard, { borderLeftColor: '#10b981' }]}>
                                        <Text style={styles.sumLabel}>Exactitud</Text>
                                        <Text style={[styles.sumValue, { color: '#10b981' }]}>{summary.accuracyRate.toFixed(2)}%</Text>
                                    </View>
                                    <View style={[styles.summaryCard, { borderLeftColor: '#ef4444' }]}>
                                        <Text style={styles.sumLabel}>Merma Total</Text>
                                        <Text style={[styles.sumValue, { color: '#ef4444' }]}>-${summary.totalLossValue.toLocaleString()}</Text>
                                    </View>
                                    <View style={[styles.summaryCard, { borderLeftColor: '#3b82f6' }]}>
                                        <Text style={styles.sumLabel}>Neto</Text>
                                        <Text style={[styles.sumValue, { color: summary.netVarianceCost >= 0 ? '#10b981' : '#ef4444' }]}>
                                            ${summary.netVarianceCost.toLocaleString()}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            <Text style={styles.tableTitle}>Desglose por Marca</Text>
                            {reportDetails.map((group) => (
                                <View key={group.brand} style={styles.brandGroup}>
                                    <View style={styles.brandHeader}>
                                        <Text style={styles.brandName}>📦 {group.brand}</Text>
                                        <Text style={styles.brandImpact}>Impacto: ${group.totalVarianceCost.toLocaleString()}</Text>
                                    </View>
                                    <View style={styles.brandItemsHeaders}>
                                        <Text style={[styles.itemHeader, { flex: 2 }]}>Articulo</Text>
                                        <Text style={[styles.itemHeader, { textAlign: 'right', flex: 0.8 }]}>Sist.</Text>
                                        <Text style={[styles.itemHeader, { textAlign: 'right', flex: 0.8, color: '#3b82f6' }]}>Res.</Text>
                                        <Text style={[styles.itemHeader, { textAlign: 'right', flex: 0.8 }]}>Fis.</Text>
                                        <Text style={[styles.itemHeader, { textAlign: 'right', flex: 0.8 }]}>Dif.</Text>
                                    </View>
                                    {group.items.slice(0, 15).map((item: any) => (
                                        <View key={item.itemCode} style={styles.itemRow}>
                                            <Text style={[styles.itemText, { flex: 2 }]} numberOfLines={1}>{item.itemName}</Text>
                                            <Text style={[styles.itemText, { textAlign: 'right', flex: 0.8 }]}>{item.systemQty}</Text>
                                            <Text style={[styles.itemText, { textAlign: 'right', flex: 0.8, fontWeight: '800', color: '#3b82f6' }]}>{item.reservedQty || '0'}</Text>
                                            <Text style={[styles.itemText, { textAlign: 'right', flex: 0.8, fontWeight: 'bold' }]}>{item.countedQty ?? '–'}</Text>
                                            <Text style={[styles.itemText, { textAlign: 'right', flex: 0.8, fontWeight: 'bold', color: item.difference < 0 ? '#ef4444' : item.difference > 0 ? '#10b981' : '#94a3b8' }]}>
                                                {item.difference ?? '–'}
                                            </Text>
                                        </View>
                                    ))}
                                    {group.items.length > 15 && (
                                        <Text style={styles.moreItems}>+ {group.items.length - 15} artículos más...</Text>
                                    )}
                                </View>
                            ))}
                        </ScrollView>
                    )}
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 12, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, marginLeft: 4 },
    emptySmall: { fontSize: 14, color: '#94a3b8', fontStyle: 'italic', padding: 12 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    countNumber: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
    countCode: { fontSize: 12, color: '#64748b' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusText: { color: '#fff', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
    cardBody: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
    cardDate: { fontSize: 11, color: '#94a3b8', marginBottom: 8 },
    progressContainer: { marginTop: 4 },
    progressBarBg: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#3b82f6' },
    progressText: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 4 },
    miniSummary: { flexDirection: 'row', alignItems: 'center' },
    miniLabel: { fontSize: 12, color: '#3b82f6', fontWeight: '700' },

    // Modal Styles
    modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
    modalHeader: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' },
    closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: '#f1f5f9', borderRadius: 20 },
    closeButtonText: { fontSize: 20, color: '#64748b' },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
    modalSubtitle: { fontSize: 12, color: '#64748b' },
    modalContent: { padding: 16 },
    summaryGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 20 },
    summaryCard: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 12, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, elevation: 1 },
    sumLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
    sumValue: { fontSize: 15, fontWeight: '800', marginTop: 2 },
    tableTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 12 },
    brandGroup: { backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
    brandHeader: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 8, marginBottom: 10 },
    brandName: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    brandImpact: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
    brandItemsHeaders: { flexDirection: 'row', marginBottom: 8 },
    itemHeader: { flex: 1, fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' },
    itemRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
    itemText: { flex: 1, fontSize: 12, color: '#475569' },
    moreItems: { fontSize: 11, color: '#3b82f6', textAlign: 'center', marginTop: 8, fontWeight: '600' }
});
