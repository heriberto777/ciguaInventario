import React from 'react';
import { Button } from '../atoms/Button';

interface Role {
  id: string;
  name: string;
  description?: string;
  permissionCount: number;
  isActive: boolean;
  createdAt: string;
  rolePermissions?: Array<{
    permission: {
      id: string;
      name: string;
    };
  }>;
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
        <thead className="bg-[var(--bg-hover)] border-b border-[var(--border-default)] text-[var(--text-secondary)] font-bold uppercase text-[10px] tracking-wider">
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
            <tr key={role.id} className="border-b border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-colors">
              <td className="px-4 py-3 font-bold text-[var(--text-primary)]">
                {role.name}
              </td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {role.description || '-'}
              </td>
              <td className="px-4 py-3">
                <span className="inline-block bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-blue-500/20">
                  {role.permissionCount} permission
                  {role.permissionCount !== 1 ? 's' : ''}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${role.isActive
                    ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}
                >
                  {role.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-4 py-3 text-xs">
                {new Date(role.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 actions-cell">
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
