import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BorderBeam } from 'react-native-wgpu-components';

type Mode = 'aura' | 'line';
type Palette = 'colorful' | 'mono' | 'ocean' | 'sunset';

export default function ButtonsScreen() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Buttons</Text>
      <Text style={styles.p}>Each palette in both modes. The bottom row shows the scale knob.</Text>

      <Section title="Palette: colorful">
        <Row>
          <BeamButton mode="aura" colors="colorful" label="Aura" />
          <BeamButton mode="line" colors="colorful" label="Line" />
        </Row>
      </Section>

      <Section title="Palette: mono">
        <Row>
          <BeamButton mode="aura" colors="mono" label="Aura" />
          <BeamButton mode="line" colors="mono" label="Line" />
        </Row>
      </Section>

      <Section title="Palette: ocean">
        <Row>
          <BeamButton mode="aura" colors="ocean" label="Submit" />
          <BeamButton mode="line" colors="ocean" label="Continue" />
        </Row>
      </Section>

      <Section title="Palette: sunset">
        <Row>
          <BeamButton mode="aura" colors="sunset" label="Sunset" />
          <BeamButton mode="line" colors="sunset" label="Glow" />
        </Row>
      </Section>

      <Section title="Scale (same mode, same colors)">
        <Row>
          <BeamButton mode="aura" colors="colorful" label="0.5×" scale={0.5} />
          <BeamButton mode="aura" colors="colorful" label="1×" />
          <BeamButton mode="aura" colors="colorful" label="2×" scale={2} />
        </Row>
      </Section>

      <Section title="active={false} (disabled)">
        <Row>
          <BeamButton colors="colorful" label="Disabled" active={false} />
          <BeamButton colors="ocean" label="Inactive" active={false} />
        </Row>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.h2}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

function BeamButton({
  label,
  mode,
  colors,
  active,
  scale,
}: {
  label: string;
  mode?: Mode;
  colors?: Palette;
  active?: boolean;
  scale?: number;
}) {
  return (
    <BorderBeam mode={mode} colors={colors} active={active} scale={scale} borderRadius={12}>
      <View style={styles.button}>
        <Text style={styles.buttonText}>{label}</Text>
      </View>
    </BorderBeam>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0b0b0f' },
  content: { padding: 20, paddingBottom: 60 },
  h1: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 4 },
  p: { color: '#888', fontSize: 14, marginBottom: 24 },
  h2: { color: '#aaa', fontSize: 13, fontWeight: '600', marginBottom: 12, marginTop: 8, textTransform: 'uppercase', letterSpacing: 1 },
  section: { marginBottom: 28 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    backgroundColor: '#1c1c22',
    borderRadius: 12,
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '500' },
});
