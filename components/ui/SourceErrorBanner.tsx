export function SourceErrorBanner({ inatError, dwcaError }: { inatError?: string; dwcaError?: string }) {
  if (!inatError && !dwcaError) return null;
  return (
    <div className="mb-4 rounded-lg border border-ochre-400/40 bg-ochre-400/10 px-3 py-2 text-xs text-ochre-600">
      {inatError && <p>iNaturalist data may be out of date. ({inatError})</p>}
      {dwcaError && <p>INDD specimen archive could not be loaded. Showing iNaturalist data only. ({dwcaError})</p>}
    </div>
  );
}
