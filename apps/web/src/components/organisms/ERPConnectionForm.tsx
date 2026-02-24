import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../atoms/Button';

const ERPConnectionFormSchema = z.object({
  erpType: z.enum(['MSSQL', 'SAP', 'ORACLE'], { errorMap: () => ({ message: 'Select a valid ERP type' }) }),
  host: z.string().min(1, 'Host is required'),
  port: z.number().int().min(1, 'Port must be between 1 and 65535').max(65535),
  database: z.string().min(1, 'Database is required'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type ERPConnectionFormData = z.infer<typeof ERPConnectionFormSchema>;

interface ERPConnectionFormProps {
  onSubmit: (data: ERPConnectionFormData) => Promise<void>;
  onTestConnection?: (data: ERPConnectionFormData) => Promise<boolean>;
  isLoading?: boolean;
  initialData?: Partial<ERPConnectionFormData>;
  isEditing?: boolean;
}

export const ERPConnectionForm: React.FC<ERPConnectionFormProps> = ({
  onSubmit,
  onTestConnection,
  isLoading = false,
  initialData,
  isEditing = false,
}) => {
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ERPConnectionFormData>({
    resolver: zodResolver(ERPConnectionFormSchema),
    defaultValues: initialData,
  });

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  const formValues = watch();

  const onSubmitHandler = async (data: ERPConnectionFormData) => {
    setTestResult(null);
    await onSubmit(data);
    if (!isEditing) {
      reset();
    }
  };

  const handleTestConnection = async () => {
    if (!onTestConnection) return;

    // Validar que todos los campos requeridos estén llenos
    if (!formValues.erpType || !formValues.host || !formValues.port || !formValues.database || !formValues.username || !formValues.password) {
      setTestResult('Please fill in all required fields before testing.');
      return;
    }

    setTestLoading(true);
    setTestResult(null);

    try {
      const success = await onTestConnection(formValues);
      setTestResult(
        success
          ? 'Connection successful! ✓'
          : 'Connection failed. Check credentials.'
      );
    } catch (error) {
      setTestResult('Connection test error. Please try again.');
    } finally {
      setTestLoading(false);
    }
  };

  const erpTypeDescriptions: Record<string, string> = {
    MSSQL: 'SQL Server - For Microsoft SQL Server databases',
    SAP: 'SAP - For SAP ERP systems',
    ORACLE: 'Oracle - For Oracle Database systems',
  };

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          ERP Type *
        </label>
        <select
          {...register('erpType')}
          className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select ERP Type</option>
          <option value="MSSQL">Microsoft SQL Server</option>
          <option value="SAP">SAP</option>
          <option value="ORACLE">Oracle Database</option>
        </select>
        {errors.erpType && (
          <span className="text-xs text-red-500 mt-1">{errors.erpType.message}</span>
        )}
        {formValues.erpType && (
          <p className="text-xs text-gray-500 mt-1">
            {erpTypeDescriptions[formValues.erpType]}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Host *
          </label>
          <input
            {...register('host')}
            type="text"
            placeholder="192.168.1.100 or server.domain.com"
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.host && (
            <span className="text-xs text-red-500 mt-1">{errors.host.message}</span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Port *
          </label>
          <input
            {...register('port', { valueAsNumber: true })}
            type="number"
            placeholder="1433 (MSSQL), 50000 (SAP), 1521 (Oracle)"
            min={1}
            max={65535}
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.port && (
            <span className="text-xs text-red-500 mt-1">{errors.port.message}</span>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Database Name *
        </label>
        <input
          {...register('database')}
          type="text"
          placeholder="database_name"
          className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.database && (
          <span className="text-xs text-red-500 mt-1">
            {errors.database.message}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Username *
          </label>
          <input
            {...register('username')}
            type="text"
            placeholder="db_user"
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.username && (
            <span className="text-xs text-red-500 mt-1">
              {errors.username.message}
            </span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Password *
          </label>
          <input
            {...register('password')}
            type="password"
            placeholder="••••••••"
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.password && (
            <span className="text-xs text-red-500 mt-1">
              {errors.password.message}
            </span>
          )}
        </div>
      </div>

      {testResult && (
        <div
          className={`p-3 rounded text-sm ${
            testResult.includes('successful')
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {testResult}
        </div>
      )}

      <div className="flex gap-2">
        {onTestConnection && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleTestConnection}
            disabled={testLoading || isLoading}
            className="flex-1"
          >
            {testLoading ? 'Testing...' : 'Test Connection'}
          </Button>
        )}
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? 'Saving...' : isEditing ? 'Update Connection' : 'Create Connection'}
        </Button>
      </div>
    </form>
  );
};
