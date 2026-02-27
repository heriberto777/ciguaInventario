import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface SyncableItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  systemQty: number;
  countedQty: number;
  variance: number;
  variancePercent: number;
}

interface SyncRequest {
  countId: string;
  countCode: string;
  warehouseId: string;
  warehouseName: string;
  erpTableName: string;
  quantityField: string;
  itemsToSync: SyncableItem[];
  totalVariance: number;
  totalItems: number;
}

interface SyncDetail {
  itemCode: string;
  itemName: string;
  systemQty: number;
  countedQty: number;
  variance: number;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
}

interface SyncHistoryItem {
  id: string;
  status: string;
  itemsSynced: number;
  itemsFailed: number;
  totalItems: number;
  successRate: string;
  strategy: string;
  syncedAt: string;
  duration: string;
}

export function SyncToERPPage() {
  const { countId } = useParams<{ countId: string }>();
  const navigate = useNavigate();

  const [syncRequest, setSyncRequest] = useState<SyncRequest | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [validating, setValidating] = useState(true);
  const [canSync, setCanSync] = useState(false);
  const [syncReason, setSyncReason] = useState<string | null>(null);
  const [updateStrategy, setUpdateStrategy] = useState<'REPLACE' | 'ADD'>('REPLACE');
  const [syncResult, setSyncResult] = useState<{
    itemsSynced: number;
    itemsFailed: number;
    details: SyncDetail[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [mappings, setMappings] = useState<any[]>([]);
  const [selectedMappingId, setSelectedMappingId] = useState<string>('');

  useEffect(() => {
    validateAndLoadData();
  }, [countId]);

  const validateAndLoadData = async () => {
    if (!countId) return;
    try {
      setValidating(true);
      setError(null);

      // Validar que se puede sincronizar
      const validateRes = await fetch(`/api/inventory/counts/${countId}/validate-sync`);
      const validateData = await validateRes.json();

      setCanSync(validateData.canSync);
      if (!validateData.canSync) {
        setSyncReason(validateData.reason);
      }

      if (validateData.canSync) {
        // Cargar items sincronizables
        const itemsRes = await fetch(`/api/inventory/counts/${countId}/syncable-items`);
        if (!itemsRes.ok) throw new Error('Failed to load syncable items');
        const itemsData = await itemsRes.json();
        setSyncRequest(itemsData);
      }

      // Cargar historial
      const historyRes = await fetch(`/api/inventory/counts/${countId}/sync-history`);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setSyncHistory(historyData.syncs || []);
      }
      // Cargar mapeos de destino
      const mappingsRes = await fetch('/api/config-mapping?datasetType=DESTINATION');
      if (mappingsRes.ok) {
        const mappingsData = await mappingsRes.json();
        setMappings(mappingsData.data || []);
        if (mappingsData.data?.length > 0) {
          setSelectedMappingId(mappingsData.data[0].id);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
    } finally {
      setValidating(false);
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!countId) return;

    try {
      setSyncing(true);
      setError(null);
      setSyncResult(null);

      const res = await fetch(`/api/inventory/counts/${countId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updateStrategy,
          mappingId: selectedMappingId || undefined
        }),
      });

      if (!res.ok) throw new Error('Failed to sync to ERP');

      const data = await res.json();
      setSyncResult({
        itemsSynced: data.itemsSynced,
        itemsFailed: data.itemsFailed,
        details: data.details,
      });

      // Recargar historial
      await validateAndLoadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync to ERP';
      setError(message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading || validating) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingMessage}>Validating sync requirements...</div>
      </div>
    );
  }
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Sync to ERP</h1>
        <button style={styles.button} onClick={() => navigate(`/inventory/counts`)}>
          Back to Count
        </button>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {!canSync && (
        <div style={styles.warningBox}>
          <strong>Cannot sync:</strong> {syncReason}
          <br />
          {syncRequest && (
            <span style={{ fontSize: '14px', marginTop: '8px', display: 'block' }}>
              Items with variance: {syncRequest.itemsToSync.length}
            </span>
          )}
        </div>
      )}

      {canSync && syncRequest && syncResult === null && (
        <div style={styles.syncPanel}>
          <h3>Ready to Sync</h3>

          <div style={styles.summaryBox}>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Count Code:</span>
              <span style={styles.summaryValue}>{syncRequest.countCode}</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Warehouse:</span>
              <span style={styles.summaryValue}>{syncRequest.warehouseName}</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Items to Sync:</span>
              <span style={styles.summaryValue}>{syncRequest.itemsToSync.length}</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Total Variance:</span>
              <span style={{ ...styles.summaryValue, color: syncRequest.totalVariance > 0 ? '#ef4444' : '#3b82f6' }}>
                {syncRequest.totalVariance > 0 ? '+' : ''}{syncRequest.totalVariance.toFixed(2)}
              </span>
            </div>
          </div>

          <div style={styles.strategyBox}>
            <h4>Update Strategy</h4>
            <div style={styles.radioGroup}>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  value="REPLACE"
                  checked={updateStrategy === 'REPLACE'}
                  onChange={e => setUpdateStrategy(e.target.value as 'REPLACE' | 'ADD')}
                />
                <span style={{ marginLeft: '8px' }}>
                  <strong>REPLACE:</strong> Set quantity to counted amount
                </span>
              </label>
              <p style={{ marginLeft: '28px', fontSize: '13px', color: '#666', marginTop: '4px' }}>
                New Qty = Counted Qty
              </p>
            </div>

            <div style={styles.radioGroup}>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  value="ADD"
                  checked={updateStrategy === 'ADD'}
                  onChange={e => setUpdateStrategy(e.target.value as 'REPLACE' | 'ADD')}
                />
                <span style={{ marginLeft: '8px' }}>
                  <strong>ADD:</strong> Add variance to current quantity
                </span>
              </label>
              <p style={{ marginLeft: '28px', fontSize: '13px', color: '#666', marginTop: '4px' }}>
                New Qty = System Qty + Variance
              </p>
            </div>
          </div>

          <div style={styles.mappingBox}>
            <h4>Export Mapping (Destination)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <select
                style={styles.select}
                value={selectedMappingId}
                onChange={e => setSelectedMappingId(e.target.value)}
              >
                <option value="">-- Select Mapping (Default UPDATE) --</option>
                {mappings.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.erpTableName} (v{m.version})
                  </option>
                ))}
              </select>
              <p style={{ fontSize: '12px', color: '#666' }}>
                {selectedMappingId
                  ? "Uses dynamic INSERT based on selected mapping."
                  : "Uses standard UPDATE flow (requires default mapping)."}
              </p>
            </div>
          </div>

          <div style={styles.itemsTable}>
            <h4>Items to Sync ({syncRequest.itemsToSync.length})</h4>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>System</th>
                  <th>Counted</th>
                  <th>Variance</th>
                </tr>
              </thead>
              <tbody>
                {syncRequest.itemsToSync.map(item => (
                  <tr key={item.itemId}>
                    <td>{item.itemCode}</td>
                    <td>{item.itemName}</td>
                    <td>{item.systemQty}</td>
                    <td>{item.countedQty}</td>
                    <td style={{ color: item.variance > 0 ? '#ef4444' : '#3b82f6', fontWeight: 'bold' }}>
                      {item.variance > 0 ? '+' : ''}{item.variance.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.actionBox}>
            <button
              style={{ ...styles.button, ...styles.primaryButton, width: '200px' }}
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? 'Syncing...' : 'Start Sync'}
            </button>
            <button
              style={{ ...styles.button, ...styles.secondaryButton }}
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? 'Hide' : 'Show'} History
            </button>
          </div>
        </div>
      )}

      {syncResult && (
        <div style={styles.resultPanel}>
          <h3>Sync Result</h3>

          <div style={styles.resultSummary}>
            <div style={styles.resultItem}>
              <span style={styles.resultLabel}>Items Synced:</span>
              <span style={{ ...styles.resultValue, color: '#22c55e' }}>{syncResult.itemsSynced}</span>
            </div>
            <div style={styles.resultItem}>
              <span style={styles.resultLabel}>Items Failed:</span>
              <span style={{ ...styles.resultValue, color: syncResult.itemsFailed > 0 ? '#ef4444' : '#22c55e' }}>
                {syncResult.itemsFailed}
              </span>
            </div>
            <div style={styles.resultItem}>
              <span style={styles.resultLabel}>Success Rate:</span>
              <span style={styles.resultValue}>
                {((syncResult.itemsSynced / (syncResult.itemsSynced + syncResult.itemsFailed)) * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div style={styles.detailsBox}>
            <h4>Sync Details</h4>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>System</th>
                  <th>Counted</th>
                  <th>Variance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {syncResult.details.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.itemCode}</td>
                    <td>{item.itemName}</td>
                    <td>{item.systemQty}</td>
                    <td>{item.countedQty}</td>
                    <td style={{ color: item.variance > 0 ? '#ef4444' : '#3b82f6', fontWeight: 'bold' }}>
                      {item.variance > 0 ? '+' : ''}{item.variance.toFixed(2)}
                    </td>
                    <td
                      style={{
                        color: item.status === 'SUCCESS' ? '#22c55e' : '#ef4444',
                        fontWeight: 'bold',
                      }}
                    >
                      {item.status}
                      {item.errorMessage && <div style={{ fontSize: '12px', color: '#666' }}>{item.errorMessage}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.actionBox}>
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={() => navigate(`/inventory/counts/${countId}`)}
            >
              View Count
            </button>
            <button
              style={{ ...styles.button, ...styles.secondaryButton }}
              onClick={() => {
                setSyncResult(null);
                validateAndLoadData();
              }}
            >
              Sync Again
            </button>
          </div>
        </div>
      )}

      {showHistory && syncHistory.length > 0 && (
        <div style={styles.historyPanel}>
          <h3>Sync History</h3>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Synced</th>
                <th>Failed</th>
                <th>Total</th>
                <th>Success Rate</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {syncHistory.map(sync => (
                <tr key={sync.id}>
                  <td>{new Date(sync.syncedAt).toLocaleString()}</td>
                  <td
                    style={{
                      color: sync.status === 'COMPLETED' ? '#22c55e' : '#f59e0b',
                      fontWeight: 'bold',
                    }}
                  >
                    {sync.status}
                  </td>
                  <td>{sync.itemsSynced}</td>
                  <td style={{ color: sync.itemsFailed > 0 ? '#ef4444' : '#22c55e' }}>{sync.itemsFailed}</td>
                  <td>{sync.totalItems}</td>
                  <td>{sync.successRate}</td>
                  <td>{sync.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #e5e7eb',
  } as React.CSSProperties,
  summaryBox: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  } as React.CSSProperties,
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  } as React.CSSProperties,
  summaryLabel: {
    fontSize: '14px',
    color: '#666',
    fontWeight: '600',
  } as React.CSSProperties,
  summaryValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
  } as React.CSSProperties,
  syncPanel: {
    padding: '15px',
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
    border: '1px solid #bfdbfe',
    marginBottom: '20px',
  } as React.CSSProperties,
  mappingBox: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#fff7ed',
    borderRadius: '6px',
    border: '1px solid #fed7aa',
  } as React.CSSProperties,
  select: {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    width: '100%',
    backgroundColor: 'white',
  } as React.CSSProperties,
  strategyBox: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  } as React.CSSProperties,
  radioGroup: {
    marginBottom: '12px',
  } as React.CSSProperties,
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  } as React.CSSProperties,
  itemsTable: {
    marginBottom: '20px',
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
    marginTop: '10px',
    border: '1px solid #e5e7eb',
  } as React.CSSProperties,
  resultPanel: {
    padding: '15px',
    backgroundColor: '#f0fdf4',
    borderRadius: '8px',
    border: '1px solid #bbf7d0',
    marginBottom: '20px',
  } as React.CSSProperties,
  resultSummary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
    marginBottom: '20px',
  } as React.CSSProperties,
  resultItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  } as React.CSSProperties,
  resultLabel: {
    fontSize: '14px',
    color: '#666',
    fontWeight: '600',
  } as React.CSSProperties,
  resultValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
  } as React.CSSProperties,
  detailsBox: {
    marginBottom: '20px',
  } as React.CSSProperties,
  historyPanel: {
    padding: '15px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    marginBottom: '20px',
  } as React.CSSProperties,
  actionBox: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-start',
  } as React.CSSProperties,
  button: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
  } as React.CSSProperties,
  primaryButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
  } as React.CSSProperties,
  secondaryButton: {
    backgroundColor: '#6b7280',
    color: 'white',
  } as React.CSSProperties,
  errorBox: {
    padding: '12px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    border: '1px solid #fecaca',
    marginBottom: '15px',
  } as React.CSSProperties,
  warningBox: {
    padding: '12px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '6px',
    border: '1px solid #fcd34d',
    marginBottom: '15px',
  } as React.CSSProperties,
  loadingMessage: {
    padding: '20px',
    textAlign: 'center',
    color: '#666',
  } as React.CSSProperties,
};
