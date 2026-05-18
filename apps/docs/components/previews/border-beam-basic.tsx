'use client';

import { BorderBeam } from 'react-native-wgpu-components';
import { View, Text } from 'react-native';

export function BorderBeamBasic() {
  return (
    <BorderBeam colors="colorful" borderRadius={16} duration={3}>
      <View style={{ padding: 24, backgroundColor: '#1d1d1d', borderRadius: 16 }}>
        <Text style={{ color: 'white', fontSize: 16 }}>Hello, beam.</Text>
      </View>
    </BorderBeam>
  );
}
