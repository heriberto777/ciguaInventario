import React from 'react';
import { Button } from '@/components/atoms/Button';

interface Session {
  id: string;
  userId: string;
  userName: string;
  userAgent: string | null;
  ipAddress: string | null;
  isActive: boolean;
  lastActivityAt: string;
  createdAt: string;
}

interface SessionsTableProps {
  sessions: Session[];
  isLoading?: boolean;
  onEnd?: (sessionId: string) => void;
  currentSessionId?: string;
}

export const SessionsTable: React.FC<SessionsTableProps> = ({
  sessions,
  isLoading = false,
  onEnd,
  currentSessionId,
}) => {
  if (isLoading) {
    return <div className="text-center py-8">Loading sessions...</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No active sessions found.
      </div>
    );
  }

  const parseUserAgent = (ua: string | null) => {
    if (!ua) return 'Unknown';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Other';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="px-4 py-3 font-semibold">User</th>
            <th className="px-4 py-3 font-semibold">Browser</th>
            <th className="px-4 py-3 font-semibold">IP Address</th>
            <th className="px-4 py-3 font-semibold">Last Activity</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 font-semibold text-gray-900">
                {session.userName}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {parseUserAgent(session.userAgent)}
              </td>
              <td className="px-4 py-3 font-mono text-xs">
                {session.ipAddress || '-'}
              </td>
              <td className="px-4 py-3 text-xs">
                {new Date(session.lastActivityAt).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                    session.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {session.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-4 py-3 space-x-1">
                {onEnd && session.isActive && session.id !== currentSessionId && (
                  <Button
                    variant="danger"
                    onClick={() => onEnd(session.id)}
                    className="text-xs py-1 px-2"
                  >
                    End
                  </Button>
                )}
                {session.id === currentSessionId && (
                  <span className="text-xs text-blue-600 font-semibold">
                    Current
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
