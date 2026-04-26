'use client';

import { useEffect } from 'react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);
  return (
    <div className="nature-card p-6 text-center">
      <h2 className="text-lg font-bold text-forest-800">Something went wrong loading occurrence data.</h2>
      <p className="mt-2 text-sm text-moss-600">{error.message}</p>
      <button
        onClick={() => reset()}
        className="mt-4 rounded-md bg-forest-600 px-4 py-2 text-sm font-medium text-cream-50 hover:bg-forest-700"
      >
        Try again
      </button>
    </div>
  );
}
