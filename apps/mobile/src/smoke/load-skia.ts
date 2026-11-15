// Native builds link Skia directly, so there is nothing to load. See load-skia.web.ts.
export function loadSkia(): Promise<void> {
  return Promise.resolve();
}
