import { Redirect } from 'expo-router';

// Redirige a la primera pantalla de tabs (inventory-counts)
export default function TabsIndex() {
  return <Redirect href="/inventory-counts" />;
}
