import { Stack } from 'expo-router/stack';

export default function InputLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Evaluate Strategy' }} />
    </Stack>
  );
}
