import React from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(home)">
        <Icon sf="chart.bar.fill" />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(input)">
        <Icon sf="slider.horizontal.3" />
        <Label>Evaluate</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(feed)">
        <Icon sf="lightbulb.fill" />
        <Label>Feed</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(charts)">
        <Icon sf="chart.line.uptrend.xyaxis" />
        <Label>Charts</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(watchlist)">
        <Icon sf="eye.fill" />
        <Label>Watchlist</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
