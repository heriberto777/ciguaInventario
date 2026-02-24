import React from 'react';
import { Button } from '@/components/atoms/Button';

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  userName: string | null;
  oldValue: any;
  newValue: any;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditLogsTableProps {
  logs: AuditLog[];
  isLoading?: boolean;
  onViewDetail?: (log: AuditLog) => void;
}

export const AuditLogsTable: React.FC<AuditLogsTableProps> = ({
  logs,
  isLoading = false,
  onViewDetail,
}) => {
  if (isLoading) {
    return <div className="text-center py-8">Loading audit logs...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No audit logs found.
      </div>
    );
  }

  const getActionColor = (action: string) => {
    if (action.startsWith('CREATE')) return 'bg-green-100 text-green-800';
    if (action.startsWith('UPDATE')) return 'bg-blue-100 text-blue-800';
    if (action.startsWith('DELETE')) return 'bg-red-100 text-red-800';
    if (action.startsWith('TOGGLE')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="px-4 py-3 font-semibold">Action</th>
            <th className="px-4 py-3 font-semibold">Resource</th>
            <th className="px-4 py-3 font-semibold">User</th>
            <th className="px-4 py-3 font-semibold">IP Address</th>
            <th className="px-4 py-3 font-semibold">Date</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3">
                <span
                  className={`inline-block text-xs font-semibold px-2 py-1 rounded ${getActionColor(
                    log.action
                  )}`}
                >
                  {log.action}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600">
                {log.resource} ({log.resourceId.substring(0, 8)}...)
              </td>
              <td className="px-4 py-3 text-gray-600">
                {log.userName || '-'}
              </td>
              <td className="px-4 py-3 font-mono text-xs">
                {log.ipAddress || '-'}
              </td>
              <td className="px-4 py-3 text-xs">
                {new Date(log.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                {onViewDetail && (
                  <Button
                    variant="secondary"
                    onClick={() => onViewDetail(log)}
                    className="text-xs py-1 px-2"
                  >
                    View
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
