import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Label } from '../atoms/Label';

const CreateRoleSchema = z.object({
  name: z.string().min(1, 'Role name required'),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).min(1, 'Select at least one permission'),
});

type CreateRoleForm = z.infer<typeof CreateRoleSchema>;

interface Permission {
  id: string;
  name: string;
  category: string;
  description?: string;
}

interface RoleFormProps {
  onSubmit: (data: CreateRoleForm) => Promise<void>;
  isLoading?: boolean;
  permissions?: Permission[];
  initialData?: {
    name: string;
    description?: string;
    permissionIds: string[];
  };
}

export const RoleForm: React.FC<RoleFormProps> = ({
  onSubmit,
  isLoading = false,
  permissions = [],
  initialData,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<CreateRoleForm>({
    resolver: zodResolver(CreateRoleSchema),
    defaultValues: initialData || {
      permissionIds: [],
    },
  });

  // Si initialData cambia (ej: al editar), resetear el form
  React.useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  const selectedPermissions = watch('permissionIds') || [];

  const handleFormSubmit = async (data: CreateRoleForm) => {
    try {
      await onSubmit(data);
      if (!initialData) reset();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  // Agrupar permisos por categoría
  const groupedPermissions = permissions.reduce((acc, permission) => {
    const category = permission.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(permission);
    return acc;
  }, {} as Record<string, typeof permissions>);

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre del Rol *</Label>
            <Input
              id="name"
              placeholder="Ej: Administrador, Operador, Auditor"
              {...register('name')}
              error={errors.name?.message}
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <textarea
              id="description"
              placeholder="Describe las responsabilidades de este rol..."
              {...register('description')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              rows={4}
            />
          </div>
        </div>

        <div className="space-y-4">
          <Label>Permisos Asignados ({selectedPermissions.length}) *</Label>
          <div className="mt-2 space-y-4 border border-gray-300 rounded-md p-4 max-h-[400px] overflow-y-auto bg-gray-50">
            {permissions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No hay permisos disponibles</p>
            ) : (
              Object.entries(groupedPermissions).map(([category, perms]) => (
                <div key={category} className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200 pb-1">
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {perms.map((permission) => (
                      <label
                        key={permission.id}
                        className="flex items-start space-x-3 p-2 rounded hover:bg-white cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          value={permission.id}
                          {...register('permissionIds')}
                          className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {permission.name}
                          </p>
                          {permission.description && (
                            <p className="text-xs text-gray-500">
                              {permission.description}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
          {errors.permissionIds && (
            <p className="mt-1 text-sm text-red-600">
              {errors.permissionIds.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button type="submit" disabled={isLoading} className="px-10">
          {isLoading ? 'Guardando...' : (initialData ? 'Actualizar Rol' : 'Crear Rol')}
        </Button>
      </div>
    </form>
  );
};
