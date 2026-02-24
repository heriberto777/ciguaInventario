import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/templates/AdminLayout';
import { UserForm } from '@/components/organisms/UserForm';
import { UsersTable } from '@/components/organisms/UsersTable';
import { Card } from '@/components/molecules/Card';
import { getApiClient } from '@/services/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
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

  const handleCreateUser = async (data: any) => {
    await createUserMutation.mutateAsync(data);
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      await deleteUserMutation.mutateAsync(userId);
    }
  };

  const users = usersData?.data || [];

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Users Management</h1>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setSelectedUser(null);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : '+ New User'}
          </button>
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

        {showForm && (
          <Card title="Create New User">
            <UserForm
              onSubmit={handleCreateUser}
              isLoading={createUserMutation.isPending}
            />
          </Card>
        )}

        <Card title="Users List">
          <UsersTable
            users={users}
            isLoading={isLoading}
            onDelete={handleDeleteUser}
            onEdit={setSelectedUser}
          />
        </Card>

        {selectedUser && (
          <Card title={`Edit User: ${selectedUser.email}`}>
            <p className="text-gray-600">
              Edit functionality will be implemented in next iteration
            </p>
          </Card>
        )}
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
