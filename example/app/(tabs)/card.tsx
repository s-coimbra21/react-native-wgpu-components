import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BorderBeam } from 'react-native-wgpu-components';

export default function CardScreen() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Cards</Text>
      <Text style={styles.p}>Custom palettes, varied border radii, slower orbits.</Text>

      <BorderBeam
        colors={['#ff3d00', '#ffd600', '#ff3d00']}
        borderRadius={24}
        duration={3}
        mode="aura"
      >
        <View style={[styles.card, { backgroundColor: '#181820' }]}>
          <Text style={styles.cardTitle}>Sunburst</Text>
          <Text style={styles.cardBody}>
            A custom two-color palette and a 3-second orbit. Slow, warm, deliberate.
          </Text>
          <View style={[styles.tag, { backgroundColor: '#3a2a00' }]}>
            <Text style={{ color: '#ffd600' }}>Featured</Text>
          </View>
        </View>
      </BorderBeam>

      <BorderBeam
        colors="ocean"
        borderRadius={20}
        duration={2}
        brightness={1.6}
        mode="aura"
        containerStyle={{ marginTop: 24 }}
      >
        <View style={[styles.card, { backgroundColor: '#101820' }]}>
          <Text style={styles.cardTitle}>Tideline</Text>
          <Text style={styles.cardBody}>
            Ocean palette, default duration, brightness pushed for a wet, glassy
            highlight. The shader renders stroke + inner glow + outer bloom in one pass.
          </Text>
        </View>
      </BorderBeam>

      <BorderBeam
        colors="aurora"
        borderRadius={28}
        duration={1.6}
        strength={0.9}
        saturation={1.4}
        containerStyle={{ marginTop: 24 }}
      >
        <View style={[styles.card, { backgroundColor: '#15131c' }]}>
          <Text style={styles.cardTitle}>Aurora</Text>
          <Text style={styles.cardBody}>
            Three-stop palette cycling magenta → blue → green. Faster orbit, slightly
            higher saturation.
          </Text>
        </View>
      </BorderBeam>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0b0b0f' },
  content: { padding: 20, paddingBottom: 60 },
  h1: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 4 },
  p: { color: '#888', fontSize: 14, marginBottom: 24 },
  card: {
    padding: 24,
    borderRadius: 24,
    minWidth: 280,
  },
  cardTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  cardBody: { color: '#bbb', fontSize: 14, lineHeight: 22 },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 16,
  },
});
