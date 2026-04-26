export function SourceErrorBanner({ inatError, dwcaError }: { inatError?: string; dwcaError?: string }) {
  if (!inatError && !dwcaError) return null;
  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      {inatError && <p>iNaturalist data may be out of date. ({inatError})</p>}
      {dwcaError && <p>INDD specimen archive could not be loaded. Showing iNaturalist data only. ({dwcaError})</p>}
    </div>
  );
}
