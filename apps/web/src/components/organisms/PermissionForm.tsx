import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../atoms/Button';
import { getApiClient } from '@/services/api';

const PermissionFormSchema = z.object({
  resource: z.string().min(1, 'Resource is required'),
  action: z.string().min(1, 'Action is required'),
  description: z.string().min(1, 'Description is required'),
  name: z.string().optional(), // Auto-generated from resource:action
  category: z.string().optional(), // Auto-generated from resource
});

type PermissionFormData = z.infer<typeof PermissionFormSchema>;

interface ResourcesAndActions {
  [key: string]: string[];
}

interface PermissionFormProps {
  onSubmit: (data: PermissionFormData) => Promise<void>;
  isLoading?: boolean;
  initialData?: PermissionFormData;
}

export const PermissionForm: React.FC<PermissionFormProps> = ({
  onSubmit,
  isLoading = false,
  initialData,
}) => {
  const [resourcesAndActions, setResourcesAndActions] = useState<ResourcesAndActions>({});
  const [loadingResources, setLoadingResources] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<PermissionFormData>({
    resolver: zodResolver(PermissionFormSchema),
    defaultValues: initialData,
  });

  const selectedResource = watch('resource');
  const selectedAction = watch('action');
  const description = watch('description');

  // Load resources and actions on mount
  useEffect(() => {
    const loadResources = async () => {
      try {
        const response = await getApiClient().get('/permissions/resources-and-actions');
        setResourcesAndActions(response.data);
      } catch (error) {
        console.error('Failed to load resources:', error);
      } finally {
        setLoadingResources(false);
      }
    };

    loadResources();
  }, []);

  // Auto-generate name and category when resource and action are selected
  useEffect(() => {
    if (selectedResource && selectedAction) {
      const newName = `${selectedResource}:${selectedAction}`;
      setValue('name', newName);
      setValue('category', selectedResource);
    }
  }, [selectedResource, selectedAction, setValue]);

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  const onSubmitHandler = async (data: PermissionFormData) => {
    const submitData = {
      ...data,
      name: `${data.resource}:${data.action}`,
      category: data.resource,
    };
    await onSubmit(submitData);
    if (!initialData) {
      reset();
    }
  };

  const availableActions = selectedResource ? (resourcesAndActions[selectedResource] || []) : [];

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-4">
      {/* Helper info */}
      <div className="bg-blue-50 border border-blue-200 rounded p-3">
        <p className="text-sm text-blue-800">
          <strong>Instrucciones:</strong> Selecciona un recurso (qué) y una acción (qué hacer), luego describe el permiso.
          <br />
          El nombre se genera automáticamente como <code className="bg-blue-100 px-2 py-1 rounded">recurso:acción</code>
        </p>
      </div>

      {/* Resource dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Recurso (Resource) *
        </label>
        <p className="text-xs text-gray-500 mb-2">¿Sobre qué quieres establecer permisos?</p>
        <select
          {...register('resource')}
          disabled={loadingResources}
          className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">
            {loadingResources ? 'Cargando...' : 'Selecciona un recurso'}
          </option>
          {Object.keys(resourcesAndActions).map((resource) => (
            <option key={resource} value={resource}>
              {resource}
            </option>
          ))}
        </select>
        {errors.resource && (
          <span className="text-xs text-red-500 mt-1">{errors.resource.message}</span>
        )}
      </div>

      {/* Action dropdown */}
      {selectedResource && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Acción (Action) *
          </label>
          <p className="text-xs text-gray-500 mb-2">¿Qué puede hacer el usuario?</p>
          <select
            {...register('action')}
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecciona una acción</option>
            {availableActions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
          {errors.action && (
            <span className="text-xs text-red-500 mt-1">{errors.action.message}</span>
          )}
        </div>
      )}

      {/* Auto-generated name display */}
      {selectedResource && selectedAction && (
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <p className="text-sm text-green-800">
            <strong>Nombre del Permiso (auto-generado):</strong>
            <br />
            <code className="bg-green-100 px-2 py-1 rounded text-base font-mono">
              {selectedResource}:{selectedAction}
            </code>
          </p>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Descripción *
        </label>
        <p className="text-xs text-gray-500 mb-2">Explica qué permite este permiso en lenguaje claro</p>
        <textarea
          {...register('description')}
          placeholder="Ejemplo: Permite crear nuevos usuarios en el sistema"
          rows={3}
          className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.description && (
          <span className="text-xs text-red-500 mt-1">{errors.description.message}</span>
        )}
      </div>

      {/* Preview */}
      {selectedResource && selectedAction && description && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
          <p className="text-sm text-yellow-800">
            <strong>Vista Previa:</strong>
            <br />
            Permiso: <code className="bg-yellow-100 px-2 py-1 rounded">{selectedResource}:{selectedAction}</code>
            <br />
            Categoría: <code className="bg-yellow-100 px-2 py-1 rounded">{selectedResource}</code>
            <br />
            Descripción: {description}
          </p>
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading || loadingResources || !selectedResource || !selectedAction}
        className="w-full"
      >
        {isLoading ? 'Guardando...' : 'Guardar Permiso'}
      </Button>
    </form>
  );
};
