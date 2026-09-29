import { ReactNode } from 'react';

export function StatCardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
      {children}
    </div>
  );
}
