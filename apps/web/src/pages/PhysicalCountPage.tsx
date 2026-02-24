import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface CountItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  systemQty: number;
  countedQty: number;
  variance: number;
  variancePercent: number;
  notes: string;
}

interface CountSummary {
  totalItems: number;
  itemsCounted: number;
  itemsNotCounted: number;
  itemsWithVariance: number;
}

interface PhysicalCount {
  id: string;
  countCode: string;
  status: string;
  warehouseId: string;
  createdAt: string;
}

interface VarianceSummary {
  totalVariance: number;
  totalVariancePercent: number;
  overages: number;
  shortages: number;
  topVariances: CountItem[];
}

export function PhysicalCountPage() {
  const { countId } = useParams<{ countId: string }>();
  const navigate = useNavigate();

  const [count, setCount] = useState<PhysicalCount | null>(null);
  const [items, setItems] = useState<CountItem[]>([]);
  const [summary, setSummary] = useState<CountSummary | null>(null);
  const [varianceSummary, setVarianceSummary] = useState<VarianceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [completing, setCompleting] = useState(false);
  const [showVariances, setShowVariances] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCountData();
  }, [countId]);

  const loadCountData = async () => {
    if (!countId) return;
    try {
      setLoading(true);
      setError(null);

      // Load items and count info
      const itemsRes = await fetch(`/api/inventory/counts/${countId}/items`);
      if (!itemsRes.ok) throw new Error('Failed to load count items');
      const itemsData = await itemsRes.json();

      setCount(itemsData.count);
      setItems(itemsData.items);
      setSummary(itemsData.summary);

      // Load variance summary
      const varianceRes = await fetch(`/api/inventory/counts/${countId}/variances`);
      if (varianceRes.ok) {
        const varianceData = await varianceRes.json();
        setVarianceSummary(varianceData);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load count data';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = async (itemId: string) => {
    if (!countId) return;
    try {
      setUpdating(itemId);
      const res = await fetch(`/api/inventory/counts/${countId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countedQty: editValue,
          notes: notes,
        }),
      });

      if (!res.ok) throw new Error('Failed to update item');

      const updated = await res.json();
      setItems(items.map(item => (item.itemId === itemId ? updated : item)));
      setEditingId(null);
      setEditValue(0);
      setNotes('');

      // Reload variance summary
      const varianceRes = await fetch(`/api/inventory/counts/${countId}/variances`);
      if (varianceRes.ok) {
        const varianceData = await varianceRes.json();
        setVarianceSummary(varianceData);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update item';
      setError(message);
    } finally {
      setUpdating(null);
    }
  };

  const handleCompleteCount = async () => {
    if (!countId) return;

    if (summary && summary.itemsNotCounted > 0) {
      setError(`Cannot complete count. ${summary.itemsNotCounted} items not counted yet.`);
      return;
    }

    try {
      setCompleting(true);
      const res = await fetch(`/api/inventory/counts/${countId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error('Failed to complete count');

      setError(null);
      alert('Count completed successfully');
      navigate(`/inventory/counts/${countId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete count';
      setError(message);
    } finally {
      setCompleting(false);
    }
  };

  const handleDiscardCount = async () => {
    if (!countId) return;

    if (!confirm('Are you sure you want to discard this count? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/inventory/counts/${countId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to discard count');

      setError(null);
      alert('Count discarded');
      navigate('/inventory/counts');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to discard count';
      setError(message);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingMessage}>Loading count data...</div>
      </div>
    );
  }

  if (!count) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>Count not found</div>
        <button style={styles.button} onClick={() => navigate('/inventory/counts')}>
          Back to Counts
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1>Physical Count: {count.countCode}</h1>
          <p style={{ color: '#666', marginTop: '4px' }}>Status: {count.status}</p>
        </div>
        <div style={styles.headerButtons}>
          <button
            style={{ ...styles.button, ...styles.secondaryButton }}
            onClick={() => setShowVariances(!showVariances)}
          >
            {showVariances ? 'Hide' : 'Show'} Variances
          </button>
          {count.status !== 'COMPLETED' && (
            <>
              <button
                style={{ ...styles.button, ...styles.primaryButton }}
                onClick={handleCompleteCount}
                disabled={completing || (summary?.itemsNotCounted ?? 0) > 0}
              >
                {completing ? 'Completing...' : 'Complete Count'}
              </button>
              <button style={{ ...styles.button, ...styles.dangerButton }} onClick={handleDiscardCount}>
                Discard
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {summary && (
        <div style={styles.summaryBox}>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Total Items:</span>
            <span style={styles.summaryValue}>{summary.totalItems}</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Counted:</span>
            <span style={{ ...styles.summaryValue, color: '#22c55e' }}>{summary.itemsCounted}</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Not Counted:</span>
            <span style={{ ...styles.summaryValue, color: '#ef4444' }}>{summary.itemsNotCounted}</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>With Variance:</span>
            <span style={{ ...styles.summaryValue, color: '#f59e0b' }}>{summary.itemsWithVariance}</span>
          </div>
        </div>
      )}

      {showVariances && varianceSummary && (
        <div style={styles.varianceBox}>
          <h3>Variance Summary</h3>
          <div style={styles.varianceStats}>
            <div>
              <span style={styles.varianceLabel}>Total Variance:</span>
              <span style={styles.varianceValue}>{varianceSummary.totalVariance.toFixed(2)}</span>
              <span style={styles.variancePercent}>({varianceSummary.totalVariancePercent.toFixed(2)}%)</span>
            </div>
            <div>
              <span style={styles.varianceLabel}>Overages:</span>
              <span style={{ ...styles.varianceValue, color: '#ef4444' }}>
                {varianceSummary.overages.toFixed(2)}
              </span>
            </div>
            <div>
              <span style={styles.varianceLabel}>Shortages:</span>
              <span style={{ ...styles.varianceValue, color: '#3b82f6' }}>
                {varianceSummary.shortages.toFixed(2)}
              </span>
            </div>
          </div>

          {varianceSummary.topVariances.length > 0 && (
            <div style={styles.topVariances}>
              <h4>Top Variances</h4>
              <table style={styles.varianceTable}>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>System Qty</th>
                    <th>Counted Qty</th>
                    <th>Variance</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {varianceSummary.topVariances.slice(0, 10).map(item => (
                    <tr key={item.itemId}>
                      <td>{item.itemCode}</td>
                      <td>{item.itemName}</td>
                      <td>{item.systemQty}</td>
                      <td>{item.countedQty}</td>
                      <td style={{ color: item.variance > 0 ? '#ef4444' : '#3b82f6' }}>
                        {item.variance > 0 ? '+' : ''}{item.variance.toFixed(2)}
                      </td>
                      <td>{item.variancePercent.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div style={styles.itemsContainer}>
        <h3>Items to Count</h3>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>System Qty</th>
              <th>Counted Qty</th>
              <th>Variance</th>
              <th>%</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.itemId}>
                <td>{item.itemCode}</td>
                <td>{item.itemName}</td>
                <td>{item.systemQty}</td>
                <td>
                  {editingId === item.itemId ? (
                    <input
                      type="number"
                      min="0"
                      value={editValue}
                      onChange={e => setEditValue(parseFloat(e.target.value) || 0)}
                      style={styles.input}
                      autoFocus
                    />
                  ) : (
                    <span>{item.countedQty > 0 ? item.countedQty : '-'}</span>
                  )}
                </td>
                <td
                  style={{
                    color: item.countedQty === 0 ? '#999' : item.variance > 0 ? '#ef4444' : item.variance < 0 ? '#3b82f6' : '#22c55e',
                  }}
                >
                  {item.countedQty === 0 ? '-' : `${item.variance > 0 ? '+' : ''}${item.variance.toFixed(2)}`}
                </td>
                <td>
                  {item.countedQty === 0 ? '-' : `${item.variancePercent.toFixed(2)}%`}
                </td>
                <td>{item.notes || '-'}</td>
                <td>
                  {editingId === item.itemId ? (
                    <div style={styles.actionButtons}>
                      <button
                        style={{ ...styles.smallButton, ...styles.primaryButton }}
                        onClick={() => handleUpdateItem(item.itemId)}
                        disabled={updating === item.itemId}
                      >
                        {updating === item.itemId ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        style={{ ...styles.smallButton, ...styles.secondaryButton }}
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      style={{ ...styles.smallButton, ...styles.primaryButton }}
                      onClick={() => {
                        setEditingId(item.itemId);
                        setEditValue(item.countedQty);
                        setNotes(item.notes);
                      }}
                    >
                      Count
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={styles.footer}>
        <button style={styles.button} onClick={() => navigate('/inventory/counts')}>
          Back to Counts
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #e5e7eb',
  } as React.CSSProperties,
  headerButtons: {
    display: 'flex',
    gap: '10px',
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
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
  } as React.CSSProperties,
  varianceBox: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    border: '1px solid #fcd34d',
  } as React.CSSProperties,
  varianceStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
    marginBottom: '15px',
  } as React.CSSProperties,
  varianceLabel: {
    fontSize: '14px',
    color: '#666',
    display: 'block',
    marginBottom: '5px',
  } as React.CSSProperties,
  varianceValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
  } as React.CSSProperties,
  variancePercent: {
    fontSize: '14px',
    color: '#666',
    marginLeft: '5px',
  } as React.CSSProperties,
  topVariances: {
    marginTop: '15px',
  } as React.CSSProperties,
  varianceTable: {
    width: '100%',
    marginTop: '10px',
    borderCollapse: 'collapse',
    fontSize: '14px',
  } as React.CSSProperties,
  itemsContainer: {
    marginBottom: '20px',
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
    marginTop: '10px',
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
  dangerButton: {
    backgroundColor: '#ef4444',
    color: 'white',
  } as React.CSSProperties,
  smallButton: {
    padding: '6px 12px',
    fontSize: '13px',
  } as React.CSSProperties,
  actionButtons: {
    display: 'flex',
    gap: '5px',
  } as React.CSSProperties,
  input: {
    width: '80px',
    padding: '6px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
  } as React.CSSProperties,
  footer: {
    display: 'flex',
    justifyContent: 'flex-start',
    gap: '10px',
    marginTop: '20px',
    paddingTop: '15px',
    borderTop: '1px solid #e5e7eb',
  } as React.CSSProperties,
  errorBox: {
    padding: '12px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    border: '1px solid #fecaca',
    marginBottom: '15px',
  } as React.CSSProperties,
  loadingMessage: {
    padding: '20px',
    textAlign: 'center',
    color: '#666',
  } as React.CSSProperties,
};
