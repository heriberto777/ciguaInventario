import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/templates/AdminLayout';
import { PermissionForm } from '@/components/organisms/PermissionForm';
import { PermissionsTable } from '@/components/organisms/PermissionsTable';
import { Button } from '@/components/atoms/Button';
import { getApiClient } from '@/services/api';

interface Permission {
  id: string;
  name: string;
  description?: string;
  category: string;
  createdAt: string;
}

interface PermissionsResponse {
  data: Permission[];
  pagination: {
    skip: number;
    take: number;
    total: number;
  };
}

const ITEMS_PER_PAGE = 10;

export const PermissionsContent: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch permissions
  const { data: permissionsData, isLoading: permissionsLoading } =
    useQuery<PermissionsResponse>({
      queryKey: ['permissions', currentPage, searchTerm],
      queryFn: async () => {
        const params = new URLSearchParams({
          skip: (currentPage * ITEMS_PER_PAGE).toString(),
          take: ITEMS_PER_PAGE.toString(),
          search: searchTerm,
        });
        const response = await getApiClient().get(`/permissions?${params}`);
        return response.data;
      },
    });

  // Create permission mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      category?: string;
    }) => {
      const response = await getApiClient().post('/permissions', data);
      return response.data;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      setShowForm(false);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error creating permission';
      setError(message);
    },
  });

  // Update permission mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; description?: string; category?: string };
    }) => {
      const response = await getApiClient().patch(`/permissions/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      setEditingPermission(null);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error updating permission';
      setError(message);
    },
  });

  // Delete permission mutation
  const deleteMutation = useMutation({
    mutationFn: async (permissionId: string) => {
      await getApiClient().delete(`/permissions/${permissionId}`);
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error deleting permission';
      setError(message);
    },
  });

  const handleCreate = async (data: {
    name: string;
    description?: string;
    category?: string;
  }) => {
    await createMutation.mutateAsync(data);
  };

  const handleUpdate = async (data: {
    name: string;
    description?: string;
    category?: string;
  }) => {
    if (!editingPermission) return;
    await updateMutation.mutateAsync({
      id: editingPermission.id,
      data,
    });
  };

  const handleDelete = async (permissionId: string) => {
    if (confirm('Are you sure you want to delete this permission?')) {
      await deleteMutation.mutateAsync(permissionId);
    }
  };

  const totalPages = permissionsData
    ? Math.ceil(permissionsData.pagination.total / ITEMS_PER_PAGE)
    : 0;

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Permissions</h1>
            <p className="text-gray-600 mt-1">Manage system permissions</p>
          </div>
          <Button
            onClick={() => {
              setEditingPermission(null);
              setShowForm(!showForm);
            }}
            disabled={showForm}
          >
            {showForm ? 'Cancel' : 'Create Permission'}
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-red-800 font-semibold">Error</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 text-xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingPermission ? 'Edit Permission' : 'Create New Permission'}
            </h2>
            <PermissionForm
              onSubmit={editingPermission ? handleUpdate : handleCreate}
              initialData={
                editingPermission
                  ? {
                      name: editingPermission.name,
                      description: editingPermission.description,
                      category: editingPermission.category,
                    }
                  : undefined
              }
              isLoading={
                createMutation.isPending || updateMutation.isPending
              }
            />
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-4">
          <input
            type="text"
            placeholder="Search permissions..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(0);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow">
          <PermissionsTable
            permissions={permissionsData?.data || []}
            isLoading={permissionsLoading}
            onEdit={(permission) => {
              setEditingPermission(permission);
              setShowForm(true);
            }}
            onDelete={handleDelete}
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
            Error deleting permission. Please try again.
          </div>
        )}
      </div>
    );
};

export const PermissionsPage: React.FC = () => {
  return (
    <AdminLayout>
      <PermissionsContent />
    </AdminLayout>
  );
};
