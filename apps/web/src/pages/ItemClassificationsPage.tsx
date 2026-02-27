import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { getApiClient } from '@/services/api';

const apiClient = getApiClient();

// ─── Tipos ───────────────────────────────────────────────────
type GroupType = 'CATEGORY' | 'SUBCATEGORY' | 'BRAND' | 'OTHER';

interface Classification {
    id: string;
    code: string;
    description: string;
    groupType: GroupType;
    groupNumber: number;
    isActive: boolean;
}

const GROUP_LABELS: Record<GroupType, string> = {
    CATEGORY: 'Categoría',
    SUBCATEGORY: 'Subcategoría',
    BRAND: 'Marca',
    OTHER: 'Otro',
};

const GROUP_COLORS: Record<GroupType, { bg: string; text: string }> = {
    CATEGORY: { bg: '#eff6ff', text: '#1d4ed8' },
    SUBCATEGORY: { bg: '#f0fdf4', text: '#15803d' },
    BRAND: { bg: '#fdf4ff', text: '#7e22ce' },
    OTHER: { bg: '#f9fafb', text: '#4b5563' },
};

const ALL_TABS: Array<{ key: GroupType | 'ALL'; label: string }> = [
    { key: 'ALL', label: 'Todos' },
    { key: 'CATEGORY', label: 'Categorías' },
    { key: 'SUBCATEGORY', label: 'Subcategorías' },
    { key: 'BRAND', label: 'Marcas' },
    { key: 'OTHER', label: 'Otros' },
];

// ─── Hooks API ────────────────────────────────────────────────
function useClassifications(groupType?: GroupType) {
    return useQuery({
        queryKey: ['classifications', groupType ?? 'ALL'],
        queryFn: async () => {
            const url = groupType
                ? `/item-classifications?groupType=${groupType}`
                : '/item-classifications';
            const res = await apiClient.get(url);
            return res.data.data as Classification[];
        },
        staleTime: 2 * 60 * 1000,
    });
}

function useCreateClassification() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { code: string; description: string; groupNumber: number }) =>
            apiClient.post('/item-classifications', data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['classifications'] }),
    });
}

function useUpdateClassification() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: { id: string; code: string; description: string; groupNumber: number }) =>
            apiClient.put(`/item-classifications/${id}`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['classifications'] }),
    });
}

function useDeleteClassification() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => apiClient.delete(`/item-classifications/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['classifications'] }),
    });
}

function useBulkImport() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: { items: Array<{ code: string; description: string; groupNumber: number }>; upsert: boolean }) =>
            apiClient.post('/item-classifications/bulk', payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['classifications'] }),
    });
}

// ─── Modal CRUD ───────────────────────────────────────────────
function useSyncFromItems() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => apiClient.post('/item-classifications/sync-from-items'),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['classifications'] }),
    });
}

interface CrudModalProps {
    item?: Classification | null;
    onClose: () => void;
    onCreate: ReturnType<typeof useCreateClassification>;
    onUpdate: ReturnType<typeof useUpdateClassification>;
}

function CrudModal({ item, onClose, onCreate, onUpdate }: CrudModalProps) {
    const isEdit = !!item;
    const [code, setCode] = useState(item?.code ?? '');
    const [description, setDesc] = useState(item?.description ?? '');
    const [groupNumber, setGroupNum] = useState(item?.groupNumber ?? 1);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!code.trim() || !description.trim()) {
            setError('Todos los campos son requeridos');
            return;
        }
        try {
            if (isEdit && item) {
                await onUpdate.mutateAsync({ id: item.id, code: code.toUpperCase(), description, groupNumber });
            } else {
                await onCreate.mutateAsync({ code: code.toUpperCase(), description, groupNumber });
            }
            onClose();
        } catch (e: any) {
            setError(e.response?.data?.message ?? 'Error al guardar');
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <div style={styles.modalHeader}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {isEdit ? 'Editar Clasificación' : 'Nueva Clasificación'}
                    </h3>
                    <button onClick={onClose} style={styles.closeBtn}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 20px' }}>
                    {/* Agrupación */}
                    <div>
                        <label style={styles.label}>Agrupación / Tipo</label>
                        <select
                            value={groupNumber}
                            onChange={(e) => setGroupNum(Number(e.target.value))}
                            style={styles.input}
                        >
                            <option value={1}>1 — Categoría</option>
                            <option value={2}>2 — Subcategoría</option>
                            <option value={3}>3 — Marca</option>
                            <option value={4}>4 — Otro</option>
                        </select>
                    </div>

                    {/* Código */}
                    <div>
                        <label style={styles.label}>Código (CLASIFICACION)</label>
                        <input
                            style={styles.input}
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="Ej: C10, M01, G11"
                            maxLength={20}
                        />
                    </div>

                    {/* Descripción */}
                    <div>
                        <label style={styles.label}>Descripción</label>
                        <input
                            style={styles.input}
                            value={description}
                            onChange={(e) => setDesc(e.target.value)}
                            placeholder="Ej: BODY CARE, Palmolive"
                            maxLength={200}
                        />
                    </div>

                    {error && <p style={{ color: 'var(--color-danger)', margin: 0, fontSize: '0.85rem' }}>{error}</p>}
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--border-default)' }}>
                    <button onClick={onClose} style={styles.btnSecondary}>Cancelar</button>
                    <button
                        onClick={handleSubmit}
                        disabled={onCreate.isPending || onUpdate.isPending}
                        style={styles.btnPrimary}
                    >
                        {(onCreate.isPending || onUpdate.isPending) ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Modal de resultado de importación ────────────────────────
function ImportResultModal({ result, onClose }: { result: any; onClose: () => void }) {
    return (
        <div style={styles.overlay}>
            <div style={{ ...styles.modal, maxWidth: 420 }}>
                <div style={styles.modalHeader}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Resultado de Importación
                    </h3>
                    <button onClick={onClose} style={styles.closeBtn}>✕</button>
                </div>
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                        { label: '✅ Creados', value: result.created, color: '#059669' },
                        { label: '🔄 Actualizados', value: result.updated, color: '#d97706' },
                        { label: '⏭ Omitidos', value: result.skipped, color: '#6b7280' },
                        { label: '❌ Errores', value: result.errors?.length ?? 0, color: '#dc2626' },
                        { label: '📊 Total', value: result.total, color: '#1e293b' },
                    ].map(({ label, value, color }) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{label}</span>
                            <strong style={{ color, fontSize: '1rem' }}>{value}</strong>
                        </div>
                    ))}
                    {result.errors?.length > 0 && (
                        <details style={{ marginTop: 8 }}>
                            <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: '#dc2626' }}>
                                Ver errores ({result.errors.length})
                            </summary>
                            <ul style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: 8 }}>
                                {result.errors.slice(0, 10).map((e: any) => (
                                    <li key={e.code}>{e.code}: {e.error}</li>
                                ))}
                            </ul>
                        </details>
                    )}
                </div>
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={styles.btnPrimary}>Cerrar</button>
                </div>
            </div>
        </div>
    );
}

// ─── Página principal ─────────────────────────────────────────
export default function ItemClassificationsPage() {
    const [activeTab, setActiveTab] = useState<GroupType | 'ALL'>('ALL');
    const [search, setSearch] = useState('');
    const [modalItem, setModalItem] = useState<Classification | null | undefined>(undefined); // undefined = cerrado
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [importResult, setImportResult] = useState<any>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const groupFilter = activeTab === 'ALL' ? undefined : activeTab;
    const { data: items = [], isLoading } = useClassifications(groupFilter);

    const createMutation = useCreateClassification();
    const updateMutation = useUpdateClassification();
    const deleteMutation = useDeleteClassification();
    const bulkMutation = useBulkImport();
    const syncMutation = useSyncFromItems();

    // Filtro por búsqueda local
    const filtered = items.filter((item) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return item.code.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    });

    // ── Import Excel ──
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any>(ws);

        // Mapeo flexible de columnas
        const parsed = rows
            .map((r) => {
                const code = r.CLASIFICACION || r.CODIGO || r.CODE || r.SKU;
                const description = r.DESCRIPCION || r.DESCRIPTION || r.NOMBRE || r.NAME || r.DESC;
                const groupNumber = r.AGRUPACION || r.AGRUPACIÓN || r.GROUP || r.TIPO || r.AGRUP;

                if (!code || !description || !groupNumber) return null;

                return {
                    code: String(code).trim().toUpperCase(),
                    description: String(description).trim(),
                    groupNumber: Number(groupNumber),
                };
            })
            .filter((i): i is { code: string; description: string; groupNumber: number } => i !== null);

        if (parsed.length === 0) {
            alert('No se encontraron filas válidas. Asegúrate de que el Excel tenga columnas CLASIFICACION, DESCRIPCION, AGRUPACION.');
            return;
        }

        try {
            const res = await bulkMutation.mutateAsync({ items: parsed, upsert: true });
            setImportResult(res.data.data);
        } catch (e: any) {
            alert('Error al importar: ' + (e.response?.data?.message ?? e.message));
        }

        // Reset el input para permitir reimportar el mismo archivo
        if (fileRef.current) fileRef.current.value = '';
    };

    // ── Delete ──
    const handleDelete = async () => {
        if (!deleteId) return;
        await deleteMutation.mutateAsync(deleteId);
        setDeleteId(null);
    };

    return (
        <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Clasificaciones de Artículos
                    </h1>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Gestiona categorías, subcategorías, marcas y otros grupos
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    {/* Import Excel */}
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                    <button
                        onClick={() => fileRef.current?.click()}
                        disabled={bulkMutation.isPending}
                        style={{ ...styles.btnSecondary, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        {bulkMutation.isPending ? '⏳ Importando...' : '📥 Importar Excel'}
                    </button>
                    <button
                        onClick={async () => {
                            if (confirm('¿Deseas extraer clasificaciones únicas de los artículos existentes?')) {
                                try {
                                    const res = await syncMutation.mutateAsync();
                                    setImportResult(res.data.data);
                                } catch (e: any) {
                                    alert('Error al sincronizar: ' + (e.response?.data?.message ?? e.message));
                                }
                            }
                        }}
                        disabled={syncMutation.isPending}
                        style={{ ...styles.btnSecondary, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        {syncMutation.isPending ? '⏳ Sincronizando...' : '🔄 Sinc. desde Items'}
                    </button>
                    <button
                        onClick={() => setModalItem(null)}
                        style={{ ...styles.btnPrimary, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        + Nueva
                    </button>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border-default)', paddingBottom: 0 }}>
                {ALL_TABS.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key as any)}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '8px 16px', fontSize: '0.875rem', fontWeight: activeTab === key ? 700 : 500,
                            color: activeTab === key ? 'var(--accent-primary)' : 'var(--text-muted)',
                            borderBottom: activeTab === key ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            marginBottom: -1, transition: 'all 0.15s',
                        }}
                    >
                        {label}
                        {key !== 'ALL' && (
                            <span style={{
                                marginLeft: 6, padding: '1px 7px', borderRadius: 10, fontSize: '0.75rem',
                                background: activeTab === key ? 'var(--accent-light)' : 'var(--bg-hover)',
                                color: activeTab === key ? 'var(--accent-primary)' : 'var(--text-muted)',
                            }}>
                                {key === activeTab ? items.length : ''}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Búsqueda ── */}
            <div style={{ marginBottom: 16 }}>
                <input
                    style={{ ...styles.input, maxWidth: 320 }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por código o descripción..."
                />
            </div>

            {/* ── Tabla ── */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-default)', overflow: 'hidden' }}>
                {isLoading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                        No hay clasificaciones. Usa "Importar Excel" o "+ Nueva" para agregar.
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-default)' }}>
                                {['Código', 'Descripción', 'Tipo', 'Agrup.', 'Acciones'].map((h) => (
                                    <th key={h} style={{
                                        padding: '10px 14px', textAlign: 'left',
                                        fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
                                        textTransform: 'uppercase', letterSpacing: '0.05em',
                                    }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((item, idx) => {
                                const colors = GROUP_COLORS[item.groupType];
                                return (
                                    <tr
                                        key={item.id}
                                        style={{
                                            borderBottom: idx < filtered.length - 1 ? '1px solid var(--border-default)' : 'none',
                                        }}
                                    >
                                        <td style={{ padding: '10px 14px' }}>
                                            <span style={{
                                                fontFamily: 'monospace', fontWeight: 700,
                                                fontSize: '0.85rem', color: 'var(--text-primary)',
                                                background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4,
                                            }}>
                                                {item.code}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 14px', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                                            {item.description}
                                        </td>
                                        <td style={{ padding: '10px 14px' }}>
                                            <span style={{
                                                padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                                                background: colors.bg, color: colors.text,
                                            }}>
                                                {GROUP_LABELS[item.groupType]}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                                            {item.groupNumber}
                                        </td>
                                        <td style={{ padding: '10px 14px' }}>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                    onClick={() => setModalItem(item)}
                                                    style={{ ...styles.actionBtn, color: 'var(--accent-primary)' }}
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => setDeleteId(item.id)}
                                                    style={{ ...styles.actionBtn, color: 'var(--color-danger)' }}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 8 }}>
                {filtered.length} clasificaciones
            </p>

            {/* ── Modal CRUD ── */}
            {modalItem !== undefined && (
                <CrudModal
                    item={modalItem}
                    onClose={() => setModalItem(undefined)}
                    onCreate={createMutation}
                    onUpdate={updateMutation}
                />
            )}

            {/* ── Confirmar Delete ── */}
            {deleteId && (
                <div style={styles.overlay}>
                    <div style={{ ...styles.modal, maxWidth: 380 }}>
                        <div style={{ padding: 24, textAlign: 'center' }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
                            <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>¿Eliminar clasificación?</h3>
                            <p style={{ color: 'var(--text-muted)', margin: '0 0 20px', fontSize: '0.875rem' }}>
                                Esta acción es reversible (se desactiva, no se borra físicamente).
                            </p>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                <button onClick={() => setDeleteId(null)} style={styles.btnSecondary}>Cancelar</button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleteMutation.isPending}
                                    style={{ ...styles.btnPrimary, background: 'var(--color-danger)' }}
                                >
                                    {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Import Result ── */}
            {importResult && (
                <ImportResultModal result={importResult} onClose={() => setImportResult(null)} />
            )}
        </div>
    );
}

// ─── Estilos reutilizables (tokens CSS del design system) ─────
const styles = {
    overlay: {
        position: 'fixed' as const, inset: 0,
        background: 'rgba(0,0,0,0.5)', zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    modal: {
        background: 'var(--bg-card)', borderRadius: 14,
        width: '100%', maxWidth: 500,
        boxShadow: 'var(--shadow-xl)',
        maxHeight: '90vh', overflow: 'auto',
    },
    modalHeader: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderBottom: '1px solid var(--border-default)',
    },
    closeBtn: {
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: '1rem', color: 'var(--text-muted)', padding: 4,
    },
    label: {
        display: 'block' as const,
        fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)',
        marginBottom: 6,
    },
    input: {
        width: '100%', padding: '8px 12px', borderRadius: 8,
        border: '1px solid var(--border-default)',
        background: 'var(--bg-input)', color: 'var(--text-primary)',
        fontSize: '0.875rem', outline: 'none',
        boxSizing: 'border-box' as const,
    },
    btnPrimary: {
        padding: '8px 18px', borderRadius: 8,
        background: 'var(--accent-primary)', color: '#fff',
        border: 'none', cursor: 'pointer',
        fontSize: '0.875rem', fontWeight: 600,
    },
    btnSecondary: {
        padding: '8px 18px', borderRadius: 8,
        background: 'var(--bg-hover)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-default)',
        cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
    },
    actionBtn: {
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '4px 8px', borderRadius: 6, fontSize: '0.9rem',
    },
};
