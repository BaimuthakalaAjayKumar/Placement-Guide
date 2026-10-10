import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { THEME } from '../utils/constants';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  retryText?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onDismiss,
  onRetry,
  retryText = 'Retry',
}) => {
  if (!message) return null;

  return (
    <View style={styles.container} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <View style={styles.alertIndicator}>
        <Text style={styles.alertIndicatorText}>!</Text>
      </View>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          style={styles.retryButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={retryText}
        >
          <Text style={styles.retryText}>{retryText}</Text>
        </TouchableOpacity>
      )}
      {onDismiss && (
        <TouchableOpacity
          onPress={onDismiss}
          style={styles.dismissButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Dismiss error"
        >
          <Text style={styles.dismissText}>X</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.errorBg,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  alertIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: THEME.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: THEME.spacing.sm,
  },
  alertIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
  },
  message: {
    flex: 1,
    color: '#FCA5A5',
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: THEME.borderRadius.sm,
    marginRight: THEME.spacing.xs,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  dismissButton: {
    paddingLeft: THEME.spacing.sm,
  },
  dismissText: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
