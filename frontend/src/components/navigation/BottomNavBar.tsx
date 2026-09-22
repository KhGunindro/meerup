import React, { useState, useEffect } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Tabs } from 'expo-router';

import { Colors, MaxContentWidth } from '@/constants/theme';

export type BottomNavBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>
>[0];

type TabRoute = BottomNavBarProps['state']['routes'][number];

type TabConfig = {
  name: string;
  label: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
  isSpecial?: boolean;
};

const TAB_CONFIGS: Record<string, TabConfig> = {
  index: {
    name: 'index',
    label: 'Home',
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
  },
  explore: {
    name: 'explore',
    label: 'Explore',
    activeIcon: 'compass',
    inactiveIcon: 'compass-outline',
  },
  meerup: {
    name: 'meerup',
    label: 'MEERUP',
    activeIcon: 'sparkles',
    inactiveIcon: 'sparkles-outline',
    isSpecial: true,
  },
  map: {
    name: 'map',
    label: 'Map',
    activeIcon: 'location-sharp',
    inactiveIcon: 'location-outline',
  },
  profile: {
    name: 'profile',
    label: 'Profile',
    activeIcon: 'person',
    inactiveIcon: 'person-outline',
  },
};

const TAB_ORDER = ['index', 'explore', 'meerup', 'map', 'profile'];

export function BottomNavBar({ state, navigation }: BottomNavBarProps) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    
    const showSubscription = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const bottomPadding = Platform.OS === 'web' ? 10 : Math.max(insets.bottom, 10);

  const validRoutes = TAB_ORDER.map((tabName) =>
    state.routes.find((route: TabRoute) => route.name === tabName)
  ).filter((route): route is TabRoute => !!route);

  if (isKeyboardVisible && Platform.OS === 'android') {
    return null;
  }

  return (
    <View
      style={[
        styles.outerContainer,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: bottomPadding,
        },
      ]}>
      <View style={styles.tabBarInner}>
        {validRoutes.map((route) => {
          const isFocused = state.routes[state.index]?.name === route.name;
          const config = TAB_CONFIGS[route.name] || {
            name: route.name,
            label: route.name,
            activeIcon: 'ellipse',
            inactiveIcon: 'ellipse-outline',
          };

          const tintColor = isFocused ? colors.tabActive : colors.tabInactive;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          // Special Center MEERUP Button
          if (config.isSpecial) {
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityRole="tab"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel="MEERUP AI Companion"
                style={({ pressed }) => [
                  styles.specialTabButton,
                  pressed && styles.pressed,
                ]}>
                <View
                  style={[
                    styles.specialIconContainer,
                    {
                      borderColor: isFocused ? colors.primary : colors.border,
                      backgroundColor: '#FFFFFF',
                    },
                  ]}>
                  <Image
                    source={require('@/assets/images/ai.png')}
                    style={styles.specialEmblemImage}
                    resizeMode="cover"
                  />
                </View>
                <Text
                  style={[
                    styles.specialLabel,
                    {
                      color: isFocused ? colors.primary : colors.textSecondary,
                      fontWeight: isFocused ? '800' : '600',
                    },
                  ]}>
                  {config.label}
                </Text>
              </Pressable>
            );
          }

          // Standard Tab Buttons (Home, Explore, Map, Profile)
          const iconName = isFocused ? config.activeIcon : config.inactiveIcon;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityRole="tab"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={`${config.label} tab`}
              style={({ pressed }) => [
                styles.tabButton,
                pressed && styles.pressed,
              ]}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name={iconName}
                  size={21}
                  color={tintColor}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: tintColor,
                    fontWeight: isFocused ? '600' : '500',
                  },
                ]}>
                {config.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    borderTopWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  tabBarInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingTop: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconContainer: {
    width: 26,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  specialTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -12,
  },
  specialIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  specialEmblemImage: {
    width: '100%',
    height: '100%',
  },
  specialLabel: {
    fontSize: 9.5,
    marginTop: 2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
});
