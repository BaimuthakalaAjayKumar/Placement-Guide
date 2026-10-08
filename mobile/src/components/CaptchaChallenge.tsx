import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { THEME } from '../utils/constants';

interface CaptchaChallengeProps {
  onVerify: (token: string) => void;
  onReset?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  resetTrigger?: number;
}

export type CaptchaStatus =
  | 'loading'
  | 'ready'
  | 'verified'
  | 'expired'
  | 'error'
  | 'timeout'
  | 'config_error';

/**
 * Cloudflare Turnstile WebView Integration for CampusBridge Mobile.
 *
 * Security Requirements:
 * 1. Reads ONLY the public site key (EXPO_PUBLIC_TURNSTILE_SITE_KEY).
 * 2. ZERO hardcoded site keys, testing keys, or fallbacks.
 * 3. Never contains or references TURNSTILE_SECRET_KEY.
 * 4. Never logs the CAPTCHA token.
 * 5. If EXPO_PUBLIC_TURNSTILE_SITE_KEY is missing/blank, displays a clear
 *    configuration error and keeps Sign In disabled.
 */
export const CaptchaChallenge: React.FC<CaptchaChallengeProps> = ({
  onVerify,
  onReset,
  onError,
  disabled = false,
  resetTrigger = 0,
}) => {
  // Read site key strictly from EXPO_PUBLIC_TURNSTILE_SITE_KEY — zero fallback
  const rawSiteKey = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY;
  const siteKey = typeof rawSiteKey === 'string' ? rawSiteKey.trim() : '';
  const isKeyConfigured = siteKey.length > 0;

  const [status, setStatus] = useState<CaptchaStatus>(
    isKeyConfigured ? 'loading' : 'config_error'
  );
  const [internalKey, setInternalKey] = useState<number>(0);
  const webViewRef = useRef<WebView>(null);

  // Synchronize state if key configuration changes
  useEffect(() => {
    if (!isKeyConfigured) {
      setStatus('config_error');
    }
  }, [isKeyConfigured]);

  // React to external reset trigger (e.g., after failed/completed login)
  useEffect(() => {
    if (resetTrigger > 0 && isKeyConfigured) {
      handleReset();
    }
  }, [resetTrigger, isKeyConfigured]);

  const handleReset = () => {
    if (!isKeyConfigured) return;
    setStatus('loading');
    setInternalKey((k) => k + 1);
    if (onReset) {
      onReset();
    }
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case 'loaded':
          setStatus('ready');
          break;
        case 'success':
          if (data.token && typeof data.token === 'string') {
            setStatus('verified');
            // Security: Forward token to consumer, NEVER log token to console
            onVerify(data.token);
          }
          break;
        case 'expired':
          setStatus('expired');
          if (onReset) onReset();
          break;
        case 'timeout':
          setStatus('timeout');
          if (onReset) onReset();
          break;
        case 'error':
          setStatus('error');
          if (onReset) onReset();
          if (onError) onError(data.code || 'Turnstile verification error');
          break;
        default:
          break;
      }
    } catch {
      // Ignore non-JSON postMessage payloads
    }
  };

  const handleWebViewError = () => {
    setStatus('error');
    if (onReset) onReset();
    if (onError) onError('Failed to load Turnstile challenge');
  };

  const htmlContent = isKeyConfigured
    ? `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit" async defer></script>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body {
            background-color: transparent;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
            width: 100%;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          #turnstile-widget {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 65px;
          }
        </style>
      </head>
      <body>
        <div id="turnstile-widget"></div>
        <script>
          var widgetId = null;
          function post(type, data) {
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, data || {})));
            }
          }

          function onTurnstileLoad() {
            try {
              post('loaded');
              widgetId = turnstile.render('#turnstile-widget', {
                sitekey: '${siteKey}',
                theme: 'dark',
                size: 'normal',
                callback: function(token) {
                  post('success', { token: token });
                },
                'error-callback': function(code) {
                  post('error', { code: code });
                },
                'expired-callback': function() {
                  post('expired');
                },
                'timeout-callback': function() {
                  post('timeout');
                }
              });
            } catch (err) {
              post('error', { code: err ? err.message : 'render_failed' });
            }
          }

          if (window.turnstile && typeof window.turnstile.render === 'function') {
            onTurnstileLoad();
          }
        </script>
      </body>
    </html>
  `
    : '';

  return (
    <View style={styles.container}>
      <View style={[styles.card, disabled && styles.disabled]}>
        <View style={styles.headerRow}>
          <Text style={styles.badgeText}>🛡️ Cloudflare Turnstile</Text>
          {status === 'verified' && (
            <View style={styles.statusVerifiedBadge}>
              <Text style={styles.statusVerifiedText}>✓ Verified</Text>
            </View>
          )}
          {status === 'loading' && isKeyConfigured && (
            <View style={styles.statusLoadingRow}>
              <ActivityIndicator size="small" color={THEME.colors.primary} />
              <Text style={styles.statusLoadingText}>Loading challenge...</Text>
            </View>
          )}
          {!isKeyConfigured && (
            <View style={styles.statusErrorBadge}>
              <Text style={styles.statusErrorText}>Configuration Error</Text>
            </View>
          )}
        </View>

        {/* Explicit Error When EXPO_PUBLIC_TURNSTILE_SITE_KEY Is Missing */}
        {!isKeyConfigured && (
          <View style={styles.configErrorBox}>
            <Text style={styles.configErrorTitle}>⚠️ Security Check Not Configured</Text>
            <Text style={styles.configErrorText}>
              Turnstile CAPTCHA cannot load: EXPO_PUBLIC_TURNSTILE_SITE_KEY is not configured in this environment.
              Sign In is disabled for security.
            </Text>
          </View>
        )}

        {isKeyConfigured && status === 'error' && (
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>
              Security check failed or could not be loaded.
            </Text>
            <TouchableOpacity onPress={handleReset} style={styles.retryBtn}>
              <Text style={styles.retryText}>Tap to Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {isKeyConfigured && status === 'expired' && (
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>Verification expired. Please verify again.</Text>
            <TouchableOpacity onPress={handleReset} style={styles.retryBtn}>
              <Text style={styles.retryText}>Reload Verification</Text>
            </TouchableOpacity>
          </View>
        )}

        {isKeyConfigured && status === 'timeout' && (
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>Verification timed out.</Text>
            <TouchableOpacity onPress={handleReset} style={styles.retryBtn}>
              <Text style={styles.retryText}>Reload Verification</Text>
            </TouchableOpacity>
          </View>
        )}

        {isKeyConfigured && (
          <View
            style={[
              styles.webViewContainer,
              (status === 'error' || status === 'expired' || status === 'timeout') &&
                styles.hidden,
            ]}
          >
            <WebView
              key={`turnstile-${internalKey}`}
              ref={webViewRef}
              originWhitelist={['*']}
              source={{
                html: htmlContent,
                baseUrl: 'https://placement-guide.onrender.com',
              }}
              onMessage={handleMessage}
              onError={handleWebViewError}
              onHttpError={handleWebViewError}
              style={styles.webView}
              scrollEnabled={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              pointerEvents={disabled ? 'none' : 'auto'}
            />
          </View>
        )}

        <View style={styles.footerRow}>
          <Text style={styles.footerCaption}>
            Mandatory human verification protects CampusBridge mobile endpoints.
          </Text>
          {status === 'verified' && (
            <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: THEME.spacing.md,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    padding: 12,
  },
  disabled: {
    opacity: 0.6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  statusVerifiedBadge: {
    backgroundColor: THEME.colors.successBg,
    borderColor: THEME.colors.success,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusVerifiedText: {
    color: THEME.colors.success,
    fontSize: 11,
    fontWeight: '700',
  },
  statusErrorBadge: {
    backgroundColor: THEME.colors.errorBg,
    borderColor: THEME.colors.error,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusErrorText: {
    color: THEME.colors.error,
    fontSize: 11,
    fontWeight: '700',
  },
  statusLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusLoadingText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  configErrorBox: {
    padding: 12,
    backgroundColor: THEME.colors.errorBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.error,
    marginVertical: 6,
  },
  configErrorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.error,
    marginBottom: 4,
  },
  configErrorText: {
    fontSize: 12,
    color: THEME.colors.text,
    lineHeight: 18,
  },
  webViewContainer: {
    height: 74,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderRadius: 6,
    marginVertical: 4,
  },
  hidden: {
    display: 'none',
  },
  webView: {
    backgroundColor: 'transparent',
    width: '100%',
    height: 74,
  },
  alertBox: {
    padding: 10,
    backgroundColor: THEME.colors.errorBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.error,
    alignItems: 'center',
    marginVertical: 4,
  },
  alertText: {
    fontSize: 12,
    color: THEME.colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  footerCaption: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    flex: 1,
  },
  resetBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  resetText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textDecorationLine: 'underline',
  },
});
