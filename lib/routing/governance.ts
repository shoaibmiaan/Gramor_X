import { incompleteRouteSet, routeStatusManifest } from '@/lib/routing/routeStatusManifest';

export function isIncompleteRoute(pathname: string): boolean {
  return incompleteRouteSet.has(pathname);
}

export function isPrimaryNavEligible(pathname: string): boolean {
  return !isIncompleteRoute(pathname);
}

export function isSitemapEligible(pathname: string): boolean {
  return !isIncompleteRoute(pathname);
}

export function getRouteStatus(pathname: string) {
  return routeStatusManifest.find((entry) => entry.route === pathname);
}
