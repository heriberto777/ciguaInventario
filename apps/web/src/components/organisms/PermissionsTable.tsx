import React from 'react';
import { Button } from '../atoms/Button';

interface Permission {
  id: string;
  name: string;
  description?: string;
  category: string;
  createdAt: string;
}

interface PermissionsTableProps {
  permissions: Permission[];
  isLoading?: boolean;
  onEdit?: (permission: Permission) => void;
  onDelete?: (permissionId: string) => void;
}

export const PermissionsTable: React.FC<PermissionsTableProps> = ({
  permissions,
  isLoading = false,
  onEdit,
  onDelete,
}) => {
  if (isLoading) {
    return <div className="text-center py-8">Loading permissions...</div>;
  }

  if (permissions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No permissions found. Create one to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="px-4 py-3 font-semibold">Name</th>
            <th className="px-4 py-3 font-semibold">Category</th>
            <th className="px-4 py-3 font-semibold">Description</th>
            <th className="px-4 py-3 font-semibold">Created</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {permissions.map((permission) => (
            <tr key={permission.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 font-semibold text-gray-900">
                {permission.name}
              </td>
              <td className="px-4 py-3">
                <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                  {permission.category}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600">
                {permission.description || '-'}
              </td>
              <td className="px-4 py-3 text-xs">
                {new Date(permission.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 space-x-1">
                {onEdit && (
                  <Button
                    variant="secondary"
                    onClick={() => onEdit(permission)}
                    className="text-xs py-1 px-2"
                  >
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="danger"
                    onClick={() => onDelete(permission.id)}
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
