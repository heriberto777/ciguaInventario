import React from 'react';
import { Button } from '../atoms/Button';

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
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
        <thead className="bg-[var(--bg-hover)] border-b border-[var(--border-default)]">
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
            <tr key={permission.id} className="border-b border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-colors">
              <td className="px-4 py-3 font-bold text-[var(--text-primary)]">
                {permission.name}
              </td>
              <td className="px-4 py-3">
                <span className="inline-block bg-purple-500/10 text-purple-500 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-purple-500/20">
                  {permission.category}
                </span>
              </td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">
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
