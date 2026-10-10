import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FacultyDashboardScreen } from '../screens/faculty/FacultyDashboardScreen';
import { FacultyAttendanceScreen } from '../screens/faculty/FacultyAttendanceScreen';
import { FacultyProfileScreen } from '../screens/faculty/FacultyProfileScreen';
import { TimetableScreen } from '../screens/common/TimetableScreen';
import { TabBarIcon } from '../components/TabBarIcon';
import { THEME } from '../utils/constants';

export type FacultyTabParamList = {
  FacultyDashboard: undefined;
  FacultyTimetable: undefined;
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
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: THEME.colors.textMuted,
      }}
    >
      <Tab.Screen
        name="FacultyDashboard"
        component={FacultyDashboardScreen}
        options={{
          title: 'Instructor Desk',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <TabBarIcon type="dashboard" color={color} />,
        }}
      />
      <Tab.Screen
        name="FacultyTimetable"
        component={TimetableScreen}
        options={{
          title: 'Teaching Timetable',
          tabBarLabel: 'Timetable',
          tabBarIcon: ({ color }) => <TabBarIcon type="timetable" color={color} />,
        }}
      />
      <Tab.Screen
        name="FacultyAttendance"
        component={FacultyAttendanceScreen}
        options={{
          title: 'Class Attendance Controller',
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color }) => <TabBarIcon type="attendance" color={color} />,
        }}
      />
      <Tab.Screen
        name="FacultyProfile"
        component={FacultyProfileScreen}
        options={{
          title: 'Instructor Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon type="profile" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};
