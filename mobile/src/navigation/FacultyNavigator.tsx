import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { FacultyDashboardScreen } from '../screens/faculty/FacultyDashboardScreen';
import { FacultyAttendanceScreen } from '../screens/faculty/FacultyAttendanceScreen';
import { FacultyProfileScreen } from '../screens/faculty/FacultyProfileScreen';
import { THEME } from '../utils/constants';

export type FacultyTabParamList = {
  FacultyDashboard: undefined;
  FacultyAttendance: undefined;
  FacultyProfile: undefined;
};

const Tab = createBottomTabNavigator<FacultyTabParamList>();

export const FacultyNavigator: React.FC = () => {
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
        tabBarActiveTintColor: '#10B981', // Green accent for faculty instructor portal
        tabBarInactiveTintColor: THEME.colors.textMuted,
      }}
    >
      <Tab.Screen
        name="FacultyDashboard"
        component={FacultyDashboardScreen}
        options={{
          title: 'Instructor Hub',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🎓</Text>,
        }}
      />
      <Tab.Screen
        name="FacultyAttendance"
        component={FacultyAttendanceScreen}
        options={{
          title: 'Class Attendance',
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📋</Text>,
        }}
      />
      <Tab.Screen
        name="FacultyProfile"
        component={FacultyProfileScreen}
        options={{
          title: 'Faculty Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
};
