'use client';

import dynamic from 'next/dynamic';

// Each preview imports react-native-web, Reanimated, and react-native-wgpu —
// modules that touch `window` on load and break static prerendering. Wrap
// them in next/dynamic with ssr disabled so the server build renders a
// placeholder, and the client mounts the live component after hydration.
//
// next/dynamic insists on inline object literals for its options so it can be
// statically analyzed at build time, hence the repetition below.

const Loading = () => (
  <div style={{ color: '#888', fontSize: 13 }}>Loading preview…</div>
);

export const BorderBeamBasic = dynamic(
  () => import('./border-beam-basic').then((m) => m.BorderBeamBasic),
  { ssr: false, loading: Loading },
);

export const BorderBeamModes = dynamic(
  () => import('./border-beam-modes').then((m) => m.BorderBeamModes),
  { ssr: false, loading: Loading },
);

export const BorderBeamFollowCursor = dynamic(
  () => import('./border-beam-follow-cursor').then((m) => m.BorderBeamFollowCursor),
  { ssr: false, loading: Loading },
);
