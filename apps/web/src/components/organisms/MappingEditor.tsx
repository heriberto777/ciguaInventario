import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LabeledInput } from '@/components/molecules/LabeledInput';
import { Button } from '@/components/atoms/Button';
import { Card } from '@/components/molecules/Card';
import { useCreateMapping } from '@/hooks/useApi';
import { useState, useEffect } from 'react';
import { getApiClient } from '@/services/api';

const createMappingSchema = z.object({
  erpConnectionId: z.string().min(1, 'ERP Connection is required'),
  datasetType: z.enum(['ITEMS', 'STOCK', 'COST', 'PRICE', 'DESTINATION']),
  sourceTables: z.array(z.string()).min(1),
  fieldMappings: z.array(
    z.object({
      sourceField: z.string(),
      targetField: z.string(),
      dataType: z.string(),
    })
  ),
});

type CreateMappingForm = z.infer<typeof createMappingSchema>;

interface ERPConnection {
  id: string;
  erpType: string;
  host: string;
}

export function MappingEditor() {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateMappingForm>({
    resolver: zodResolver(createMappingSchema),
  });
  const { mutate: createMapping, isLoading, isError, error } = useCreateMapping();
  const [success, setSuccess] = useState(false);
  const [erpConnections, setErpConnections] = useState<ERPConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const response = await getApiClient().get('/erp-connections');
        setErpConnections(response.data.data || []);
      } catch (error) {
        console.error('Error fetching ERP connections:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, []);

  const onSubmit = (data: CreateMappingForm) => {
    console.log('Form submitted with data:', data);

    // Validar que sourceTables sea un array válido
    if (!data.sourceTables || data.sourceTables.length === 0) {
      console.error('sourceTables is required');
      return;
    }

    // Validar que fieldMappings sea un array válido
    if (!data.fieldMappings || data.fieldMappings.length === 0) {
      console.error('fieldMappings is required');
      return;
    }

    createMapping(data, {
      onSuccess: () => {
        console.log('Mapping created successfully');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      },
      onError: (err) => {
        console.error('Error creating mapping:', err);
      },
    });
  };

  return (
    <Card title="Create Mapping Configuration">
      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md">
          ✓ Mapping created successfully!
        </div>
      )}

      {isError && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md">
          ✗ Error: {error instanceof Error ? error.message : 'Failed to create mapping'}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ERP Connection <span className="text-red-500">*</span>
          </label>
          <select
            {...register('erpConnectionId')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="">
              {loading ? 'Loading connections...' : 'Select an ERP Connection'}
            </option>
            {erpConnections.map((conn) => (
              <option key={conn.id} value={conn.id}>
                {conn.erpType} - {conn.host}
              </option>
            ))}
          </select>
          {errors.erpConnectionId && (
            <span className="text-sm text-red-600">{errors.erpConnectionId.message}</span>
          )}
          {!loading && erpConnections.length === 0 && (
            <p className="text-sm text-orange-600 mt-1">
              No ERP connections found. Please create one first in the "ERP Connections" module.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dataset Type <span className="text-red-500">*</span>
          </label>
          <select
            {...register('datasetType')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            <option value="ITEMS">ITEMS - Product catalog/articles</option>
            <option value="STOCK">STOCK - Inventory/quantities</option>
            <option value="COST">COST - Product costs</option>
            <option value="PRICE">PRICE - Selling prices</option>
            <option value="DESTINATION">DESTINATION - Warehouses/locations</option>
          </select>
          {errors.datasetType && (
            <span className="text-sm text-red-600">{errors.datasetType.message}</span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Source Tables (comma-separated) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g., SAP.PUBLIC.PRODUCTS, SAP.PUBLIC.PRICES"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...register('sourceTables', {
              setValueAs: (value: string) => value.split(',').map(v => v.trim()).filter(v => v.length > 0)
            })}
          />
          {errors.sourceTables && (
            <span className="text-sm text-red-600">{errors.sourceTables.message}</span>
          )}
          <p className="text-xs text-gray-500 mt-1">Separate multiple tables with commas</p>
        </div>

        <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
          <h3 className="font-semibold text-sm text-blue-900 mb-3">Field Mappings (Required)</h3>
          <p className="text-xs text-blue-700 mb-3">
            For this demo, please provide at least one field mapping as JSON in the Advanced Options below.
          </p>
          <input
            type="hidden"
            {...register('fieldMappings', {
              setValueAs: () => [
                {
                  sourceField: 'id',
                  targetField: 'id',
                  dataType: 'INT'
                }
              ]
            })}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || loading || erpConnections.length === 0}
          className={`w-full px-4 py-2 rounded-md font-medium text-white transition-colors ${
            isLoading || loading || erpConnections.length === 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Creating...
            </span>
          ) : (
            'Create Mapping'
          )}
        </button>
      </form>
    </Card>
  );
}
