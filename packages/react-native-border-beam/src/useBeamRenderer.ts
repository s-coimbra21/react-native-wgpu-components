import { useEffect, useMemo, useRef } from 'react';
import { PixelRatio } from 'react-native';
import { useSurface } from 'react-native-wgpu';
import {
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

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

export function useBeamRenderer(
  props: BorderBeamProps,
  contentSize: ContentSize,
): UseBeamRendererResult {
  const resolved = useMemo(
    () => resolveProps(props),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      props.mode,
      props.scale,
      props.colors,
      props.active,
      props.duration,
      props.strength,
      props.brightness,
      props.saturation,
      props.borderRadius,
      props.innerGlow,
    ],
  );

  const strengthSV = useSharedValue(resolved.strength);
  const brightnessSV = useSharedValue(resolved.brightness);
  const saturationSV = useSharedValue(resolved.saturation);
  const activeFactor = useSharedValue(resolved.active ? 1 : 0);

  useEffect(() => {
    strengthSV.set(withTiming(resolved.strength, { duration: 200 }));
  }, [resolved.strength, strengthSV]);
  useEffect(() => {
    brightnessSV.set(withTiming(resolved.brightness, { duration: 200 }));
  }, [resolved.brightness, brightnessSV]);
  useEffect(() => {
    saturationSV.set(withTiming(resolved.saturation, { duration: 200 }));
  }, [resolved.saturation, saturationSV]);
  useEffect(() => {
    activeFactor.set(withTiming(resolved.active ? 1 : 0, { duration: 400 }));
  }, [resolved.active, activeFactor]);

  const liveRef = useRef({
    resolved,
    contentSize,
    sv: {
      strength: strengthSV,
      brightness: brightnessSV,
      saturation: saturationSV,
      activeFactor,
    },
  });
  liveRef.current.resolved = resolved;
  liveRef.current.contentSize = contentSize;

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
      const phaseOffset = Math.random() * 10;
      const startTime = performance.now() / 1000 - phaseOffset;
      let rafHandle: number | undefined;

      const frame = (): void => {
        if (cancelled) return;
        const live = liveRef.current;
        const tex = context.getCurrentTexture();
        const resW = tex.width;
        const resH = tex.height;
        const innerW = live.contentSize.width * dpr;
        const innerH = live.contentSize.height * dpr;
        const now = performance.now() / 1000;

        const strength = readSV(live.sv.strength) * readSV(live.sv.activeFactor);
        const brightness = readSV(live.sv.brightness);
        const saturation = readSV(live.sv.saturation);

        // Resolve absolute pixel sizes from the mode's factor × element size × scale.
        // Doing this per-frame keeps the effect proportional even as the wrapped
        // content's layout changes (e.g. a focused input growing).
        const sizes = resolveModeSizes(
          live.resolved.modeDefaults,
          live.contentSize,
          live.resolved.scale,
        );

        writeUniformArray(floats, uints, {
          resolutionW: resW,
          resolutionH: resH,
          innerW,
          innerH,
          radius: live.resolved.borderRadius * dpr,
          strokeWidth: sizes.strokeWidth * dpr,
          bloomRadius: sizes.bloomRadius * dpr,
          innerGlow: live.resolved.innerGlow,
          time: now - startTime,
          duration: Math.max(live.resolved.duration, 0.05),
          strength,
          brightness,
          saturation,
          colorCount: live.resolved.colorCount,
          strokeIntensity: live.resolved.modeDefaults.strokeIntensity,
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

        rafHandle = scheduleNextFrame(frame);
      };

      rafHandle = scheduleNextFrame(frame);

      cleanup = () => {
        if (rafHandle !== undefined && typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(rafHandle);
        }
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

function readSV<T>(sv: SharedValue<T>): T {
  const anySv = sv as unknown as { get?: () => T; value: T };
  return typeof anySv.get === 'function' ? anySv.get() : anySv.value;
}

function scheduleNextFrame(fn: () => void): number {
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame(fn);
  }
  return setTimeout(fn, 16) as unknown as number;
}
