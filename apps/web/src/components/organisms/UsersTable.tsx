import React from 'react';
import { Button } from '../atoms/Button';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
}

interface UsersTableProps {
  users: User[];
  isLoading?: boolean;
  onEdit?: (user: User) => void;
  onDelete?: (userId: string) => void;
}

export const UsersTable: React.FC<UsersTableProps> = ({
  users,
  isLoading = false,
  onEdit,
  onDelete,
}) => {
  if (isLoading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No users found. Create one to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="px-4 py-3 font-semibold">Email</th>
            <th className="px-4 py-3 font-semibold">Name</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Created</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-xs">{user.email}</td>
              <td className="px-4 py-3">
                {user.firstName} {user.lastName}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                    user.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-4 py-3 text-xs">
                {new Date(user.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 space-x-2">
                {onEdit && (
                  <Button
                    variant="secondary"
                    onClick={() => onEdit(user)}
                    className="text-xs py-1 px-2"
                  >
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="danger"
                    onClick={() => onDelete(user.id)}
                    className="text-xs py-1 px-2"
                  >
                    Delete
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
