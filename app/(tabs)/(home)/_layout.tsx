import { Stack } from 'expo-router/stack';

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerShadowVisible: false,
        headerLargeTitle: true,
        headerLargeTitleShadowVisible: false,
        headerLargeStyle: { backgroundColor: 'transparent' },
        headerStyle: { backgroundColor: 'transparent' },
        headerTintColor: '#F0F4FF',
        headerLargeTitleStyle: { color: '#F0F4FF', fontWeight: '700' },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'StrategySignal' }} />
    </Stack>
  );
}
