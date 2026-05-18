import React, { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Canvas } from 'react-native-wgpu';

import { resolveColors } from './palettes';
import { MODE_DEFAULTS, resolveModeSizes } from './uniforms';
import type { BorderBeamProps } from './types';
import { useBeamRenderer } from './useBeamRenderer';

// Floor for the canvas overhang so the off-screen bloom never disappears entirely on
// very small wrapped content.
const MIN_BLOOM_OVERHANG_PX = 6;

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
  const { bloomRadius: bloomRadiusRaw } = resolveModeSizes(modeDefaults, contentSize, scale);
  const bloomRadius = Math.max(bloomRadiusRaw, MIN_BLOOM_OVERHANG_PX);

  // Always touch resolveColors so a bad palette throws early at the component layer rather
  // than deferred into the render loop.
  resolveColors(props.colors);

  const { canvasRef } = useBeamRenderer(props, contentSize);

  const hasSize = contentSize.width > 0 && contentSize.height > 0;
  // The Canvas is always mounted so react-native-wgpu's useSurface() (which calls
  // ref.current.getNativeSurface() in a one-shot useLayoutEffect) can resolve its
  // ref on first render. Pre-layout we just keep it invisible at 1x1.
  const canvasW = hasSize ? contentSize.width + bloomRadius * 2 : 1;
  const canvasH = hasSize ? contentSize.height + bloomRadius * 2 : 1;

  return (
    <View
      style={[styles.container, props.containerStyle]}
      testID={props.testID}
    >
      <View style={props.style} onLayout={onContentLayout}>
        {props.children}
      </View>
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
