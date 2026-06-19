import { useMappingConfigs } from '@/hooks/useApi';
import { Table } from '@/components/molecules/Table';
import { Card } from '@/components/molecules/Card';

interface PreviewTableProps {
  datasetType?: string;
}

export function PreviewTable({ datasetType }: PreviewTableProps) {
  const { data: mappings, isLoading } = useMappingConfigs(datasetType);

  const columns = [
    { header: 'ID', key: 'id' as const },
    { header: 'Dataset Type', key: 'datasetType' as const },
    { header: 'Version', key: 'version' as const },
    { header: 'Active', key: 'isActive' as const, render: (val: boolean) => val ? '✓' : '✗' },
    {
      header: 'Created',
      key: 'createdAt' as const,
      render: (val: string) => new Date(val).toLocaleDateString(),
    },
  ];

  return (
    <Card title="Mapping Configurations">
      <Table
        columns={columns}
        data={mappings || []}
        loading={isLoading}
        emptyMessage="No mappings found"
      />
    </Card>
  );
}
