import { lazy, Suspense } from 'react';

const SkiaSwatch = lazy(() => import('./skia-swatch'));

export function LazySkiaSwatch() {
  return (
    <Suspense fallback={null}>
      <SkiaSwatch />
    </Suspense>
  );
}
