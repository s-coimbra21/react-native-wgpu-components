import { useEffect, useRef } from 'react';
import { PixelRatio } from 'react-native';
import { useSurface } from 'react-native-wgpu';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { resolveColors } from './palettes';
import { BEAM_SHADER_WGSL } from './shader';
import {
  MODE_DEFAULTS,
  UNIFORM_BYTE_SIZE,
  createUniformArray,
  resolveModeSizes,
  writeUniformArray,
} from './uniforms';
import type { BorderBeamProps, ModeDefaults } from './types';
import { enableWorkletsGPU } from './enableWorklets';
import { lerpCyclic } from './perimeterMath';

export interface CursorTracking {
  /** 0 when not hovering, animated up to 1 while hovering. */
  hoverWeight: SharedValue<number>;
  /** Last-known cursor position expressed as a perimeter coord in [0,1). */
  cursorS: SharedValue<number>;
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
  // liveRef.current.resolved is overwritten every render regardless, so memoising
  // resolveProps would only save the cheap function call itself — not worth a
  // hand-rolled dep array.
  const resolved = resolveProps(props);

  const strengthSV = useAnimatedNumber(resolved.strength, 200);
  const brightnessSV = useAnimatedNumber(resolved.brightness, 200);
  const saturationSV = useAnimatedNumber(resolved.saturation, 200);
  const activeFactor = useAnimatedNumber(resolved.active ? 1 : 0, 400);

  // Only the per-render fields go through the ref; the shared values are stable
  // references captured directly by the frame closure below.
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

      const shaderModule = device.createShaderModule({
        label: 'border-beam-shader',
        code: BEAM_SHADER_WGSL,
      });

      const bindGroupLayout = device.createBindGroupLayout({
        label: 'border-beam-bgl',
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: 'uniform' },
          },
        ],
      });

      const pipelineLayout = device.createPipelineLayout({
        label: 'border-beam-pipeline-layout',
        bindGroupLayouts: [bindGroupLayout],
      });

      const pipeline = device.createRenderPipeline({
        label: 'border-beam-pipeline',
        layout: pipelineLayout,
        vertex: { module: shaderModule, entryPoint: 'vs_main' },
        fragment: {
          module: shaderModule,
          entryPoint: 'fs_main',
          targets: [
            {
              format: presentationFormat,
              blend: {
                color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
              },
              writeMask: GPUColorWrite.ALL,
            },
          ],
        },
        primitive: { topology: 'triangle-list' },
      });

      const uniformBuffer = device.createBuffer({
        label: 'border-beam-uniforms',
        size: UNIFORM_BYTE_SIZE,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      const bindGroup = device.createBindGroup({
        label: 'border-beam-bg',
        layout: bindGroupLayout,
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
      });

      const { floats, uints, buffer: uniformBytes } = createUniformArray();
      const dpr = PixelRatio.get();
      // Random phase offset so multiple instances don't orbit in lockstep.
      const startTime = performance.now() / 1000 - Math.random() * 10;
      // The head is a STATEFUL value: it advances by frameDelta/duration each frame
      // (so it integrates duration changes naturally) and gets pulled toward the
      // cursor by hoverWeight. When the cursor lifts, the head resumes from its
      // current position instead of teleporting to wherever absolute time has gone.
      // Gradient drift uses the absolute `time` uniform so colours keep flowing.
      let head = Math.random();
      let lastFrameSec = performance.now() / 1000;
      let rafHandle = 0;

      const frame = (): void => {
        if (cancelled) return;
        const live = liveRef.current;
        const tex = context.getCurrentTexture();
        const resW = tex.width;
        const resH = tex.height;
        const innerW = live.contentSize.width * dpr;
        const innerH = live.contentSize.height * dpr;
        const now = performance.now() / 1000;

        const strength = strengthSV.value * activeFactor.value;
        const brightness = brightnessSV.value;
        const saturation = saturationSV.value;

        // Resolve absolute pixel sizes from the mode's factor × element size × scale.
        // Doing this per-frame keeps the effect proportional even as the wrapped
        // content's layout changes (e.g. a focused input growing).
        const sizes = resolveModeSizes(
          live.resolved.modeDefaults,
          live.contentSize,
          live.resolved.scale,
        );

        // Advance the stateful head by per-frame delta. Then, if hovering, pull it
        // toward the cursor weighted by hoverWeight (using cyclic lerp). On hover
        // release, hoverWeight smoothly returns to 0 so the head naturally takes
        // off from its current position rather than snapping to absolute time.
        const duration = Math.max(live.resolved.duration, 0.05);
        const dt = now - lastFrameSec;
        lastFrameSec = now;
        head = head + dt / duration;
        head = head - Math.floor(head);
        if (live.cursor) {
          const w = live.cursor.hoverWeight.value;
          if (w > 0.001) {
            head = lerpCyclic(head, live.cursor.cursorS.value, w);
          }
        }
        const elapsed = now - startTime;

        writeUniformArray(floats, uints, {
          resolutionW: resW,
          resolutionH: resH,
          innerW,
          innerH,
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
          colorsRgba: live.resolved.colorsRgba,
        });

        device.queue.writeBuffer(uniformBuffer, 0, uniformBytes);

        const encoder = device.createCommandEncoder({ label: 'border-beam-encoder' });
        const pass = encoder.beginRenderPass({
          colorAttachments: [
            {
              view: tex.createView(),
              clearValue: { r: 0, g: 0, b: 0, a: 0 },
              loadOp: 'clear',
              storeOp: 'store',
            },
          ],
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3, 1, 0, 0);
        pass.end();
        device.queue.submit([encoder.finish()]);
        context.present();

        rafHandle = requestAnimationFrame(frame);
      };

      rafHandle = requestAnimationFrame(frame);

      cleanup = () => {
        if (rafHandle !== 0) cancelAnimationFrame(rafHandle);
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

