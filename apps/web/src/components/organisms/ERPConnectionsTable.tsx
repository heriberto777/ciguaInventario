import React from 'react';
import { Button } from '../atoms/Button';

interface ERPConnection {
  id: string;
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
}

export const ERPConnectionsTable: React.FC<ERPConnectionsTableProps> = ({
  connections,
  isLoading = false,
  onEdit,
  onDelete,
  onToggle,
}) => {
  if (isLoading) {
    return <div className="text-center py-8">Loading connections...</div>;
  }

  if (connections.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No ERP connections configured. Create one to get started.
      </div>
    );
  }

  const getERPTypeColor = (type: string) => {
    switch (type) {
      case 'MSSQL':
        return 'bg-blue-100 text-blue-800';
      case 'SAP':
        return 'bg-green-100 text-green-800';
      case 'ORACLE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-100 border-b">
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
            <tr key={conn.id} className="border-b hover:bg-gray-50">
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
              <td className="px-4 py-3 text-gray-600">{conn.database}</td>
              <td className="px-4 py-3 text-gray-600">{conn.username}</td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onToggle?.(conn.id, !conn.isActive)}
                  className={`inline-block px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                    conn.isActive
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                  }`}
                >
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
