import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { BorderBeam, type Mode, type PalettePreset } from 'react-native-border-beam';

const PALETTES: PalettePreset[] = ['colorful', 'mono', 'ocean', 'sunset'];
const MODES: Mode[] = ['aura', 'line'];

export default function PlaygroundScreen() {
  const [palette, setPalette] = useState<PalettePreset>('colorful');
  const [mode, setMode] = useState<Mode>('aura');
  const [scale, setScale] = useState(1);
  const [active, setActive] = useState(true);
  const [followCursor, setFollowCursor] = useState(false);
  const [duration, setDuration] = useState(3);
  const [strength, setStrength] = useState(1);
  const [brightness, setBrightness] = useState(1.3);
  const [saturation, setSaturation] = useState(1.2);
  const [borderRadius, setBorderRadius] = useState(20);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Playground</Text>
      <Text style={styles.p}>Tweak every prop live. The preview re-renders on each change.</Text>

      <View style={styles.previewWrap}>
        <BorderBeam
          colors={palette}
          mode={mode}
          scale={scale}
          active={active}
          followCursor={followCursor}
          duration={duration}
          strength={strength}
          brightness={brightness}
          saturation={saturation}
          borderRadius={borderRadius}
        >
          <View style={[styles.preview, { borderRadius }]}>
            <Text style={styles.previewTitle}>Preview</Text>
            <Text style={styles.previewSubtitle}>
              {palette} · {mode} · {scale.toFixed(2)}× · {active ? 'active' : 'inactive'}
            </Text>
          </View>
        </BorderBeam>
      </View>

      <Group title="Palette">
        <SegmentedControl
          options={PALETTES}
          value={palette}
          onChange={setPalette}
        />
      </Group>

      <Group title="Mode">
        <SegmentedControl options={MODES} value={mode} onChange={setMode} />
      </Group>

      <Group title="Active">
        <Switch
          value={active}
          onValueChange={setActive}
          thumbColor={active ? '#ffd600' : '#666'}
        />
      </Group>

      <Group title="Follow cursor (hover the preview)">
        <Switch
          value={followCursor}
          onValueChange={setFollowCursor}
          thumbColor={followCursor ? '#ffd600' : '#666'}
        />
      </Group>

      <Stepper label="Scale" value={scale} min={0.25} max={3} step={0.25} onChange={setScale} />
      <Stepper label="Duration (s)" value={duration} min={0.2} max={6} step={0.2} onChange={setDuration} />
      <Stepper label="Strength" value={strength} min={0} max={1} step={0.1} onChange={setStrength} />
      <Stepper label="Brightness" value={brightness} min={0.4} max={3} step={0.1} onChange={setBrightness} />
      <Stepper label="Saturation" value={saturation} min={0} max={2.5} step={0.1} onChange={setSaturation} />
      <Stepper label="Border radius" value={borderRadius} min={0} max={64} step={2} onChange={setBorderRadius} />
    </ScrollView>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupBody}>{children}</View>
    </View>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segments}>
      {options.map((opt) => (
        <Pressable
          key={opt}
          onPress={() => onChange(opt)}
          style={[styles.segment, opt === value && styles.segmentActive]}
        >
          <Text style={[styles.segmentText, opt === value && styles.segmentTextActive]}>
            {opt}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const dec = () => onChange(Math.max(min, +(value - step).toFixed(2)));
  const inc = () => onChange(Math.min(max, +(value + step).toFixed(2)));
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable onPress={dec} style={styles.stepBtn}>
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{value.toFixed(2)}</Text>
        <Pressable onPress={inc} style={styles.stepBtn}>
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0b0b0f' },
  content: { padding: 20, paddingBottom: 80 },
  h1: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 4 },
  p: { color: '#888', fontSize: 14, marginBottom: 24 },
  previewWrap: { alignItems: 'center', marginBottom: 32 },
  preview: {
    width: 240,
    height: 140,
    backgroundColor: '#1c1c22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  previewSubtitle: { color: '#aaa', fontSize: 12, marginTop: 6 },
  group: { marginBottom: 18 },
  groupTitle: { color: '#888', fontSize: 13, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  groupBody: {},
  segments: { flexDirection: 'row', backgroundColor: '#15151a', borderRadius: 10, padding: 4 },
  segment: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentActive: { backgroundColor: '#26262e' },
  segmentText: { color: '#888', fontSize: 13 },
  segmentTextActive: { color: '#fff', fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepBtn: { width: 40, height: 40, backgroundColor: '#1c1c22', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { color: '#fff', fontSize: 20 },
  stepValue: { color: '#fff', fontSize: 16, minWidth: 60, textAlign: 'center' },
});
