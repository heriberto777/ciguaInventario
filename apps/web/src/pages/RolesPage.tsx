import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/templates/AdminLayout';
import { RoleForm } from '@/components/organisms/RoleForm';
import { RolesTable } from '@/components/organisms/RolesTable';
import { Button } from '@/components/atoms/Button';
import { getApiClient } from '@/services/api';

interface Role {
  id: string;
  name: string;
  description?: string;
  permissionCount: number;
  rolePermissions?: Array<{
    permission: {
      id: string;
      name: string;
    };
  }>;
  isActive: boolean;
  createdAt: string;
}

interface Permission {
  id: string;
  name: string;
  category: string;
  description?: string;
}

interface RolesResponse {
  data: Role[];
  pagination: {
    skip: number;
    take: number;
    total: number;
  };
}

const ITEMS_PER_PAGE = 10;

export const RolesContent: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch roles
  const { data: rolesData, isLoading: rolesLoading } = useQuery<RolesResponse>({
    queryKey: ['roles', currentPage, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({
        skip: (currentPage * ITEMS_PER_PAGE).toString(),
        take: ITEMS_PER_PAGE.toString(),
        search: searchTerm,
      });
      const response = await getApiClient().get(`/roles?${params}`);
      return response.data;
    },
  });

  // Fetch permissions
  const { data: permissionsData } = useQuery<{ data: Permission[] }>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const response = await getApiClient().get('/permissions');
      return response.data;
    },
  });

  const permissions = permissionsData?.data || [];

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; permissionIds: string[] }) => {
      const response = await getApiClient().post('/roles', data);
      return response.data;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setShowForm(false);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error creating role';
      setError(message);
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name: string; description?: string; permissionIds?: string[] };
    }) => {
      const response = await getApiClient().patch(`/roles/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setEditingRole(null);
      setShowForm(false);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error updating role';
      setError(message);
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      await getApiClient().delete(`/roles/${roleId}`);
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error deleting role';
      setError(message);
    },
  });

  // Remove the separate assignPermissionsMutation as it's now handled by updateRole

  const handleCreateRole = async (data: {
    name: string;
    description?: string;
    permissionIds: string[];
  }) => {
    await createRoleMutation.mutateAsync(data);
  };

  const handleUpdateRole = async (data: {
    name: string;
    description?: string;
    permissionIds?: string[];
  }) => {
    if (!editingRole) return;

    await updateRoleMutation.mutateAsync({
      id: editingRole.id,
      data: {
        name: data.name,
        description: data.description,
        permissionIds: data.permissionIds,
      },
    });
  };

  const handleDeleteRole = async (roleId: string) => {
    if (confirm('Are you sure you want to delete this role?')) {
      await deleteRoleMutation.mutateAsync(roleId);
    }
  };

  const totalPages = rolesData
    ? Math.ceil(rolesData.pagination.total / ITEMS_PER_PAGE)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roles</h1>
          <p className="text-gray-600 mt-1">Manage roles and permissions</p>
        </div>
        <Button
          onClick={() => {
            setEditingRole(null);
            setShowForm(!showForm);
          }}
          disabled={showForm}
        >
          {showForm ? 'Cancel' : 'Create Role'}
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
            {editingRole ? 'Edit Role' : 'Create New Role'}
          </h2>
          <RoleForm
            permissions={permissions}
            onSubmit={editingRole ? handleUpdateRole : handleCreateRole}
            initialData={
              editingRole
                ? {
                  name: editingRole.name,
                  description: editingRole.description || '',
                  permissionIds: editingRole.rolePermissions?.map(rp => rp.permission.id) || [],
                }
                : undefined
            }
            isLoading={
              createRoleMutation.isPending || updateRoleMutation.isPending
            }
          />
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <input
          type="text"
          placeholder="Search roles..."
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
        <RolesTable
          roles={rolesData?.data || []}
          isLoading={rolesLoading}
          onEdit={(role) => {
            setEditingRole(role);
            setShowForm(true);
          }}
          onDelete={handleDeleteRole}
          onManagePermissions={(role) => {
            setEditingRole(role);
            setShowForm(true);
          }}
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
                className={`px-3 py-2 rounded ${currentPage === i
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
      {deleteRoleMutation.isPending && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          Deleting role...
        </div>
      )}
      {deleteRoleMutation.isError && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          Error deleting role. Please try again.
        </div>
      )}
    </div>
  );
};

export const RolesPage: React.FC = () => {
  return (
    <AdminLayout>
      <RolesContent />
    </AdminLayout>
  );
};
