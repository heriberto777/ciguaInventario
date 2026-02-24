import React from 'react';
import { Button } from '../atoms/Button';

interface Role {
  id: string;
  name: string;
  description?: string;
  permissionCount: number;
  isActive: boolean;
  createdAt: string;
}

interface RolesTableProps {
  roles: Role[];
  isLoading?: boolean;
  onEdit?: (role: Role) => void;
  onDelete?: (roleId: string) => void;
  onManagePermissions?: (role: Role) => void;
}

export const RolesTable: React.FC<RolesTableProps> = ({
  roles,
  isLoading = false,
  onEdit,
  onDelete,
  onManagePermissions,
}) => {
  if (isLoading) {
    return <div className="text-center py-8">Loading roles...</div>;
  }

  if (roles.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No roles found. Create one to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="px-4 py-3 font-semibold">Name</th>
            <th className="px-4 py-3 font-semibold">Description</th>
            <th className="px-4 py-3 font-semibold">Permissions</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Created</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 font-semibold text-gray-900">
                {role.name}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {role.description || '-'}
              </td>
              <td className="px-4 py-3">
                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                  {role.permissionCount} permission
                  {role.permissionCount !== 1 ? 's' : ''}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                    role.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {role.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-4 py-3 text-xs">
                {new Date(role.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 space-x-1">
                {onManagePermissions && (
                  <Button
                    variant="secondary"
                    onClick={() => onManagePermissions(role)}
                    className="text-xs py-1 px-2"
                  >
                    Permissions
                  </Button>
                )}
                {onEdit && (
                  <Button
                    variant="secondary"
                    onClick={() => onEdit(role)}
                    className="text-xs py-1 px-2"
                  >
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="danger"
                    onClick={() => onDelete(role.id)}
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
