import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Label } from '../atoms/Label';

const CreateUserSchema = z.object({
  email: z.string().email('Invalid email'),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  password: z.string().min(8, 'Password must be 8+ characters'),
});

type CreateUserForm = z.infer<typeof CreateUserSchema>;

interface UserFormProps {
  onSubmit: (data: CreateUserForm) => Promise<void>;
  isLoading?: boolean;
  roles?: Array<{ id: string; name: string }>;
}

export const UserForm: React.FC<UserFormProps> = ({
  onSubmit,
  isLoading = false,
  roles = [],
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateUserForm>({
    resolver: zodResolver(CreateUserSchema),
  });

  const handleFormSubmit = async (data: CreateUserForm) => {
    try {
      await onSubmit(data);
      reset();
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
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          {...register('password')}
          error={errors.password?.message}
        />
      </div>

      {roles.length > 0 && (
        <div>
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create User'}
      </Button>
    </form>
  );
};
