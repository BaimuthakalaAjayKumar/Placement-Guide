import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { StudentNavigator } from './StudentNavigator';
import { FacultyNavigator } from './FacultyNavigator';
import { HODNavigator } from './HODNavigator';
import { PrincipalNavigator } from './PrincipalNavigator';
import { DirectorNavigator } from './DirectorNavigator';
import { UnsupportedRoleScreen } from '../screens/common/UnsupportedRoleScreen';
import { NotificationsScreen } from '../screens/common/NotificationsScreen';
import { TimetableScreen } from '../screens/common/TimetableScreen';
import { AttendanceDisputesScreen } from '../screens/common/AttendanceDisputesScreen';
import { CampusCheckInScreen } from '../screens/student/CampusCheckInScreen';
import { FacultyGuardianAlertsScreen } from '../screens/faculty/FacultyGuardianAlertsScreen';
import { ComplaintsFeedbackScreen } from '../screens/common/ComplaintsFeedbackScreen';
import { ReportsRecordsScreen } from '../screens/common/ReportsRecordsScreen';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { THEME } from '../utils/constants';

export type RootStackParamList = {
  Auth: undefined;
  StudentApp: undefined;
  FacultyApp: undefined;
  HODApp: undefined;
  PrincipalApp: undefined;
  DirectorApp: undefined;
  UnsupportedRole: undefined;
  Notifications: undefined;
  Timetable: undefined;
  AttendanceDisputes: undefined;
  CampusCheckIn: undefined;
  FacultyGuardianAlerts: undefined;
  ComplaintsFeedback: undefined;
  ReportsRecords: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root Navigation Guard
 * Enforces strict role-based routing:
 * - Unauthenticated -> Login
 * - Student -> Student Navigator
 * - Faculty -> Faculty Navigator
 * - HOD -> HOD Navigator
 * - Principal -> Principal Navigator
 * - Director -> Director Navigator
 * - Other/Unsupported Roles -> UnsupportedRoleScreen (Redirects to Web Portal)
 */
export const RootNavigator: React.FC = () => {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Securing CampusBridge session..." />;
  }

  const normalizedRole = role ? role.trim().toLowerCase() : null;

  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: THEME.colors.primary,
          background: THEME.colors.background,
          card: THEME.colors.surface,
          text: THEME.colors.text,
          border: THEME.colors.border,
          notification: THEME.colors.accent,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '900' },
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <Stack.Group>
            {normalizedRole === 'student' ? (
              <Stack.Screen name="StudentApp" component={StudentNavigator} />
            ) : normalizedRole === 'faculty' ? (
              <Stack.Screen name="FacultyApp" component={FacultyNavigator} />
            ) : normalizedRole === 'hod' ? (
              <Stack.Screen name="HODApp" component={HODNavigator} />
            ) : normalizedRole === 'principal' ? (
              <Stack.Screen name="PrincipalApp" component={PrincipalNavigator} />
            ) : normalizedRole === 'director' ? (
              <Stack.Screen name="DirectorApp" component={DirectorNavigator} />
            ) : (
              <Stack.Screen name="UnsupportedRole" component={UnsupportedRoleScreen} />
            )}
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{
                headerShown: true,
                title: 'Notification Center',
                headerStyle: { backgroundColor: THEME.colors.surface },
                headerTintColor: THEME.colors.text,
                headerTitleStyle: { fontWeight: '700' },
              }}
            />
            <Stack.Screen
              name="Timetable"
              component={TimetableScreen}
              options={{
                headerShown: true,
                title: 'Academic Timetable',
                headerStyle: { backgroundColor: THEME.colors.surface },
                headerTintColor: THEME.colors.text,
                headerTitleStyle: { fontWeight: '700' },
              }}
            />
            <Stack.Screen
              name="AttendanceDisputes"
              component={AttendanceDisputesScreen}
              options={{
                headerShown: true,
                title: 'Attendance Corrections',
                headerStyle: { backgroundColor: THEME.colors.surface },
                headerTintColor: THEME.colors.text,
                headerTitleStyle: { fontWeight: '700' },
              }}
            />
            <Stack.Screen
              name="CampusCheckIn"
              component={CampusCheckInScreen}
              options={{
                headerShown: true,
                title: 'Campus Arrival Check-In',
                headerStyle: { backgroundColor: THEME.colors.surface },
                headerTintColor: THEME.colors.text,
                headerTitleStyle: { fontWeight: '700' },
              }}
            />
            <Stack.Screen
              name="FacultyGuardianAlerts"
              component={FacultyGuardianAlertsScreen}
              options={{
                headerShown: true,
                title: 'Parent Contacts & Alerts',
                headerStyle: { backgroundColor: THEME.colors.surface },
                headerTintColor: THEME.colors.text,
                headerTitleStyle: { fontWeight: '700' },
              }}
            />
            <Stack.Screen
              name="ComplaintsFeedback"
              component={ComplaintsFeedbackScreen}
              options={{
                headerShown: true,
                title: 'Grievance & Feedback Desk',
                headerStyle: { backgroundColor: THEME.colors.surface },
                headerTintColor: THEME.colors.text,
                headerTitleStyle: { fontWeight: '700' },
              }}
            />
            <Stack.Screen
              name="ReportsRecords"
              component={ReportsRecordsScreen}
              options={{
                headerShown: true,
                title: 'Official Reports & Records',
                headerStyle: { backgroundColor: THEME.colors.surface },
                headerTintColor: THEME.colors.text,
                headerTitleStyle: { fontWeight: '700' },
              }}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
