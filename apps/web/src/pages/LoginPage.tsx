import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/atoms/Button';
import { Card } from '@/components/molecules/Card';
import { LabeledInput } from '@/components/molecules/LabeledInput';
import { useLogin } from '@/hooks/useApi';
import { useAuthStore } from '@/store/auth';
import { useState } from 'react';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });
  const { mutate: login, isLoading } = useLogin();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [apiError, setApiError] = useState<string>('');

  const onSubmit = (data: LoginForm) => {
    setApiError('');
    login(data, {
      onSuccess: (response) => {
        setAuth(response.user, response.accessToken, response.refreshToken);
        navigate('/');
      },
      onError: (err: any) => {
        setApiError(err.response?.data?.error?.message || 'Login failed');
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6">Cigua Inventory</h1>

        {apiError && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <LabeledInput
            label="Email"
            type="email"
            required
            {...register('email')}
            error={errors.email}
          />

          <LabeledInput
            label="Password"
            type="password"
            required
            {...register('password')}
            error={errors.password}
          />

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
