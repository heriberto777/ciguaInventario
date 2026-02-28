/**
 * Pantalla de configuración del servidor (pre-login).
 *
 * Se accede desde el botón "Configurar Servidor" en la pantalla de login.
 * Al guardar, navega de vuelta al login.
 */
import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
    getServerConfig, saveServerConfig, buildApiUrl,
    ServerConfig,
} from '@/services/serverConfig';
import axios from 'axios';

export default function ServerSetupScreen() {
    const router = useRouter();
    const [host, setHost] = useState('');
    const [port, setPort] = useState('3000');
    const [useHttps, setUseHttps] = useState(false);
    const [apiPath, setApiPath] = useState('/api');
    const [testing, setTesting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testResult, setTestResult] = useState<'ok' | 'error' | null>(null);
    const [errorDetail, setErrorDetail] = useState<string | null>(null);

    // Cargar config guardada
    useEffect(() => {
        getServerConfig().then((cfg) => {
            if (cfg) {
                setHost(cfg.host);
                setPort(cfg.port);
                setUseHttps(cfg.protocol === 'https');
                setApiPath(cfg.apiPath);
            }
        });
    }, []);

    const buildConfig = (): ServerConfig => ({
        host,
        port,
        protocol: useHttps ? 'https' : 'http',
        apiPath,
    });

    const handleTest = async () => {
        if (!host) {
            Alert.alert('Error', 'Ingresa el host del servidor');
            return;
        }
        setTesting(true);
        setTestResult(null);
        setErrorDetail(null);
        try {
            const url = buildApiUrl(buildConfig());
            // Prueba el health check del backend
            const response = await axios.get(`${url}/health`, { timeout: 8000 });
            setTestResult('ok');
        } catch (err: any) {
            setTestResult('error');
            let det = '';
            if (err.response) {
                det = `Respuesta del servidor: ${err.response.status} - ${JSON.stringify(err.response.data)}`;
            } else if (err.request) {
                det = `Sin respuesta del servidor. Verifica que la IP ${host} sea accesible y el puerto ${port} esté abierto. Error: ${err.message}`;
            } else {
                det = `Error de configuración: ${err.message}`;
            }
            setErrorDetail(det);
        } finally {
            setTesting(false);
        }
    };

    const handleSave = async () => {
        if (!host) {
            Alert.alert('Error', 'El host es requerido');
            return;
        }
        setSaving(true);
        try {
            await saveServerConfig(buildConfig());
            Alert.alert(
                '✅ Guardado',
                `Servidor configurado:\n${buildApiUrl(buildConfig())}`,
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch {
            Alert.alert('Error', 'No se pudo guardar la configuración');
        } finally {
            setSaving(false);
        }
    };

    const previewUrl = host ? buildApiUrl(buildConfig()) : '—';

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Configurar Servidor</Text>
            </View>

            <Text style={styles.description}>
                Configura la dirección del servidor backend antes de iniciar sesión.
                Solo necesitas hacer esto una vez.
            </Text>

            {/* Preview */}
            <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>URL resultante:</Text>
                <Text style={styles.previewUrl} numberOfLines={2}>{previewUrl}</Text>
            </View>

            {/* Formulario */}
            <View style={styles.form}>
                {/* Protocolo */}
                <View style={styles.field}>
                    <Text style={styles.label}>Protocolo</Text>
                    <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>HTTP</Text>
                        <Switch
                            value={useHttps}
                            onValueChange={setUseHttps}
                            trackColor={{ false: '#d1d5db', true: '#6366f1' }}
                            thumbColor={useHttps ? '#fff' : '#fff'}
                        />
                        <Text style={styles.switchLabel}>HTTPS</Text>
                    </View>
                </View>

                {/* Host */}
                <View style={styles.field}>
                    <Text style={styles.label}>Host / IP del servidor *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej: 192.168.1.100 o mi-servidor.com"
                        value={host}
                        onChangeText={setHost}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                    />
                </View>

                {/* Puerto */}
                <View style={styles.field}>
                    <Text style={styles.label}>Puerto</Text>
                    <TextInput
                        style={[styles.input, { maxWidth: 120 }]}
                        placeholder="3000"
                        value={port}
                        onChangeText={setPort}
                        keyboardType="numeric"
                        maxLength={5}
                    />
                </View>

                {/* Path de API */}
                <View style={styles.field}>
                    <Text style={styles.label}>Ruta de la API</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="/api"
                        value={apiPath}
                        onChangeText={setApiPath}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    <Text style={styles.hint}>Normalmente es /api. No cambiar a menos que el servidor lo indique.</Text>
                </View>
            </View>

            {/* Resultado del test */}
            {testResult === 'ok' && (
                <View style={[styles.testResult, styles.testOk]}>
                    <Text style={styles.testResultText}>✅ Conexión exitosa al servidor</Text>
                </View>
            )}
            {testResult === 'error' && (
                <View style={[styles.testResult, styles.testError]}>
                    <Text style={styles.testResultText}>
                        ❌ No se pudo conectar. Verifica la IP, puerto y que el servidor esté activo.
                    </Text>
                    {errorDetail && (
                        <View style={styles.errorLogBox}>
                            <Text style={styles.errorLogTitle}>LOG DE ERROR (Diagnostic):</Text>
                            <Text style={styles.errorLogText}>{errorDetail}</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Botones */}
            <TouchableOpacity
                style={styles.testBtn}
                onPress={handleTest}
                disabled={testing}
            >
                {testing
                    ? <ActivityIndicator color="#6366f1" />
                    : <Text style={styles.testBtnText}>🔌 Probar Conexión</Text>
                }
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
            >
                {saving
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.saveBtnText}>💾 Guardar y Volver al Login</Text>
                }
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    content: { padding: 20, paddingBottom: 40 },

    header: {
        flexDirection: 'row', alignItems: 'center',
        marginBottom: 16, gap: 12,
    },
    backBtn: {
        width: 36, height: 36,
        justifyContent: 'center', alignItems: 'center',
        borderRadius: 18, backgroundColor: '#e5e7eb',
    },
    backBtnText: { fontSize: 20, color: '#374151' },
    title: { fontSize: 22, fontWeight: '700', color: '#111827' },

    description: { fontSize: 14, color: '#6b7280', marginBottom: 20, lineHeight: 20 },

    previewBox: {
        backgroundColor: '#1e293b',
        borderRadius: 10,
        padding: 14,
        marginBottom: 20,
    },
    previewLabel: { color: '#64748b', fontSize: 11, marginBottom: 6, textTransform: 'uppercase' },
    previewUrl: { color: '#a5b4fc', fontSize: 13, fontFamily: 'monospace', fontWeight: '600' },

    form: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        gap: 16,
    },
    field: { gap: 6 },
    label: { fontSize: 13, fontWeight: '600', color: '#374151' },
    hint: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
    input: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#1f2937',
        backgroundColor: '#fafafa',
    },
    switchRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    switchLabel: { fontSize: 14, color: '#4b5563', fontWeight: '600' },

    testResult: { borderRadius: 10, padding: 12, marginBottom: 12 },
    testOk: { backgroundColor: '#dcfce7' },
    testError: { backgroundColor: '#fee2e2' },
    testResultText: { fontSize: 13, fontWeight: '600' },

    errorLogBox: {
        marginTop: 10,
        padding: 8,
        backgroundColor: '#fff',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    errorLogTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#b91c1c',
        marginBottom: 4,
    },
    errorLogText: {
        fontSize: 11,
        color: '#7f1d1d',
        fontFamily: 'monospace',
    },

    testBtn: {
        borderWidth: 2, borderColor: '#6366f1',
        borderRadius: 10, paddingVertical: 13,
        alignItems: 'center', marginBottom: 10,
    },
    testBtnText: { color: '#6366f1', fontSize: 15, fontWeight: '700' },

    saveBtn: {
        backgroundColor: '#6366f1',
        borderRadius: 10, paddingVertical: 14,
        alignItems: 'center',
    },
    saveBtnDisabled: { backgroundColor: '#a5b4fc' },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
