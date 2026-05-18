import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: { backgroundColor: '#0b0b0f', borderTopColor: '#1d1d22' },
        tabBarActiveTintColor: '#ffd600',
        tabBarInactiveTintColor: '#888',
        tabBarIcon: () => null,
        tabBarItemStyle: { paddingTop: 6 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Buttons' }} />
      <Tabs.Screen name="card" options={{ title: 'Card' }} />
      <Tabs.Screen name="input" options={{ title: 'Input' }} />
      <Tabs.Screen name="playground" options={{ title: 'Playground' }} />
    </Tabs>
  );
}
