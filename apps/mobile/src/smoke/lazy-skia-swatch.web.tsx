import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

// On web the canvas can only render once CanvasKit's WebAssembly has loaded.
export function LazySkiaSwatch() {
  return <WithSkiaWeb getComponent={() => import('./skia-swatch')} fallback={null} />;
}
