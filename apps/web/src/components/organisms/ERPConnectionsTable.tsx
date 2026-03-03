import React from 'react';
import { Button } from '../atoms/Button';

interface ERPConnection {
  id: string;
  companyId: string;
  erpType: string;
  host: string;
  port: number;
  database: string;
  username: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ERPConnectionsTableProps {
  connections: ERPConnection[];
  isLoading?: boolean;
  onEdit?: (connection: ERPConnection) => void;
  onDelete?: (connectionId: string) => void;
  onToggle?: (connectionId: string, isActive: boolean) => void;
  isDeletingId?: string | null;
  isTogglingId?: string | null;
}

export const ERPConnectionsTable: React.FC<ERPConnectionsTableProps> = ({
  connections,
  isLoading = false,
  onEdit,
  onDelete,
  onToggle,
  isDeletingId,
  isTogglingId,
}) => {
  if (isLoading) {
    return <div className="text-center py-8">Loading connections...</div>;
  }

  if (connections.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-muted)] italic">
        No ERP connections configured. Create one to get started.
      </div>
    );
  }

  const getERPTypeColor = (type: string) => {
    switch (type) {
      case 'MSSQL':
        return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      case 'SAP':
        return 'bg-green-500/10 text-green-500 border border-green-500/20';
      case 'ORACLE':
        return 'bg-red-500/10 text-red-500 border border-red-500/20';
      default:
        return 'bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border-default)]';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--bg-hover)] border-b border-[var(--border-default)] text-[var(--text-secondary)] uppercase text-[10px] font-black tracking-wider">
          <tr>
            <th className="px-4 py-3 font-semibold">Type</th>
            <th className="px-4 py-3 font-semibold">Host</th>
            <th className="px-4 py-3 font-semibold">Database</th>
            <th className="px-4 py-3 font-semibold">User</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Updated</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {connections.map((conn) => (
            <tr key={conn.id} className="border-b border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-colors">
              <td className="px-4 py-3">
                <span
                  className={`inline-block text-xs font-semibold px-2 py-1 rounded ${getERPTypeColor(
                    conn.erpType
                  )}`}
                >
                  {conn.erpType}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs">
                {conn.host}:{conn.port}
              </td>
              <td className="px-4 py-3 text-[var(--text-secondary)] font-medium">{conn.database}</td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">{conn.username}</td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onToggle?.(conn.id, !conn.isActive)}
                  disabled={isTogglingId === conn.id}
                  className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-2 ${conn.isActive
                    ? 'bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20'
                    : 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20'
                    }`}
                >
                  {isTogglingId === conn.id && (
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  {conn.isActive ? 'Active' : 'Inactive'}
                </button>
              </td>
              <td className="px-4 py-3 text-xs">
                {new Date(conn.updatedAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 space-x-1">
                {onEdit && (
                  <Button
                    variant="secondary"
                    onClick={() => onEdit(conn)}
                    className="text-xs py-1 px-2"
                  >
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="danger"
                    onClick={() => onDelete(conn.id)}
                    className="text-xs py-1 px-2"
                    isLoading={isDeletingId === conn.id}
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
