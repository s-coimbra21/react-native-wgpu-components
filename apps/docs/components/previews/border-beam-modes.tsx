'use client';

import { BorderBeam } from 'react-native-wgpu-components';
import { View, Text } from 'react-native';

export function BorderBeamModes() {
  return (
    <View style={{ flexDirection: 'row', gap: 24, flexWrap: 'wrap' }}>
      <BorderBeam mode="aura" colors="colorful" borderRadius={14}>
        <View style={cellStyle}>
          <Text style={labelStyle}>aura</Text>
        </View>
      </BorderBeam>
      <BorderBeam mode="line" colors="colorful" borderRadius={14}>
        <View style={cellStyle}>
          <Text style={labelStyle}>line</Text>
        </View>
      </BorderBeam>
    </View>
  );
}

const cellStyle = {
  paddingVertical: 14,
  paddingHorizontal: 28,
  backgroundColor: '#1d1d1d',
  borderRadius: 14,
} as const;

const labelStyle = { color: 'white', fontSize: 15 } as const;
