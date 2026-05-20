import { lazy } from 'react';
import type { ComponentType } from 'react';

/**
 * A wrapper around React.lazy that automatically catches chunk loading errors
 * (e.g. when a user is on an old PWA cache and a new version is deployed)
 * and forces a hard refresh to get the latest version.
 */
export const lazyWithRetry = <T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) => {
  return lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        // Assume that the error is caused by a chunk failure.
        // Set flag and force a hard reload of the page to get the latest chunk mapping.
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
        // Return a never-resolving promise so React Suspense stays pending until the reload completes
        return new Promise<{ default: T }>(() => {});
      }
      // The page has already been reloaded, so the error must be something else.
      throw error;
    }
  });
};
