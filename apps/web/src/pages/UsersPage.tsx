import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/templates/AdminLayout';
import { UserForm } from '@/components/organisms/UserForm';
import { UsersTable } from '@/components/organisms/UsersTable';
import { Card } from '@/components/molecules/Card';
import { getApiClient } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roleId?: string;
  roleName?: string;
  isActive: boolean;
  createdAt: string;
}

interface Role {
  id: string;
  name: string;
}

export const UsersContent: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch users
  const { data: usersData, isLoading } = useQuery<{ data: User[]; pagination: any }>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await getApiClient().get('/users?skip=0&take=50');
      return response.data;
    },
  });

  // Fetch roles
  const { data: rolesResponse } = useQuery<{ data: Role[] }>({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await getApiClient().get('/roles?skip=0&take=100');
      return response.data;
    },
  });

  const roles = rolesResponse?.data || [];

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await getApiClient().post('/users', userData);
      return response.data;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error creating user';
      setError(message);
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await getApiClient().patch(`/users/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error updating user';
      setError(message);
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await getApiClient().delete(`/users/${userId}`);
      return response.data;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error deleting user';
      setError(message);
    },
  });

  const handleSubmit = async (data: any) => {
    if (selectedUser) {
      await updateUserMutation.mutateAsync({ id: selectedUser.id, data });
    } else {
      await createUserMutation.mutateAsync(data);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      await deleteUserMutation.mutateAsync(userId);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowForm(true);
  };

  const users = usersData?.data || [];
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('users:create');
  const canEdit = hasPermission('users:edit');
  const canDelete = hasPermission('users:delete');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Gestión de Usuarios</h1>
          <p className="text-[var(--text-secondary)] mt-1">Crea y administra los usuarios y sus roles.</p>
        </div>
        {canCreate && (
          <button
            onClick={() => {
              setShowForm(!showForm);
              setSelectedUser(null);
            }}
            className={`px-4 py-2 text-white rounded-lg transition-colors ${showForm ? 'bg-gray-500 hover:bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            {showForm ? 'Cancelar' : '+ Nuevo Usuario'}
          </button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-in fade-in slide-in-from-top-2">
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

      {showForm && (
        <Card title={selectedUser ? `Editar Usuario: ${selectedUser.email}` : "Crear Nuevo Usuario"}>
          <UserForm
            onSubmit={handleSubmit}
            isLoading={createUserMutation.isPending || updateUserMutation.isPending}
            roles={roles}
            initialData={selectedUser || undefined}
          />
        </Card>
      )}

      <Card title="Lista de Usuarios">
        <UsersTable
          users={users}
          isLoading={isLoading}
          onDelete={canDelete ? handleDeleteUser : undefined}
          onEdit={canEdit ? handleEditUser : undefined}
        />
      </Card>
    </div>
  );
};

export const UsersPage: React.FC = () => {
  return (
    <AdminLayout>
      <UsersContent />
    </AdminLayout>
  );
};
