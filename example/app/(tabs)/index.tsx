import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BorderBeam } from 'react-native-border-beam';

export default function ButtonsScreen() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Buttons</Text>
      <Text style={styles.p}>Every named palette × every size preset.</Text>

      <Section title="Palette: colorful">
        <Row>
          <BeamButton size="sm" colors="colorful" label="Small" />
          <BeamButton size="md" colors="colorful" label="Medium" />
          <BeamButton size="line" colors="colorful" label="Line" />
        </Row>
      </Section>

      <Section title="Palette: mono">
        <Row>
          <BeamButton size="sm" colors="mono" label="Small" />
          <BeamButton size="md" colors="mono" label="Medium" />
          <BeamButton size="line" colors="mono" label="Line" />
        </Row>
      </Section>

      <Section title="Palette: ocean">
        <Row>
          <BeamButton size="md" colors="ocean" label="Submit" />
          <BeamButton size="md" colors="ocean" label="Continue" />
        </Row>
      </Section>

      <Section title="Palette: sunset">
        <Row>
          <BeamButton size="md" colors="sunset" label="Sunset" />
          <BeamButton size="md" colors="sunset" label="Glow" />
        </Row>
      </Section>

      <Section title="active={false} (disabled)">
        <Row>
          <BeamButton size="md" colors="colorful" label="Disabled" active={false} />
          <BeamButton size="md" colors="ocean" label="Inactive" active={false} />
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
  size,
  colors,
  active,
}: {
  label: string;
  size?: 'sm' | 'md' | 'line';
  colors?: 'colorful' | 'mono' | 'ocean' | 'sunset';
  active?: boolean;
}) {
  return (
    <BorderBeam size={size} colors={colors} active={active} borderRadius={12}>
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
