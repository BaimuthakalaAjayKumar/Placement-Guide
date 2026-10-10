import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PrincipalDashboardScreen } from '../screens/principal/PrincipalDashboardScreen';
import { PrincipalAttendanceScreen } from '../screens/principal/PrincipalAttendanceScreen';
import { PrincipalStaffScreen } from '../screens/principal/PrincipalStaffScreen';
import { LeadershipProfileScreen } from '../screens/common/LeadershipProfileScreen';
import { TabBarIcon } from '../components/TabBarIcon';
import { THEME } from '../utils/constants';

export type PrincipalTabParamList = {
  PrincipalDashboard: undefined;
  PrincipalAttendance: undefined;
  PrincipalStaff: undefined;
  PrincipalProfile: undefined;
};

const Tab = createBottomTabNavigator<PrincipalTabParamList>();

const PrincipalProfileWrapper: React.FC = () => (
  <LeadershipProfileScreen
    roleTitle="Institutional Principal"
    roleBadgeColor="#06B6D4"
    scopeDescription="Authorized to supervise all academic departments, campus-wide classroom operations, faculty rosters, and institutional attendance compliance."
  />
);

export const PrincipalNavigator: React.FC = () => {
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
        tabBarActiveTintColor: '#06B6D4',
        tabBarInactiveTintColor: THEME.colors.textMuted,
      }}
    >
      <Tab.Screen
        name="PrincipalDashboard"
        component={PrincipalDashboardScreen}
        options={{
          title: "Principal's Desk",
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <TabBarIcon type="dashboard" color={color} />,
        }}
      />
      <Tab.Screen
        name="PrincipalAttendance"
        component={PrincipalAttendanceScreen}
        options={{
          title: 'Campus Attendance',
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color }) => <TabBarIcon type="attendance" color={color} />,
        }}
      />
      <Tab.Screen
        name="PrincipalStaff"
        component={PrincipalStaffScreen}
        options={{
          title: 'Campus Staff Roster',
          tabBarLabel: 'Staff',
          tabBarIcon: ({ color }) => <TabBarIcon type="staff" color={color} />,
        }}
      />
      <Tab.Screen
        name="PrincipalProfile"
        component={PrincipalProfileWrapper}
        options={{
          title: 'Principal Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon type="profile" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};
