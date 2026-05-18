import { useEffect, useRef } from 'react';
import { PixelRatio } from 'react-native';
import { useSurface } from 'react-native-wgpu';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import tgpu from 'typegpu';
import * as d from 'typegpu/data';

import { resolveColors } from './palettes';
import {
  BeamUniforms,
  beamFragment,
  beamLayout,
  fullScreenTriangle,
  perimeterCoord,
} from './shader';
import { MODE_DEFAULTS, resolveModeSizes } from './uniforms';
import type { BorderBeamProps, ModeDefaults } from './types';
import { enableWorkletsGPU } from './enableWorklets';
import { lerpCyclic } from './perimeterMath';

export interface CursorTracking {
  /** 0 when not hovering, animated up to 1 while hovering. */
  hoverWeight: SharedValue<number>;
  /** Last-known cursor position in DP, centred on the wrapped content. The renderer
   * converts this to a perimeter coord each frame using the same `perimeterCoord`
   * function the shader uses on the GPU. */
  cursorX: SharedValue<number>;
  cursorY: SharedValue<number>;
}

enableWorkletsGPU();

interface ContentSize {
  width: number;
  height: number;
}

interface ResolvedProps {
  active: boolean;
  duration: number;
  strength: number;
  brightness: number;
  saturation: number;
  borderRadius: number;
  innerGlow: number;
  scale: number;
  modeDefaults: ModeDefaults;
  colorsRgba: Float32Array;
  colorCount: number;
}

function resolveProps(props: BorderBeamProps): ResolvedProps {
  const mode = props.mode ?? 'aura';
  const defaults = MODE_DEFAULTS[mode];
  const { rgba, count } = resolveColors(props.colors);
  return {
    active: props.active ?? true,
    duration: props.duration ?? 3,
    strength: props.strength ?? 1,
    brightness: props.brightness ?? 1.3,
    saturation: props.saturation ?? 1.2,
    borderRadius: props.borderRadius ?? 16,
    innerGlow: props.innerGlow ?? defaults.innerGlow,
    scale: props.scale ?? 1,
    modeDefaults: defaults,
    colorsRgba: rgba,
    colorCount: count,
  };
}

export interface UseBeamRendererResult {
  canvasRef: ReturnType<typeof useSurface>['ref'];
}

/** A shared value that eases toward `value` over `durationMs` whenever the input
 * changes. Centralises the four near-identical `useSharedValue` + `useEffect` blocks
 * that animate strength / brightness / saturation / activeFactor. */
function useAnimatedNumber(value: number, durationMs: number): SharedValue<number> {
  const sv = useSharedValue(value);
  useEffect(() => {
    sv.set(withTiming(value, { duration: durationMs }));
  }, [value, durationMs, sv]);
  return sv;
}

export function useBeamRenderer(
  props: BorderBeamProps,
  contentSize: ContentSize,
  cursorTracking?: CursorTracking,
): UseBeamRendererResult {
  const resolved = resolveProps(props);

  const strengthSV = useAnimatedNumber(resolved.strength, 200);
  const brightnessSV = useAnimatedNumber(resolved.brightness, 200);
  const saturationSV = useAnimatedNumber(resolved.saturation, 200);
  const activeFactor = useAnimatedNumber(resolved.active ? 1 : 0, 400);

  const liveRef = useRef({ resolved, contentSize, cursor: cursorTracking });
  liveRef.current.resolved = resolved;
  liveRef.current.contentSize = contentSize;
  liveRef.current.cursor = cursorTracking;

  const { ref, surface } = useSurface();

  useEffect(() => {
    if (!surface) return;
    if (typeof navigator === 'undefined' || !navigator.gpu) {
      console.warn('[react-native-border-beam] WebGPU not available in this environment.');
      return;
    }

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.warn('[react-native-border-beam] No GPU adapter available.');
        return;
      }
      if (cancelled) return;
      const device = await adapter.requestDevice();
      if (cancelled) {
        device.destroy?.();
        return;
      }

      const canvas = ref.current;
      if (!canvas) return;
      const context = canvas.getContext('webgpu');
      if (!context) {
        console.warn('[react-native-border-beam] WebGPU canvas context unavailable.');
        return;
      }

      const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
      context.configure({
        device,
        format: presentationFormat,
        alphaMode: 'premultiplied',
      });

      const root = tgpu.initFromDevice({ device });
      const uniformsBuffer = root.createBuffer(BeamUniforms).$usage('uniform');
      const bindGroup = root.createBindGroup(beamLayout, { uniforms: uniformsBuffer });
      const pipeline = root.createRenderPipeline({
        vertex: fullScreenTriangle,
        fragment: beamFragment,
        primitive: { topology: 'triangle-list' },
        targets: {
          format: presentationFormat,
          blend: {
            color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          },
          writeMask: GPUColorWrite.ALL,
        },
      });

      const dpr = PixelRatio.get();
      // Random initial head so multiple instances don't orbit in lockstep.
      const startTime = performance.now() / 1000 - Math.random() * 10;
      // The head is a STATEFUL value: it advances by frameDelta/duration each frame
      // and gets pulled toward the cursor by hoverWeight. When the cursor lifts, the
      // head resumes from its current position instead of teleporting to wherever
      // absolute time has gone. Gradient drift uses absolute `time` so colours flow.
      let head = Math.random();
      let lastFrameSec = performance.now() / 1000;
      let rafHandle = 0;

      // Scratch vec2 for repeated cursor → perimeter conversion.
      const cursorVec = d.vec2f(0, 0);
      const halfInnerVec = d.vec2f(0, 0);
      // Per-frame scratch for colour stops (8 vec4f from the typed palette).
      const colorVecs: d.v4f[] = Array.from({ length: 8 }, () => d.vec4f(0, 0, 0, 0));

      const frame = (): void => {
        if (cancelled) return;
        const live = liveRef.current;
        const tex = context.getCurrentTexture();
        const innerW = live.contentSize.width * dpr;
        const innerH = live.contentSize.height * dpr;
        const now = performance.now() / 1000;

        const strength = strengthSV.value * activeFactor.value;
        const brightness = brightnessSV.value;
        const saturation = saturationSV.value;

        // Resolve absolute pixel sizes from the mode's factor × element size × scale.
        const sizes = resolveModeSizes(
          live.resolved.modeDefaults,
          live.contentSize,
          live.resolved.scale,
        );

        // Advance head by per-frame delta. Then, if hovering, pull toward cursor
        // using the SHARED perimeterCoord (same function the shader uses).
        const duration = Math.max(live.resolved.duration, 0.05);
        const dt = now - lastFrameSec;
        lastFrameSec = now;
        head = head + dt / duration;
        head = head - Math.floor(head);
        if (live.cursor) {
          const w = live.cursor.hoverWeight.value;
          if (w > 0.001) {
            cursorVec.x = live.cursor.cursorX.value;
            cursorVec.y = live.cursor.cursorY.value;
            halfInnerVec.x = live.contentSize.width / 2;
            halfInnerVec.y = live.contentSize.height / 2;
            head = lerpCyclic(head, perimeterCoord(cursorVec, halfInnerVec), w);
          }
        }
        const elapsed = now - startTime;

        const c = live.resolved.colorsRgba;
        for (let i = 0; i < 8; i++) {
          const o = i * 4;
          const v = colorVecs[i]!;
          v.x = c[o] ?? 0;
          v.y = c[o + 1] ?? 0;
          v.z = c[o + 2] ?? 0;
          v.w = c[o + 3] ?? 0;
        }

        uniformsBuffer.write({
          resolution: d.vec2f(tex.width, tex.height),
          innerSize: d.vec2f(innerW, innerH),
          radius: live.resolved.borderRadius * dpr,
          strokeWidth: sizes.strokeWidth * dpr,
          bloomRadius: sizes.bloomRadius * dpr,
          innerGlow: live.resolved.innerGlow,
          time: elapsed,
          duration,
          strength,
          brightness,
          saturation,
          colorCount: live.resolved.colorCount,
          strokeIntensity: live.resolved.modeDefaults.strokeIntensity,
          head,
          colors: colorVecs,
        });

        pipeline
          .with(bindGroup)
          .withColorAttachment({
            view: tex.createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: 'clear',
            storeOp: 'store',
          })
          .draw(3);
        context.present();

        rafHandle = requestAnimationFrame(frame);
      };

      rafHandle = requestAnimationFrame(frame);

      cleanup = () => {
        if (rafHandle !== 0) cancelAnimationFrame(rafHandle);
        root.destroy();
        device.destroy?.();
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surface]);

  return { canvasRef: ref };
}
