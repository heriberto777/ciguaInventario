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
        headerShown: false,
      }}
    >
      {/* ─── Tabs visibles ─── */}
      <Tabs.Screen
        name="inventory-counts"
        options={{
          title: 'Conteos Físicos',
          tabBarLabel: 'Conteos',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>📦</Text>
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reportes de Inventario',
          tabBarLabel: 'Reportes',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>📊</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="ai-audit"
        options={{
          title: 'Auditoría IA',
          tabBarLabel: 'Auditoría IA',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>🤖</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Configuración',
          tabBarLabel: 'Ajustes',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>⚙️</Text>
          ),
        }}
      />

      {/* ─── Rutas sin tab bar (pantallas de detalle/flujo) ─── */}
      <Tabs.Screen
        name="[countId]"
        options={{
          href: null,        // Excluye del tab bar
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="count-detail"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="create-count"
        options={{ href: null }}
      />
    </Tabs>
  );
}
