import React from 'react';
import { Button } from '../atoms/Button';

interface Company {
  id: string;
  name: string;
  email: string;
  city?: string;
  country?: string;
  userCount: number;
  isActive: boolean;
  createdAt: string;
}

interface CompaniesTableProps {
  companies: Company[];
  isLoading?: boolean;
  onEdit?: (company: Company) => void;
  onDelete?: (companyId: string) => void;
}

export const CompaniesTable: React.FC<CompaniesTableProps> = ({
  companies,
  isLoading = false,
  onEdit,
  onDelete,
}) => {
  if (isLoading) {
    return <div className="text-center py-8">Loading companies...</div>;
  }

  if (companies.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-muted)]">
        No companies found. Create one to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--bg-hover)] border-b border-[var(--border-default)]">
          <tr>
            <th className="px-4 py-3 font-semibold text-[var(--text-primary)]">Name</th>
            <th className="px-4 py-3 font-semibold text-[var(--text-primary)]">Email</th>
            <th className="px-4 py-3 font-semibold text-[var(--text-primary)]">Location</th>
            <th className="px-4 py-3 font-semibold text-[var(--text-primary)]">Users</th>
            <th className="px-4 py-3 font-semibold text-[var(--text-primary)]">Status</th>
            <th className="px-4 py-3 font-semibold text-[var(--text-primary)]">Created</th>
            <th className="px-4 py-3 font-semibold text-[var(--text-primary)]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => (
            <tr key={company.id} className="border-b border-[var(--border-default)] hover:bg-[var(--bg-hover)]">
              <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                {company.name}
              </td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">{company.email}</td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {company.city && company.country
                  ? `${company.city}, ${company.country}`
                  : company.city || company.country || '-'}
              </td>
              <td className="px-4 py-3">
                <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                  {company.userCount} user{company.userCount !== 1 ? 's' : ''}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-semibold ${company.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                    }`}
                >
                  {company.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                {new Date(company.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 space-x-1">
                {onEdit && (
                  <Button
                    variant="secondary"
                    onClick={() => onEdit(company)}
                    className="text-xs py-1 px-2"
                  >
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="danger"
                    onClick={() => onDelete(company.id)}
                    className="text-xs py-1 px-2"
                  >
                    Delete
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
