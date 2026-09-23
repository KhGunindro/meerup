import React from 'react';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { TopNavBar } from '@/components/navigation/TopNavBar';
import { BottomNavBar } from '@/components/navigation/BottomNavBar';
import { AuthProvider } from '@/context/AuthContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
      <Tabs
        tabBar={(props) => <BottomNavBar {...props} />}
        screenOptions={{
          header: () => <TopNavBar />,
          headerShown: true,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
          }}
        />
        <Tabs.Screen
          name="meerup"
          options={{
            title: 'MEERUP',
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: 'Map',
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
          }}
        />
        {/* Detail screen — hidden from tab bar */}
        <Tabs.Screen
          name="destination/[id]"
          options={{
            href: null,
            headerShown: false,
          }}
        />
        {/* 2-Person Speech-to-Speech Translator — hidden from bottom tab bar */}
        <Tabs.Screen
          name="conversation"
          options={{
            href: null,
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        />
      </Tabs>
    </ThemeProvider>
    </AuthProvider>
  );
}
