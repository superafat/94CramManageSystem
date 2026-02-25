'use client';

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  mobileCard?: (row: T, index: number) => React.ReactNode;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  emptyMessage = '尚無資料',
  mobileCard,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-[#7b7387] text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Mobile: card list */}
      {mobileCard && (
        <div className="lg:hidden space-y-3">
          {data.map((row, i) => mobileCard(row, i))}
        </div>
      )}

      {/* Desktop: table */}
      <div className={mobileCard ? 'hidden lg:block' : 'block'}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#d8d3de]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`text-left py-3 px-3 font-medium text-[#7b7387] text-xs uppercase tracking-wider ${
                      col.hideOnMobile ? 'hidden lg:table-cell' : ''
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-[#d8d3de]/50 hover:bg-[#F5F0F7]/50 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-3 px-3 text-[#4b4355] ${
                        col.hideOnMobile ? 'hidden lg:table-cell' : ''
                      }`}
                    >
                      {col.render
                        ? col.render(row)
                        : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
