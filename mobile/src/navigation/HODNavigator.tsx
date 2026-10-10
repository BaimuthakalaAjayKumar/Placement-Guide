import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HODDashboardScreen } from '../screens/hod/HODDashboardScreen';
import { HODAttendanceScreen } from '../screens/hod/HODAttendanceScreen';
import { HODFacultyScreen } from '../screens/hod/HODFacultyScreen';
import { LeadershipProfileScreen } from '../screens/common/LeadershipProfileScreen';
import { TabBarIcon } from '../components/TabBarIcon';
import { THEME } from '../utils/constants';

export type HODTabParamList = {
  HODDashboard: undefined;
  HODAttendance: undefined;
  HODFaculty: undefined;
  HODProfile: undefined;
};

const Tab = createBottomTabNavigator<HODTabParamList>();

const HODProfileWrapper: React.FC = () => (
  <LeadershipProfileScreen
    roleTitle="Head of Department"
    roleBadgeColor="#F59E0B"
    scopeDescription="Authorized to oversee academic instruction, faculty scope assignments, and student attendance within the assigned department."
  />
);

export const HODNavigator: React.FC = () => {
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
        tabBarActiveTintColor: '#F59E0B',
        tabBarInactiveTintColor: THEME.colors.textMuted,
      }}
    >
      <Tab.Screen
        name="HODDashboard"
        component={HODDashboardScreen}
        options={{
          title: 'Department Desk',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <TabBarIcon type="dashboard" color={color} />,
        }}
      />
      <Tab.Screen
        name="HODAttendance"
        component={HODAttendanceScreen}
        options={{
          title: 'Department Attendance',
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color }) => <TabBarIcon type="attendance" color={color} />,
        }}
      />
      <Tab.Screen
        name="HODFaculty"
        component={HODFacultyScreen}
        options={{
          title: 'Faculty Directory',
          tabBarLabel: 'Faculty',
          tabBarIcon: ({ color }) => <TabBarIcon type="faculty" color={color} />,
        }}
      />
      <Tab.Screen
        name="HODProfile"
        component={HODProfileWrapper}
        options={{
          title: 'Department Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon type="profile" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};
