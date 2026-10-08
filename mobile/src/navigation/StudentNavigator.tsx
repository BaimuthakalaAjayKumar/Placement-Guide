import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { StudentDashboardScreen } from '../screens/student/StudentDashboardScreen';
import { StudentAttendanceScreen } from '../screens/student/StudentAttendanceScreen';
import { StudentProfileScreen } from '../screens/student/StudentProfileScreen';
import { THEME } from '../utils/constants';

export type StudentTabParamList = {
  StudentDashboard: undefined;
  StudentAttendance: undefined;
  StudentProfile: undefined;
};

const Tab = createBottomTabNavigator<StudentTabParamList>();

export const StudentNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: THEME.colors.surface,
        },
        headerTitleStyle: {
          color: THEME.colors.text,
          fontWeight: '700',
        },
        tabBarStyle: {
          backgroundColor: THEME.colors.surface,
          borderTopColor: THEME.colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: THEME.colors.primary,
        tabBarInactiveTintColor: THEME.colors.textMuted,
      }}
    >
      <Tab.Screen
        name="StudentDashboard"
        component={StudentDashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📊</Text>,
        }}
      />
      <Tab.Screen
        name="StudentAttendance"
        component={StudentAttendanceScreen}
        options={{
          title: 'Attendance',
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📸</Text>,
        }}
      />
      <Tab.Screen
        name="StudentProfile"
        component={StudentProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
};
