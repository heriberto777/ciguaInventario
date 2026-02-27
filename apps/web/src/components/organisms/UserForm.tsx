import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Label } from '../atoms/Label';

const UserFormSchema = z.object({
  email: z.string().email('Invalid email'),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  password: z.string().min(8, 'Password must be 8+ characters').optional().or(z.literal('')),
  roleId: z.string().min(1, 'Role required'),
});

type UserFormData = z.infer<typeof UserFormSchema>;

interface UserFormProps {
  onSubmit: (data: UserFormData) => Promise<void>;
  isLoading?: boolean;
  roles?: Array<{ id: string; name: string }>;
  initialData?: Partial<UserFormData & { id: string }>;
}

export const UserForm: React.FC<UserFormProps> = ({
  onSubmit,
  isLoading = false,
  roles = [],
  initialData,
}) => {
  const isEditing = !!initialData?.id;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UserFormData>({
    resolver: zodResolver(UserFormSchema),
    defaultValues: initialData ? {
      email: initialData.email,
      firstName: initialData.firstName,
      lastName: initialData.lastName,
      roleId: initialData.roleId,
      password: '',
    } : {
      roleId: '',
    },
  });

  const handleFormSubmit = async (data: UserFormData) => {
    try {
      // If editing and password is empty, remove it from payload
      const payload = { ...data };
      if (isEditing && !payload.password) {
        delete payload.password;
      }

      await onSubmit(payload);
      if (!isEditing) reset();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="user@company.com"
          {...register('email')}
          error={errors.email?.message}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            placeholder="John"
            {...register('firstName')}
            error={errors.firstName?.message}
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            placeholder="Doe"
            {...register('lastName')}
            error={errors.lastName?.message}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="password">
          Password {isEditing && <span className="text-xs text-gray-400 font-normal">(leave blank to keep current)</span>}
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          {...register('password')}
          error={errors.password?.message}
        />
      </div>

      <div>
        <Label htmlFor="roleId">Role</Label>
        <select
          id="roleId"
          {...register('roleId')}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${errors.roleId ? 'border-red-500' : 'border-gray-300'
            }`}
        >
          <option value="">Select a role</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        {errors.roleId && (
          <p className="mt-1 text-sm text-red-600">{errors.roleId.message}</p>
        )}
      </div>

      <div className="pt-2">
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Processing...' : isEditing ? 'Update User' : 'Create User'}
        </Button>
      </div>
    </form>
  );
};
