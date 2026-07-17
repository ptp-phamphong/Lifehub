import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React, { useEffect, useState } from 'react';
import { Text, ActivityIndicator, View, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import SystemInfoScreen from './src/screens/SystemInfoScreen';
import ExpenseListScreen from './src/screens/ExpenseListScreen';
import ReasonTypeScreen from './src/screens/ReasonTypeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SpeechToTextScreen from './src/screens/SpeechToTextScreen';
import CourseScheduleScreen from './src/screens/CourseScheduleScreen';
import NotificationMonitorScreen from './src/screens/NotificationMonitorScreen';
import NotificationFilterScreen from './src/screens/NotificationFilterScreen';
import LoginScreen from './src/screens/LoginScreen';
import { isAuthenticated, logout } from './src/services/authService';
import { ThemeProvider, useTheme } from './src/ThemeContext';

const Tab = createBottomTabNavigator();

function AppNavigator({ onLogout }: { onLogout: () => void }) {
  const { isDark, colors } = useTheme();

  // Hỏi lại trước khi đăng xuất - lỡ tay chạm nhầm thì phải đăng nhập lại từ đầu.
  const confirmLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } finally {
            // Kể cả xóa token lỗi vẫn phải đá về màn đăng nhập,
            // nếu không người dùng kẹt lại trong app mà tưởng đã thoát.
            onLogout();
          }
        },
      },
    ]);
  };

  const navTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: colors.background,
          card: colors.headerBg,
          text: colors.text,
          border: colors.border,
          primary: colors.primary,
        },
      }
    : DefaultTheme;

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.headerBg },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            paddingBottom: 4,
            height: 56,
            backgroundColor: colors.tabBarBg,
            borderTopColor: colors.tabBarBorder,
          },
          // Đặt ở screenOptions -> nút đăng xuất có mặt trên mọi tab.
          headerRight: () => (
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={confirmLogout}
              accessibilityRole="button"
              accessibilityLabel="Đăng xuất"
            >
              <Text style={styles.logoutText}>🚪 Đăng xuất</Text>
            </TouchableOpacity>
          ),
        }}
      >
        <Tab.Screen
          name="SystemInfo"
          component={SystemInfoScreen}
          options={{
            title: 'Thông tin hệ thống',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
          }}
        />
        <Tab.Screen
          name="ExpenseList"
          component={ExpenseListScreen}
          options={{
            title: 'Chi tiêu',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📊</Text>,
          }}
        />
        {/* <Tab.Screen
          name="ReasonType"
          component={ReasonTypeScreen}
          options={{
            title: 'Loại chi tiêu',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📋</Text>,
          }}
        /> */}
        <Tab.Screen
          name="NotificationMonitor"
          component={NotificationMonitorScreen}
          options={{
            title: 'Thông báo',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🔔</Text>,
          }}
        />
        <Tab.Screen
          name="NotificationFilter"
          component={NotificationFilterScreen}
          options={{
            title: 'Bộ lọc',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🚫</Text>,
          }}
        />
        {/* <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Cài đặt',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚙️</Text>,
          }}
        /> */}
        <Tab.Screen
          name="CourseSchedule"
          component={CourseScheduleScreen}
          options={{
            title: 'Thời khóa biểu',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📅</Text>,
          }}
        />
        {/* <Tab.Screen
          name="SpeechToText"
          component={SpeechToTextScreen}
          options={{
            title: 'Giọng nói thành văn bản',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🎤</Text>,
          }}
        /> */}
      </Tab.Navigator>
      <StatusBar style={isDark ? 'light' : 'light'} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppWithAuth />
    </ThemeProvider>
  );
}

function AppWithAuth() {
  const { colors } = useTheme();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const authenticated = await isAuthenticated();
    setIsLoggedIn(authenticated);
  };

  if (isLoggedIn === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return <AppNavigator onLogout={() => setIsLoggedIn(false)} />;
}

const styles = StyleSheet.create({
  logoutButton: {
    marginRight: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  // Header nền đậm ở cả 2 theme (#0d6efd sáng / #1e293b tối) nên chữ trắng
  // hợp cả hai - khớp với headerTintColor phía trên.
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
