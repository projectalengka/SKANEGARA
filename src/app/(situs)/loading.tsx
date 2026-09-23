import { RouteLoading } from '@/components/ui/RouteLoading';

/**
 * The public site's loading state.
 *
 * Lives in the `(situs)` group rather than at the root so it renders inside the
 * site shell, and so the dashboard can have its own — see
 * `src/components/ui/RouteLoading.tsx`.
 */
export default function Loading() {
  return <RouteLoading />;
}
