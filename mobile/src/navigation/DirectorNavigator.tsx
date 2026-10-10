import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DirectorDashboardScreen } from '../screens/director/DirectorDashboardScreen';
import { DirectorAttendanceScreen } from '../screens/director/DirectorAttendanceScreen';
import { DirectorGovernanceScreen } from '../screens/director/DirectorGovernanceScreen';
import { LeadershipProfileScreen } from '../screens/common/LeadershipProfileScreen';
import { TabBarIcon } from '../components/TabBarIcon';
import { THEME } from '../utils/constants';

export type DirectorTabParamList = {
  DirectorDashboard: undefined;
  DirectorAttendance: undefined;
  DirectorGovernance: undefined;
  DirectorProfile: undefined;
};

const Tab = createBottomTabNavigator<DirectorTabParamList>();

const DirectorProfileWrapper: React.FC = () => (
  <LeadershipProfileScreen
    roleTitle="Executive Director"
    roleBadgeColor="#8B5CF6"
    scopeDescription="Authorized to conduct high-level institutional governance, institutional attendance analytics, campus audit inspection, and executive performance oversight."
  />
);

export const DirectorNavigator: React.FC = () => {
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
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: THEME.colors.textMuted,
      }}
    >
      <Tab.Screen
        name="DirectorDashboard"
        component={DirectorDashboardScreen}
        options={{
          title: 'Executive Suite',
          tabBarLabel: 'Executive',
          tabBarIcon: ({ color }) => <TabBarIcon type="dashboard" color={color} />,
        }}
      />
      <Tab.Screen
        name="DirectorAttendance"
        component={DirectorAttendanceScreen}
        options={{
          title: 'Institutional Attendance',
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color }) => <TabBarIcon type="attendance" color={color} />,
        }}
      />
      <Tab.Screen
        name="DirectorGovernance"
        component={DirectorGovernanceScreen}
        options={{
          title: 'Audit & Telemetry',
          tabBarLabel: 'Governance',
          tabBarIcon: ({ color }) => <TabBarIcon type="governance" color={color} />,
        }}
      />
      <Tab.Screen
        name="DirectorProfile"
        component={DirectorProfileWrapper}
        options={{
          title: 'Director Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon type="profile" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};
