import React from 'react';
import { Stack } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

const tabs: TabBarItem[] = [
  { name: '(home)', route: '/(tabs)/(home)', icon: 'dashboard', label: 'Dashboard' },
  { name: '(input)', route: '/(tabs)/(input)', icon: 'tune', label: 'Evaluate' },
  { name: '(feed)', route: '/(tabs)/(feed)', icon: 'lightbulb', label: 'Feed' },
  { name: '(charts)', route: '/(tabs)/(charts)', icon: 'show-chart', label: 'Charts' },
  { name: '(watchlist)', route: '/(tabs)/(watchlist)', icon: 'visibility', label: 'Watchlist' },
];

export default function TabLayout() {
  return (
    <>
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
      <FloatingTabBar
        tabs={tabs}
        containerWidth={screenWidth * 0.92}
        borderRadius={35}
        bottomMargin={20}
      />
    </>
  );
}
