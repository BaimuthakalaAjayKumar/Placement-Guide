import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { StudentNavigator } from './StudentNavigator';
import { FacultyNavigator } from './FacultyNavigator';
import { UnsupportedRoleScreen } from '../screens/common/UnsupportedRoleScreen';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { THEME } from '../utils/constants';

export type RootStackParamList = {
  Auth: undefined;
  StudentApp: undefined;
  FacultyApp: undefined;
  UnsupportedRole: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root Navigation Guard
 * Enforces strict role-based routing:
 * - Unauthenticated -> Login
 * - Student -> Student Navigator
 * - Faculty -> Faculty Navigator
 * - Unsupported Roles -> UnsupportedRoleScreen (Redirects to Web Portal)
 */
export const RootNavigator: React.FC = () => {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Securing CampusBridge session..." />;
  }

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
        ) : role === 'student' ? (
          <Stack.Screen name="StudentApp" component={StudentNavigator} />
        ) : role === 'faculty' ? (
          <Stack.Screen name="FacultyApp" component={FacultyNavigator} />
        ) : (
          <Stack.Screen name="UnsupportedRole" component={UnsupportedRoleScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
