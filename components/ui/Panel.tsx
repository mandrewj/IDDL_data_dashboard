import { cn } from '@/lib/utils/cn';
import { ReactNode } from 'react';

export function Panel({
  title,
  description,
  children,
  className,
  actions,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={cn('nature-card p-5', className)}>
      {(title || actions) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h2 className="leaf-rule text-base font-bold text-forest-800">{title}</h2>
            )}
            {description && (
              <p className="mt-1.5 text-xs text-moss-600">{description}</p>
            )}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
