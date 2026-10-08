import React from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { THEME } from '../utils/constants';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  fullScreen = false,
}) => {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size="large" color={THEME.colors.primary} />
      {Boolean(message) && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: THEME.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  message: {
    marginTop: THEME.spacing.md,
    color: THEME.colors.textMuted,
    fontSize: 14,
  },
});
