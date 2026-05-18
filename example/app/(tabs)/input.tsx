import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BorderBeam } from 'react-native-wgpu-components';

export default function InputScreen() {
  const [emailFocused, setEmailFocused] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [email, setEmail] = useState('');
  const [search, setSearch] = useState('');
  const [pw, setPw] = useState('');

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Inputs</Text>
      <Text style={styles.p}>
        `active` is driven by focus state. Reanimated smooths the fade-in / fade-out via
        a 400ms `withTiming` transition.
      </Text>

      <Text style={styles.label}>Email</Text>
      <BorderBeam colors="colorful" active={emailFocused} borderRadius={10} mode="aura">
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          onFocus={() => setEmailFocused(true)}
          onBlur={() => setEmailFocused(false)}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </BorderBeam>

      <Text style={styles.label}>Password</Text>
      <BorderBeam colors="ocean" active={pwFocused} borderRadius={10} mode="aura">
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#666"
          value={pw}
          onChangeText={setPw}
          onFocus={() => setPwFocused(true)}
          onBlur={() => setPwFocused(false)}
          secureTextEntry
        />
      </BorderBeam>

      <Text style={styles.label}>Search</Text>
      <BorderBeam colors="mono" active={searchFocused} borderRadius={999} mode="line">
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search…"
            placeholderTextColor="#666"
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </View>
      </BorderBeam>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0b0b0f' },
  content: { padding: 20, paddingBottom: 60 },
  h1: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 4 },
  p: { color: '#888', fontSize: 14, marginBottom: 24, lineHeight: 20 },
  label: { color: '#888', fontSize: 13, marginTop: 18, marginBottom: 8 },
  // RN-Web renders TextInput as a native <input>, which gets the user-agent focus
  // ring. outlineStyle/Width/Color are RN-Web style extensions that map directly to
  // CSS outline; cast to any so TS (which only knows the native RN style props) is
  // happy. The BorderBeam itself is the focus indicator now.
  input: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1c1c22',
    color: '#fff',
    borderRadius: 10,
    fontSize: 16,
    width: 300,
    outlineStyle: 'none',
    outlineWidth: 0,
  } as never,
  searchContainer: {
    backgroundColor: '#1c1c22',
    borderRadius: 999,
    width: 300,
    paddingHorizontal: 18,
    paddingVertical: 4,
  },
  searchInput: {
    color: '#fff',
    fontSize: 15,
    paddingVertical: 8,
    outlineStyle: 'none',
    outlineWidth: 0,
  } as never,
});
