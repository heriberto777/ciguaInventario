import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/templates/AdminLayout';
import { AuditLogsTable } from '@/components/organisms/AuditLogsTable';
import { Button } from '@/components/atoms/Button';
import { getApiClient } from '@/services/api';

interface AuditLog {
  id: string;
  companyId: string;
  userId: string | null;
  userName: string | null;
  action: string;
  resource: string;
  resourceId: string;
  oldValue: any;
  newValue: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface AuditLogsResponse {
  data: AuditLog[];
  pagination: {
    skip: number;
    take: number;
    total: number;
  };
}

interface Stats {
  totalLogs: number;
  actions: Record<string, number>;
  resourceTypes: Record<string, number>;
  topUsers: Array<{ userId: string; userName: string; count: number }>;
}

const ITEMS_PER_PAGE = 20;

export function AuditLogsContent() {
  const [currentPage, setCurrentPage] = useState(0);
  const [action, setAction] = useState('');
  const [resource, setResource] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Fetch audit logs
  const { data: logsData, isLoading: logsLoading } = useQuery<AuditLogsResponse>(
    {
      queryKey: ['audit-logs', currentPage, action, resource],
      queryFn: async () => {
        const params = new URLSearchParams({
          skip: (currentPage * ITEMS_PER_PAGE).toString(),
          take: ITEMS_PER_PAGE.toString(),
          ...(action && { action }),
          ...(resource && { resourceType: resource }),
        });
        const response = await getApiClient().get(`/audit-logs?${params}`);
        return response.data;
      },
    }
  );

  // Fetch stats
  const { data: stats } = useQuery<Stats>({
    queryKey: ['audit-logs-stats'],
    queryFn: async () => {
      const response = await getApiClient().get('/audit-logs/stats');
      return response.data;
    },
  });

  const totalPages = logsData
    ? Math.ceil(logsData.pagination.total / ITEMS_PER_PAGE)
    : 0;

  return (
    <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600 mt-1">
            View and analyze all system activities
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Total Logs</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {stats.totalLogs.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Actions</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {Object.keys(stats.actions).length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Resources</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {Object.keys(stats.resourceTypes).length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Top User Activity</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {stats.topUsers[0]?.count || 0}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Action
              </label>
              <select
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setCurrentPage(0);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Actions</option>
                {stats &&
                  Object.keys(stats.actions).map((act) => (
                    <option key={act} value={act}>
                      {act}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Resource
              </label>
              <select
                value={resource}
                onChange={(e) => {
                  setResource(e.target.value);
                  setCurrentPage(0);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Resources</option>
                {stats &&
                  Object.keys(stats.resourceTypes).map((res) => (
                    <option key={res} value={res}>
                      {res}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold">Log Details</h2>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Action</p>
                    <p className="font-mono text-sm">{selectedLog.action}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Resource</p>
                    <p className="font-mono text-sm">
                      {selectedLog.resource} (ID: {selectedLog.resourceId})
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">User</p>
                    <p className="font-mono text-sm">
                      {selectedLog.userName || 'System'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">IP Address</p>
                    <p className="font-mono text-sm">
                      {selectedLog.ipAddress || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Timestamp</p>
                    <p className="font-mono text-sm">
                      {new Date(selectedLog.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {selectedLog.oldValue && (
                    <div>
                      <p className="text-sm text-gray-600">Previous Value</p>
                      <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(selectedLog.oldValue, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.newValue && (
                    <div>
                      <p className="text-sm text-gray-600">New Value</p>
                      <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(selectedLog.newValue, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow">
          <AuditLogsTable
            logs={logsData?.data || []}
            isLoading={logsLoading}
            onViewDetail={setSelectedLog}
          />
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
            >
              Previous
            </Button>
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`px-3 py-2 rounded ${
                    currentPage === i
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              {totalPages > 5 && <span className="px-2">...</span>}
            </div>
            <Button
              variant="secondary"
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    );
}

export function AuditLogsPage() {
  return (
    <AdminLayout>
      <AuditLogsContent />
    </AdminLayout>
  );
}
