import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import SystemInfoScreen from './src/screens/SystemInfoScreen';
import ExpenseListScreen from './src/screens/ExpenseListScreen';
import ReasonTypeScreen from './src/screens/ReasonTypeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SpeechToTextScreen from './src/screens/SpeechToTextScreen';
import CourseScheduleScreen from './src/screens/CourseScheduleScreen';
import NotificationMonitorScreen from './src/screens/NotificationMonitorScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0d6efd' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          tabBarActiveTintColor: '#0d6efd',
          tabBarInactiveTintColor: '#6c757d',
          tabBarStyle: { paddingBottom: 4, height: 56 },
        }}
      >
        <Tab.Screen
          name="SystemInfo"
          component={SystemInfoScreen}
          options={{
            title: 'System Info',
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
        <Tab.Screen
          name="ReasonType"
          component={ReasonTypeScreen}
          options={{
            title: 'Loại chi tiêu',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📋</Text>,
          }}
        />
        <Tab.Screen
          name="NotificationMonitor"
          component={NotificationMonitorScreen}
          options={{
            title: 'Thông báo',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🔔</Text>,
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
            title: 'Speech to Text',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🎤</Text>,
          }}
        /> */}
      </Tab.Navigator>
      <StatusBar style="light" />
    </NavigationContainer>
  );
}
