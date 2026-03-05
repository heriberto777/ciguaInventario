import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    FlatList,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useReservedInvoices } from '../hooks/useReservedInvoices';
import BarcodeScanner from './BarcodeScanner';

interface InvoiceReserveModalProps {
    visible: boolean;
    onClose: () => void;
    countId: string;
}

export default function InvoiceReserveModal({ visible, onClose, countId }: InvoiceReserveModalProps) {
    const {
        reservedInvoices,
        isLoading,
        reserveInvoice,
        isReserving,
        removeReservation,
        isRemoving,
    } = useReservedInvoices(countId);

    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [showScanner, setShowScanner] = useState(false);

    const handleReserve = async (code: string) => {
        if (!code.trim()) return;
        try {
            await reserveInvoice(code.trim());
            setInvoiceNumber('');
            setShowScanner(false);
            Alert.alert('✅ Éxito', `Factura ${code} relacionada correctamente.`);
        } catch (error: any) {
            console.error('Reserve error:', error);
            Alert.alert('❌ Error', error.response?.data?.message || 'No se pudo relacionar la factura. Verifique la conexión.');
        }
    };

    const handleRemove = (invoiceId: string, invoiceNumber: string) => {
        Alert.alert(
            'Eliminar Relación',
            `¿Estás seguro de eliminar la relación con la factura ${invoiceNumber}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => removeReservation(invoiceId)
                },
            ]
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Relacionar Despachos</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputSection}>
                        <Text style={styles.label}>Escanear o ingresar número de factura</Text>
                        <View style={styles.searchRow}>
                            <TextInput
                                style={styles.input}
                                placeholder="Número de factura..."
                                value={invoiceNumber}
                                onChangeText={setInvoiceNumber}
                                autoCapitalize="characters"
                            />
                            <TouchableOpacity
                                style={styles.scanBtn}
                                onPress={() => setShowScanner(true)}
                            >
                                <Text style={styles.scanBtnText}>📷</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.addBtn, (!invoiceNumber || isReserving) && styles.addBtnDisabled]}
                                onPress={() => handleReserve(invoiceNumber)}
                                disabled={!invoiceNumber || isReserving}
                            >
                                {isReserving ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.addBtnText}>Agregar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={styles.listTitle}>Facturas Relacionadas ({reservedInvoices.length})</Text>

                    {isLoading ? (
                        <ActivityIndicator style={{ marginTop: 20 }} color="#3b82f6" />
                    ) : (
                        <FlatList
                            data={reservedInvoices}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <View style={styles.invoiceItem}>
                                    <View style={styles.invoiceInfo}>
                                        <Text style={styles.invoiceNum}>{item.invoiceNumber}</Text>
                                        <Text style={styles.clientName}>{item.clientName}</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => handleRemove(item.id, item.invoiceNumber)}
                                        disabled={isRemoving}
                                        style={styles.removeBtn}
                                    >
                                        <Text style={styles.removeBtnText}>🗑️</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            ListEmptyComponent={
                                <Text style={styles.emptyText}>No hay facturas relacionadas aún.</Text>
                            }
                            contentContainerStyle={{ paddingBottom: 20 }}
                        />
                    )}
                </View>

                <Modal visible={showScanner} animationType="fade">
                    <BarcodeScanner
                        onBarcodeScan={(code) => handleReserve(code)}
                        onClose={() => setShowScanner(false)}
                    />
                </Modal>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '85%',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    closeBtn: {
        padding: 5,
    },
    closeBtnText: {
        fontSize: 20,
        color: '#6b7280',
    },
    inputSection: {
        marginBottom: 25,
    },
    label: {
        fontSize: 14,
        color: '#4b5563',
        marginBottom: 8,
    },
    searchRow: {
        flexDirection: 'row',
        gap: 10,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 45,
        fontSize: 16,
    },
    scanBtn: {
        width: 45,
        height: 45,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d1d5db',
    },
    scanBtnText: {
        fontSize: 20,
    },
    addBtn: {
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        paddingHorizontal: 15,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addBtnDisabled: {
        backgroundColor: '#93c5fd',
    },
    addBtnText: {
        color: '#fff',
        fontWeight: '600',
    },
    listTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    invoiceItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    invoiceInfo: {
        flex: 1,
    },
    invoiceNum: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    clientName: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 2,
    },
    removeBtn: {
        padding: 8,
    },
    removeBtnText: {
        fontSize: 18,
    },
    emptyText: {
        textAlign: 'center',
        color: '#9ca3af',
        marginTop: 40,
        fontSize: 15,
    },
});
