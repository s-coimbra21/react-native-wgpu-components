import React, { useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Canvas } from 'react-native-wgpu';
import { useSharedValue, withTiming } from 'react-native-reanimated';

import { perimeterCoordJS } from './perimeterMath';
import { MODE_DEFAULTS, resolveModeSizes } from './uniforms';
import type { BorderBeamProps } from './types';
import { useBeamRenderer, type CursorTracking } from './useBeamRenderer';

export function BorderBeam(props: BorderBeamProps): React.ReactElement {
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });
  const onContentLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== contentSize.width || height !== contentSize.height) {
      setContentSize({ width, height });
    }
  };

  const modeDefaults = MODE_DEFAULTS[props.mode ?? 'aura'];
  const scale = props.scale ?? 1;
  const { bloomRadius } = resolveModeSizes(modeDefaults, contentSize, scale);

  // Cursor-tracking shared values are always allocated. Making them conditional on
  // followCursor would require splitting BorderBeam into two top-level components
  // and swapping based on the flag, which would force a full canvas remount every
  // time a consumer toggles the prop at runtime. The two extra useSharedValue
  // calls are essentially free (one tiny object each, lifetime = component) so we
  // pay that cost and let `cursorTracking` be the explicit feature signal.
  const hoverWeight = useSharedValue(0);
  const cursorS = useSharedValue(0);
  const cursorTracking: CursorTracking | undefined = props.followCursor
    ? { hoverWeight, cursorS }
    : undefined;

  const { canvasRef } = useBeamRenderer(props, contentSize, cursorTracking);

  const hasSize = contentSize.width > 0 && contentSize.height > 0;
  const canvasW = hasSize ? contentSize.width + bloomRadius * 2 : 1;
  const canvasH = hasSize ? contentSize.height + bloomRadius * 2 : 1;

  // Inner View — wrapped by a GestureDetector when followCursor is on.
  const inner = (
    <View style={props.style} onLayout={onContentLayout}>
      {props.children}
    </View>
  );

  return (
    <View
      style={[styles.container, props.containerStyle]}
      testID={props.testID}
    >
      {props.followCursor ? (
        <HoverTracker
          contentSize={contentSize}
          hoverWeight={hoverWeight}
          cursorS={cursorS}
        >
          {inner}
        </HoverTracker>
      ) : (
        inner
      )}
      <Canvas
        ref={canvasRef}
        style={[
          styles.canvas,
          {
            top: -bloomRadius,
            left: -bloomRadius,
            width: canvasW,
            height: canvasH,
            opacity: hasSize ? 1 : 0,
          },
        ]}
        transparent
        pointerEvents="none"
      />
    </View>
  );
}

interface HoverTrackerProps {
  contentSize: { width: number; height: number };
  hoverWeight: ReturnType<typeof useSharedValue<number>>;
  cursorS: ReturnType<typeof useSharedValue<number>>;
  children: React.ReactNode;
}

function HoverTracker({ contentSize, hoverWeight, cursorS, children }: HoverTrackerProps) {
  // react-native-gesture-handler is an optional peer dep — load it lazily so consumers
  // who never opt into followCursor don't have to install it.
  const mods = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const gh = require('react-native-gesture-handler') as typeof import('react-native-gesture-handler');
      return { GestureDetector: gh.GestureDetector, Gesture: gh.Gesture };
    } catch {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(
          '[react-native-border-beam] followCursor requires react-native-gesture-handler. Install it to enable hover tracking.',
        );
      }
      return null;
    }
  }, []);

  const halfW = contentSize.width / 2;
  const halfH = contentSize.height / 2;

  const gesture = useMemo(() => {
    if (!mods) return null;
    return mods.Gesture.Hover()
      .onBegin(() => {
        'worklet';
        hoverWeight.set(withTiming(1, { duration: 200 }));
      })
      .onUpdate((e: { x: number; y: number }) => {
        'worklet';
        cursorS.set(perimeterCoordJS(e.x - halfW, e.y - halfH, halfW, halfH));
      })
      .onFinalize(() => {
        'worklet';
        hoverWeight.set(withTiming(0, { duration: 400 }));
      });
  }, [mods, halfW, halfH, hoverWeight, cursorS]);

  if (!mods || !gesture) {
    return <>{children}</>;
  }
  const { GestureDetector } = mods;
  return <GestureDetector gesture={gesture}>{children}</GestureDetector>;
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  canvas: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
});
