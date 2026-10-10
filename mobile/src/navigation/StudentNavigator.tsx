import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StudentDashboardScreen } from '../screens/student/StudentDashboardScreen';
import { StudentAttendanceScreen } from '../screens/student/StudentAttendanceScreen';
import { StudentProfileScreen } from '../screens/student/StudentProfileScreen';
import { TimetableScreen } from '../screens/common/TimetableScreen';
import { TabBarIcon } from '../components/TabBarIcon';
import { THEME } from '../utils/constants';

export type StudentTabParamList = {
  StudentDashboard: undefined;
  StudentTimetable: undefined;
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
          title: 'Student Desk',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <TabBarIcon type="dashboard" color={color} />,
        }}
      />
      <Tab.Screen
        name="StudentTimetable"
        component={TimetableScreen}
        options={{
          title: 'Class Timetable',
          tabBarLabel: 'Timetable',
          tabBarIcon: ({ color }) => <TabBarIcon type="timetable" color={color} />,
        }}
      />
      <Tab.Screen
        name="StudentAttendance"
        component={StudentAttendanceScreen}
        options={{
          title: 'Class Attendance',
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color }) => <TabBarIcon type="scan" color={color} />,
        }}
      />
      <Tab.Screen
        name="StudentProfile"
        component={StudentProfileScreen}
        options={{
          title: 'Student Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon type="profile" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};
