import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/templates/AdminLayout';
import { CompanyForm } from '@/components/organisms/CompanyForm';
import { CompaniesTable } from '@/components/organisms/CompaniesTable';
import { Button } from '@/components/atoms/Button';
import { getApiClient } from '@/services/api';

interface Company {
  id: string;
  name: string;
  description?: string;
  email: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  isActive: boolean;
  userCount: number;
  createdAt: string;
}

interface CompaniesResponse {
  data: Company[];
  pagination: {
    skip: number;
    take: number;
    total: number;
  };
}

const ITEMS_PER_PAGE = 10;

export const CompaniesContent: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch companies
  const { data: companiesData, isLoading: companiesLoading } =
    useQuery<CompaniesResponse>({
      queryKey: ['companies', currentPage, searchTerm],
      queryFn: async () => {
        const params = new URLSearchParams({
          skip: (currentPage * ITEMS_PER_PAGE).toString(),
          take: ITEMS_PER_PAGE.toString(),
          search: searchTerm,
        });
        const response = await getApiClient().get(`/companies?${params}`);
        return response.data;
      },
    });

  // Create company mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      email: string;
      phone?: string;
      website?: string;
      address?: string;
      city?: string;
      country?: string;
    }) => {
      const response = await getApiClient().post('/companies', data);
      return response.data;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setShowForm(false);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error creando empresa';
      setError(message);
    },
  });

  // Update company mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        name?: string;
        description?: string;
        email?: string;
        phone?: string;
        website?: string;
        address?: string;
        city?: string;
        country?: string;
      };
    }) => {
      const response = await getApiClient().patch(`/companies/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setEditingCompany(null);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error actualizando empresa';
      setError(message);
    },
  });

  // Delete company mutation
  const deleteMutation = useMutation({
    mutationFn: async (companyId: string) => {
      await getApiClient().delete(`/companies/${companyId}`);
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error.message || 'Error eliminando empresa';
      setError(message);
    },
  });

  const handleCreate = async (data: {
    name: string;
    description?: string;
    email: string;
    phone?: string;
    website?: string;
    address?: string;
    city?: string;
    country?: string;
  }) => {
    await createMutation.mutateAsync(data);
  };

  const handleUpdate = async (data: {
    name: string;
    description?: string;
    email: string;
    phone?: string;
    website?: string;
    address?: string;
    city?: string;
    country?: string;
  }) => {
    if (!editingCompany) return;
    await updateMutation.mutateAsync({
      id: editingCompany.id,
      data,
    });
  };

  const handleDelete = async (companyId: string) => {
    if (confirm('Are you sure you want to delete this company?')) {
      await deleteMutation.mutateAsync(companyId);
    }
  };

  const totalPages = companiesData
    ? Math.ceil(companiesData.pagination.total / ITEMS_PER_PAGE)
    : 0;

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
            <p className="text-gray-600 mt-1">Manage multi-tenant companies</p>
          </div>
          <Button
            onClick={() => {
              setEditingCompany(null);
              setShowForm(!showForm);
              setError(null);
            }}
            disabled={showForm}
          >
            {showForm ? 'Cancel' : 'Create Company'}
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">Error</h3>
                <p className="text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingCompany ? 'Edit Company' : 'Create New Company'}
            </h2>
            <CompanyForm
              onSubmit={editingCompany ? handleUpdate : handleCreate}
              initialData={
                editingCompany
                  ? {
                      name: editingCompany.name,
                      description: editingCompany.description,
                      email: editingCompany.email,
                      phone: editingCompany.phone,
                      website: editingCompany.website,
                      address: editingCompany.address,
                      city: editingCompany.city,
                      country: editingCompany.country,
                    }
                  : undefined
              }
              isLoading={
                createMutation.isPending || updateMutation.isPending
              }
            />
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-4">
          <input
            type="text"
            placeholder="Search companies by name or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(0);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow">
          <CompaniesTable
            companies={companiesData?.data || []}
            isLoading={companiesLoading}
            onEdit={(company) => {
              setEditingCompany(company);
              setShowForm(true);
            }}
            onDelete={handleDelete}
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
              Previous
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
              Next
            </Button>
          </div>
        )}

        {/* Status messages */}
        {deleteMutation.isError && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            Error deleting company. Please try again.
          </div>
        )}
      </div>
    );
};

export const CompaniesPage: React.FC = () => {
  return (
    <AdminLayout>
      <CompaniesContent />
    </AdminLayout>
  );
};
