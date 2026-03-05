import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getApiClient } from '../services/api';

export interface ReservedItem {
    id: string;
    invoiceId: string;
    itemCode: string;
    itemName: string;
    reservedQty: number;
    uom: string;
}

export interface ReservedInvoice {
    id: string;
    countId: string;
    invoiceNumber: string;
    clientName: string;
    items?: ReservedItem[];
    createdAt: string;
    updatedAt: string;
}

export function useReservedInvoices(countId: string) {
    const queryClient = useQueryClient();

    // Obtener facturas reservadas para este conteo
    const query = useQuery(
        ['reserved-invoices', countId],
        async () => {
            const apiClient = getApiClient();
            const response = await apiClient.get<ReservedInvoice[]>(
                `/inventory-counts/${countId}/reserved-invoices`
            );
            return response.data;
        },
        {
            enabled: !!countId,
            staleTime: 60000, // 1 minuto
        }
    );

    // Mutación para reservar una nueva factura
    const reserveMutation = useMutation(
        async (invoiceNumber: string) => {
            const apiClient = getApiClient();
            const response = await apiClient.post(
                `/inventory-counts/${countId}/reserve-invoice`,
                { invoiceNumber }
            );
            return response.data;
        },
        {
            onSuccess: () => {
                // Invalidar caché para refrescar la lista y el detalle del conteo (varianza)
                queryClient.invalidateQueries(['reserved-invoices', countId]);
                queryClient.invalidateQueries(['inventory-count', countId]);
            },
        }
    );

    // Mutación para eliminar una reserva
    const removeMutation = useMutation(
        async (invoiceId: string) => {
            const apiClient = getApiClient();
            await apiClient.delete(
                `/inventory-counts/${countId}/reserved-invoices/${invoiceId}`
            );
        },
        {
            onSuccess: () => {
                queryClient.invalidateQueries(['reserved-invoices', countId]);
                queryClient.invalidateQueries(['inventory-count', countId]);
            },
        }
    );

    return {
        reservedInvoices: query.data || [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        reserveInvoice: reserveMutation.mutateAsync,
        isReserving: reserveMutation.isLoading,
        removeReservation: removeMutation.mutateAsync,
        isRemoving: removeMutation.isLoading,
        refetch: query.refetch,
    };
}
