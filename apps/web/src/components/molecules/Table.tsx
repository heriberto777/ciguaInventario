interface TableProps<T> {
  columns: Array<{
    header: string;
    key: keyof T;
    render?: (value: any, row: T) => ReactNode;
  }>;
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
}

import { ReactNode } from 'react';

export function Table<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
}: TableProps<T>) {
  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (data.length === 0) {
    return <div className="text-center py-8 text-gray-500">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50 border-b">
              {columns.map((col) => (
                <td key={String(col.key)} className="px-4 py-2 text-sm">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
