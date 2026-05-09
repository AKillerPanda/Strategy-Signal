import React from 'react';
import { Stack } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { View, useWindowDimensions } from 'react-native';
import { COLORS } from '@/styles/colors';

const tabs: TabBarItem[] = [
  { name: '(home)', route: '/(tabs)/(home)', icon: 'dashboard', label: 'Dashboard' },
  { name: '(input)', route: '/(tabs)/(input)', icon: 'tune', label: 'Evaluate' },
  { name: '(feed)', route: '/(tabs)/(feed)', icon: 'lightbulb', label: 'Feed' },
  { name: '(charts)', route: '/(tabs)/(charts)', icon: 'show_chart', label: 'Charts' },
  { name: '(watchlist)', route: '/(tabs)/(watchlist)', icon: 'visibility', label: 'Watchlist' },
];

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const tabBarWidth = Math.min(width - 24, 520);
  const tabBarInset = 108;

  return (
    <>
      <View style={{ flex: 1, paddingBottom: tabBarInset, backgroundColor: COLORS.background }}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'none',
          }}
        >
          <Stack.Screen name="(home)" />
          <Stack.Screen name="(input)" />
          <Stack.Screen name="(feed)" />
          <Stack.Screen name="(charts)" />
          <Stack.Screen name="(watchlist)" />
        </Stack>
      </View>
      <FloatingTabBar
        tabs={tabs}
        containerWidth={tabBarWidth}
        borderRadius={35}
        bottomMargin={20}
      />
    </>
  );
}
