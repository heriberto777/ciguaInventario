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
  code: string;
  description?: string;
}

interface RoleFormProps {
  onSubmit: (data: CreateRoleForm) => Promise<void>;
  isLoading?: boolean;
  permissions?: Permission[];
}

export const RoleForm: React.FC<RoleFormProps> = ({
  onSubmit,
  isLoading = false,
  permissions = [],
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
    reset,
  } = useForm<CreateRoleForm>({
    resolver: zodResolver(CreateRoleSchema),
    defaultValues: {
      permissionIds: [],
    },
  });

  const selectedPermissions = watch('permissionIds');

  const handleFormSubmit = async (data: CreateRoleForm) => {
    try {
      await onSubmit(data);
      reset();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div>
        <Label htmlFor="name">Role Name</Label>
        <Input
          id="name"
          placeholder="e.g., Manager, Editor, Viewer"
          {...register('name')}
          error={errors.name?.message}
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          placeholder="Role description..."
          {...register('description')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
      </div>

      <div>
        <Label>Permissions</Label>
        <div className="mt-2 space-y-2 border border-gray-300 rounded-md p-4">
          {permissions.length === 0 ? (
            <p className="text-sm text-gray-500">No permissions available</p>
          ) : (
            permissions.map((permission) => (
              <label
                key={permission.id}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  value={permission.id}
                  {...register('permissionIds')}
                  className="h-4 w-4 text-blue-600 rounded"
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
            ))
          )}
        </div>
        {errors.permissionIds && (
          <p className="mt-1 text-sm text-red-600">
            {errors.permissionIds.message}
          </p>
        )}
      </div>

      {selectedPermissions.length > 0 && (
        <div className="bg-blue-50 p-3 rounded-md">
          <p className="text-sm text-blue-800">
            Selected {selectedPermissions.length} permission
            {selectedPermissions.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Role'}
      </Button>
    </form>
  );
};
