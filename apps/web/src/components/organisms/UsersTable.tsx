import React from 'react';
import { Button } from '../atoms/Button';

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
    return <div className="text-center py-8">Cargando usuarios...</div>;
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-muted)]">
        No se encontraron usuarios. Crea uno para comenzar.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--bg-hover)] border-b border-[var(--border-default)]">
          <tr>
            <th className="px-6 py-4 font-semibold text-[var(--text-primary)]">Email</th>
            <th className="px-6 py-4 font-semibold text-[var(--text-primary)]">Nombre</th>
            <th className="px-6 py-4 font-semibold text-[var(--text-primary)]">Rol</th>
            <th className="px-6 py-4 font-semibold text-[var(--text-primary)]">Estado</th>
            <th className="px-6 py-4 font-semibold text-[var(--text-primary)] text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-default)]">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-[var(--bg-hover)] transition-colors">
              <td className="px-6 py-4 font-mono text-xs text-[var(--text-secondary)]">{user.email}</td>
              <td className="px-6 py-4 text-[var(--text-primary)]">
                {user.firstName || ''} {user.lastName || ''}
                {(!user.firstName && !user.lastName) && <span className="text-[var(--text-muted)] italic text-xs">Sin nombre</span>}
              </td>
              <td className="px-6 py-4">
                {user.roleName ? (
                  <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium border border-blue-100">
                    {user.roleName}
                  </span>
                ) : (
                  <span className="text-[var(--text-muted)] italic text-xs">Sin rol</span>
                )}
              </td>
              <td className="px-6 py-4">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}
                >
                  <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${user.isActive ? 'bg-green-400' : 'bg-red-400'}`}></span>
                  {user.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="px-6 py-4 space-x-2 text-right">
                {onEdit && (
                  <Button
                    variant="secondary"
                    onClick={() => onEdit(user)}
                    className="text-xs py-1.5 px-3"
                  >
                    Editar
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="danger"
                    onClick={() => onDelete(user.id)}
                    className="text-xs py-1.5 px-3"
                  >
                    Eliminar
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
