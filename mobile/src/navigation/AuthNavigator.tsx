import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { StudentFaceEnrollmentScreen } from '../screens/auth/StudentFaceEnrollmentScreen';
import { StudentFaceLoginScreen } from '../screens/auth/StudentFaceLoginScreen';
import { StudentFaceEmergencyOtpScreen } from '../screens/auth/StudentFaceEmergencyOtpScreen';
import { THEME } from '../utils/constants';

export type AuthStackParamList = {
  Login: undefined;
  StudentFaceEnrollment: {
    preAuthToken: string;
    studentName: string;
    email: string;
  };
  StudentFaceLogin: {
    challengeToken: string;
    challengeNonce: string;
    promptAction?: string;
    instructions?: string;
    studentName: string;
    email: string;
  };
  StudentFaceEmergencyOtp: {
    challengeToken: string;
    email: string;
    studentName: string;
  };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: THEME.colors.background },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="StudentFaceEnrollment" component={StudentFaceEnrollmentScreen} />
      <Stack.Screen name="StudentFaceLogin" component={StudentFaceLoginScreen} />
      <Stack.Screen name="StudentFaceEmergencyOtp" component={StudentFaceEmergencyOtpScreen} />
    </Stack.Navigator>
  );
};
