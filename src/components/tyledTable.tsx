import React from 'react';

interface Column {
  header: string;
  accessor: string;
}

interface TableProps {
  columns: Column[];
  data: any[];
}

export const StyledTable: React.FC<TableProps> = ({ columns, data }) => {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
      <table className="w-full text-left text-sm text-gray-600">
        <thead className="bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="px-6 py-4">{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row, rowIdx) => (
            <tr key={rowIdx} className="transition-colors hover:bg-slate-50/80">
              {columns.map((col, colIdx) => (
                <td key={colIdx} className="whitespace-nowrap px-6 py-4 font-medium text-gray-800">
                  {row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
