import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/templates/AdminLayout';
import { SessionsTable } from '@/components/organisms/SessionsTable';
import { Button } from '@/components/atoms/Button';
import { getApiClient } from '@/services/api';

interface Session {
  id: string;
  userId: string;
  userName: string;
  companyId: string;
  userAgent: string | null;
  ipAddress: string | null;
  isActive: boolean;
  lastActivityAt: string;
  createdAt: string;
}

interface SessionsResponse {
  data: Session[];
  pagination: {
    skip: number;
    take: number;
    total: number;
  };
}

interface Stats {
  activeSessions: number;
  totalSessions: number;
  activeUsers: number;
  sessionsLastHour: number;
}

const ITEMS_PER_PAGE = 10;

export function SessionsContent() {
  const [currentPage, setCurrentPage] = useState(0);
  const [filterActive, setFilterActive] = useState<boolean | null>(true);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Get current session ID
  const { data: currentSession, error: sessionError } = useQuery({
    queryKey: ['current-session'],
    queryFn: async () => {
      try {
        const response = await getApiClient().get('/sessions/current');
        return response.data;
      } catch (error: any) {
        console.error('Error fetching current session:', error);
        // If we get 404, it's expected - session endpoint may not have data
        // If we get 401, it's an auth error
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    retry: 1,
  });

  React.useEffect(() => {
    if (currentSession?.id) {
      setCurrentSessionId(currentSession.id);
    }
  }, [currentSession]);

  // Fetch sessions
  const { data: sessionsData, isLoading: sessionsLoading } =
    useQuery<SessionsResponse>({
      queryKey: ['sessions', currentPage, filterActive],
      queryFn: async () => {
        const params = new URLSearchParams({
          skip: (currentPage * ITEMS_PER_PAGE).toString(),
          take: ITEMS_PER_PAGE.toString(),
          ...(filterActive !== null && { isActive: filterActive.toString() }),
        });
        const response = await getApiClient().get(`/sessions?${params}`);
        return response.data;
      },
    });

  // Fetch stats
  const { data: stats } = useQuery<Stats>({
    queryKey: ['sessions-stats'],
    queryFn: async () => {
      const response = await getApiClient().get('/sessions/stats');
      return response.data;
    },
  });

  // End session mutation
  const endSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await getApiClient().delete(`/sessions/${sessionId}`);
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessions-stats'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error finalizando sesión';
      setError(message);
    },
  });

  // Cleanup mutation
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await getApiClient().post('/sessions/cleanup', {
        inactiveMinutes: 60,
      });
      return response.data;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sessions-stats'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error limpiando sesiones';
      setError(message);
    },
  });

  const handleEndSession = async (sessionId: string) => {
    if (confirm('¿Estás seguro que deseas finalizar esta sesión?')) {
      await endSessionMutation.mutateAsync(sessionId);
    }
  };

  const handleCleanup = async () => {
    if (
      confirm(
        'Esto finalizará todas las sesiones inactivas por más de 60 minutos. ¿Continuar?'
      )
    ) {
      await cleanupMutation.mutateAsync();
    }
  };

  const totalPages = sessionsData
    ? Math.ceil(sessionsData.pagination.total / ITEMS_PER_PAGE)
    : 0;

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sesiones</h1>
            <p className="text-gray-600 mt-1">
              Monitorea y administra las sesiones de usuarios
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={handleCleanup}
            disabled={cleanupMutation.isPending}
          >
            {cleanupMutation.isPending ? 'Limpiando...' : 'Limpiar Inactivas'}
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Sesiones Activas</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {stats.activeSessions}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Sesiones Totales</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {stats.totalSessions}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Usuarios Activos</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {stats.activeUsers}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Última Hora</p>
              <p className="text-2xl font-bold text-purple-600 mt-2">
                {stats.sessionsLastHour}
              </p>
            </div>
          </div>
        )}

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

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filtrar por Estado
          </label>
          <div className="flex gap-2">
            <Button
              variant={filterActive === null ? 'primary' : 'secondary'}
              onClick={() => setFilterActive(null)}
            >
              Todas
            </Button>
            <Button
              variant={filterActive === true ? 'primary' : 'secondary'}
              onClick={() => setFilterActive(true)}
            >
              Solo Activas
            </Button>
            <Button
              variant={filterActive === false ? 'primary' : 'secondary'}
              onClick={() => setFilterActive(false)}
            >
              Solo Inactivas
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow">
          <SessionsTable
            sessions={sessionsData?.data || []}
            isLoading={sessionsLoading}
            onEnd={handleEndSession}
            currentSessionId={currentSessionId}
          />
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
            >
              Anterior
            </Button>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`px-3 py-2 rounded ${
                    currentPage === i
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <Button
              variant="secondary"
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
            >
              Siguiente
            </Button>
          </div>
        )}

        {/* Status messages */}
        {endSessionMutation.isError && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            Error al finalizar sesión. Por favor, intenta de nuevo.
          </div>
        )}
      </div>
    );
}

export function SessionsPage() {
  return (
    <AdminLayout title="Sesiones Activas">
      <SessionsContent />
    </AdminLayout>
  );
}
