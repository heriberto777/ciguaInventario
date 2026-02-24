import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/templates/AdminLayout';
import { ERPConnectionForm } from '@/components/organisms/ERPConnectionForm';
import { ERPConnectionsTable } from '@/components/organisms/ERPConnectionsTable';
import { Button } from '@/components/atoms/Button';
import { getApiClient } from '@/services/api';

interface ERPConnection {
  id: string;
  companyId: string;
  erpType: string;
  host: string;
  port: number;
  database: string;
  username: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ERPConnectionsResponse {
  data: ERPConnection[];
  pagination: {
    skip: number;
    take: number;
    total: number;
  };
}

const ITEMS_PER_PAGE = 10;

export const ERPConnectionsContent: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ERPConnection | null>(null);
  const [erpTypeFilter, setErpTypeFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch ERP connections
  const { data: connectionsData, isLoading: connectionsLoading } =
    useQuery<ERPConnectionsResponse>({
      queryKey: ['erp-connections', currentPage, erpTypeFilter],
      queryFn: async () => {
        const params = new URLSearchParams({
          skip: (currentPage * ITEMS_PER_PAGE).toString(),
          take: ITEMS_PER_PAGE.toString(),
          ...(erpTypeFilter && { erpType: erpTypeFilter }),
        });
        const response = await getApiClient().get(`/erp-connections?${params}`);
        return response.data;
      },
    });

  // Create connection mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      erpType: string;
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
    }) => {
      const response = await getApiClient().post('/erp-connections', data);
      return response.data;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['erp-connections'] });
      setShowForm(false);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error creating connection';
      setError(message);
    },
  });

  // Update connection mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        host?: string;
        port?: number;
        database?: string;
        username?: string;
        password?: string;
      };
    }) => {
      const response = await getApiClient().patch(`/erp-connections/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['erp-connections'] });
      setEditingConnection(null);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error updating connection';
      setError(message);
    },
  });

  // Delete connection mutation
  const deleteMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      await getApiClient().delete(`/erp-connections/${connectionId}`);
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['erp-connections'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error deleting connection';
      setError(message);
    },
  });

  // Toggle connection mutation
  const toggleMutation = useMutation({
    mutationFn: async ({
      id,
      isActive,
    }: {
      id: string;
      isActive: boolean;
    }) => {
      const response = await getApiClient().post(`/erp-connections/${id}/toggle`, {
        isActive,
      });
      return response.data;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['erp-connections'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error toggling connection';
      setError(message);
    },
  });

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: async (data: {
      erpType: string;
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
    }) => {
      const response = await getApiClient().post('/erp-connections/test', data);
      return response.data;
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error testing connection';
      setError(message);
    },
  });

  const handleCreate = async (data: {
    erpType: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  }) => {
    await createMutation.mutateAsync(data);
  };

  const handleUpdate = async (data: {
    erpType: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  }) => {
    if (!editingConnection) return;
    await updateMutation.mutateAsync({
      id: editingConnection.id,
      data: {
        host: data.host !== editingConnection.host ? data.host : undefined,
        port: data.port !== editingConnection.port ? data.port : undefined,
        database:
          data.database !== editingConnection.database ? data.database : undefined,
        username:
          data.username !== editingConnection.username ? data.username : undefined,
        password: data.password ? data.password : undefined,
      },
    });
  };

  const handleDelete = async (connectionId: string) => {
    if (confirm('Are you sure you want to delete this ERP connection? This action cannot be undone.')) {
      await deleteMutation.mutateAsync(connectionId);
    }
  };

  const handleTestConnection = async (data: {
    erpType: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  }): Promise<boolean> => {
    try {
      await testMutation.mutateAsync(data);
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleToggle = async (connectionId: string, isActive: boolean) => {
    await toggleMutation.mutateAsync({ id: connectionId, isActive });
  };

  const totalPages = connectionsData
    ? Math.ceil(connectionsData.pagination.total / ITEMS_PER_PAGE)
    : 0;

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ERP Connections</h1>
            <p className="text-gray-600 mt-1">
              Manage connections to your ERP systems
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingConnection(null);
              setShowForm(!showForm);
              setError(null);
            }}
            disabled={showForm}
          >
            {showForm ? 'Cancel' : 'Add Connection'}
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">Error</h3>
                <p className="text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingConnection
                ? 'Edit ERP Connection'
                : 'Add New ERP Connection'}
            </h2>
            <ERPConnectionForm
              onSubmit={editingConnection ? handleUpdate : handleCreate}
              onTestConnection={handleTestConnection}
              isLoading={
                createMutation.isPending || updateMutation.isPending
              }
              initialData={
                editingConnection
                  ? {
                      erpType: editingConnection.erpType as 'MSSQL' | 'SAP' | 'ORACLE',
                      host: editingConnection.host,
                      port: editingConnection.port,
                      database: editingConnection.database,
                      username: editingConnection.username,
                      password: '',
                    }
                  : undefined
              }
              isEditing={!!editingConnection}
            />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by ERP Type
          </label>
          <select
            value={erpTypeFilter}
            onChange={(e) => {
              setErpTypeFilter(e.target.value);
              setCurrentPage(0);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="MSSQL">Microsoft SQL Server</option>
            <option value="SAP">SAP</option>
            <option value="ORACLE">Oracle Database</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow">
          <ERPConnectionsTable
            connections={connectionsData?.data || []}
            isLoading={connectionsLoading}
            onEdit={(connection) => {
              setEditingConnection(connection);
              setShowForm(true);
            }}
            onDelete={handleDelete}
            onToggle={handleToggle}
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
              {Array.from({ length: totalPages }, (_, i) => (
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

        {/* Status messages */}
        {deleteMutation.isError && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            Error deleting connection. It may be in use by mapping configurations.
          </div>
        )}
        {createMutation.isError && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            Error creating connection. Please check your credentials.
          </div>
        )}
      </div>
    );
};

export const ERPConnectionsPage: React.FC = () => {
  return (
    <AdminLayout>
      <ERPConnectionsContent />
    </AdminLayout>
  );
};
