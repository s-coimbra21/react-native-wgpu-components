import { Platform } from 'react-native';

let enabled = false;

// Best-effort enable of WebGPU bindings inside Reanimated worklets on native.
// The current render loop runs on the JS thread; this is in place so a future
// revision can flip to UI-thread rendering without API changes.
// Web has no worklet runtime, so this is a no-op there.
export function enableWorkletsGPU(): void {
  if (enabled || Platform.OS === 'web') return;
  enabled = true;
  try {
    // Conditional require so the web bundler doesn't try to resolve a native-only module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-webgpu-worklets') as
      | { enableGPUForWorklets?: () => void }
      | undefined;
    mod?.enableGPUForWorklets?.();
  } catch {
    // Module not installed or host doesn't support it — silent fallback.
  }
}
