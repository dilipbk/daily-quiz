import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

// On web Skia is CanvasKit (WebAssembly): public/canvaskit.wasm must be fetched first.
export async function loadSkia(): Promise<void> {
  await LoadSkiaWeb();
}
