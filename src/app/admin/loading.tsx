import { RouteLoading } from '@/components/ui/RouteLoading';

/**
 * The dashboard's loading state.
 *
 * The public site's `loading.tsx` lives in the `(situs)` route group, and a
 * loading boundary cannot be inherited across groups — so without this file the
 * dashboard would silently lose the progress bar it had while both shared the
 * root layout.
 */
export default function Loading() {
  return <RouteLoading />;
}
