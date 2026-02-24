import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          borderTopColor: '#e5e7eb',
          paddingBottom: 5,
          paddingTop: 5,
        },
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#3b82f6',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="inventory-counts"
        options={{
          title: 'Conteos Físicos',
          tabBarLabel: 'Conteos',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>
              📦
            </Text>
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Configuración',
          tabBarLabel: 'Ajustes',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>
              ⚙️
            </Text>
          ),
        }}
      />
    </Tabs>
  );
}
