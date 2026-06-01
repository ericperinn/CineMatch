import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

const ICONS = {
  home: { focused: 'home', unfocused: 'home-outline' },
  history: { focused: 'time', unfocused: 'time-outline' },
  profile: { focused: 'person', unfocused: 'person-outline' },
} as const;

type TabName = keyof typeof ICONS;

function tabIcon(name: TabName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons
      name={focused ? ICONS[name].focused : ICONS[name].unfocused}
      size={22}
      color={color}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(15,23,42,0.92)',
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          position: 'absolute',
          bottom: 24,
          left: 18,
          right: 18,
          borderRadius: theme.radii.xl,
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.35,
          shadowRadius: 24,
          elevation: 12,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSubtle,
        tabBarLabelStyle: {
          fontFamily: theme.typography.fontFamily.sans,
          fontWeight: '700',
          fontSize: 10,
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: 'Home', tabBarIcon: tabIcon('home') }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'History', tabBarIcon: tabIcon('history') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: tabIcon('profile') }}
      />
    </Tabs>
  );
}
