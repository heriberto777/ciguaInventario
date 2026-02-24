import { Card } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { useTestMapping } from '@/hooks/useApi';
import { useState } from 'react';
import { Table } from '@/components/molecules/Table';

interface ConnectionTestPanelProps {
  mappingId: string;
}

export function ConnectionTestPanel({ mappingId }: ConnectionTestPanelProps) {
  const { mutate: testMapping, isLoading, data: result } = useTestMapping();
  const [error, setError] = useState<string | null>(null);

  const handleTest = () => {
    setError(null);
    testMapping(
      { mappingId, limitRows: 10 },
      {
        onError: (err: any) => {
          setError(err.response?.data?.error?.message || 'Test failed');
        },
      }
    );
  };

  const columns = result?.data?.[0]
    ? Object.keys(result.data[0]).map((key) => ({
        header: key,
        key: key as any,
      }))
    : [];

  return (
    <Card title="Test Connection">
      <div className="space-y-4">
        <Button onClick={handleTest} disabled={isLoading}>
          {isLoading ? 'Testing...' : 'Run Test'}
        </Button>

        {error && (
          <div className="p-3 bg-red-100 text-red-800 rounded-md">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Execution time: {result.executionTimeMs}ms | Rows: {result.rowCount}
            </p>
            {result.data.length > 0 && (
              <Table columns={columns} data={result.data} />
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
