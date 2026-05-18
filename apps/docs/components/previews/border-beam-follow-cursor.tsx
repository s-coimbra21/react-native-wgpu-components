'use client';

import { BorderBeam } from 'react-native-wgpu-components';
import { View, Text } from 'react-native';

export function BorderBeamFollowCursor() {
  return (
    <BorderBeam followCursor colors="ocean" borderRadius={16}>
      <View style={{ padding: 22, backgroundColor: '#0e1620', borderRadius: 16, minWidth: 220 }}>
        <Text style={{ color: '#dfeaff', fontSize: 15 }}>Hover me</Text>
        <Text style={{ color: '#7895ad', fontSize: 12, marginTop: 6 }}>
          The bright sweep tracks the cursor.
        </Text>
      </View>
    </BorderBeam>
  );
}
