import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { THEME } from '../../utils/constants';

export const FacultyDashboardScreen: React.FC = () => {
  const { user, logout, isCachedSession } = useAuth();
  const navigation = useNavigation<any>();

  return (
    <ScreenContainer>
      {isCachedSession && (
        <View style={styles.cachedBadge}>
          <Text style={styles.cachedBadgeText}>CACHED PROFILE (OFFLINE MODE)</Text>
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.roleTag}>
          <Text style={styles.roleTagText}>FACULTY INSTRUCTOR</Text>
        </View>
        <Text style={styles.welcomeText}>{user?.name || 'Faculty Member'}</Text>
        <Text style={styles.metaText}>{user?.email || 'N/A'}</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Assigned Academic Scopes</Text>
        {user?.managedScopes && user.managedScopes.length > 0 ? (
          user.managedScopes.map((scope, index) => (
            <View key={index} style={styles.scopeRow}>
              <Text style={styles.scopeYear}>Year {scope.academicYear}</Text>
              <Text style={styles.scopeDetails}>
                {scope.branch || 'All Branches'} • Section {scope.section || 'All'}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noScopeText}>
            Branch: {user?.branch || 'General'} • Section: {user?.section || 'General'}
          </Text>
        )}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Classroom Attendance Hub</Text>
        <Text style={styles.bodyText}>
          Initiate geofenced classroom sessions with 15-second rotating cryptographic QR codes, monitor live student check-ins, and finalize records.
        </Text>
        <Button
          title="Launch Attendance Controller"
          onPress={() => navigation.navigate('FacultyAttendance')}
          style={{ marginTop: 14, backgroundColor: '#10B981' }}
        />
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Academic Operations & Registry</Text>
        <Text style={styles.bodyText}>
          Review your weekly teaching schedule, submit attendance corrections for student discrepancies, and monitor institutional alerts.
        </Text>
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          <Button
            title="Weekly Timetable"
            onPress={() => navigation.navigate('Timetable')}
            variant="outline"
            style={{ flex: 1, marginRight: 6 }}
          />
          <Button
            title="File Correction"
            onPress={() => navigation.navigate('AttendanceDisputes')}
            variant="outline"
            style={{ flex: 1, marginLeft: 6 }}
          />
        </View>
        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          <Button
            title="Parent Contacts & Alerts"
            onPress={() => navigation.navigate('FacultyGuardianAlerts')}
            variant="outline"
            style={{ flex: 1, marginRight: 6 }}
          />
          <Button
            title="Notifications"
            onPress={() => navigation.navigate('Notifications')}
            variant="outline"
            style={{ flex: 1, marginLeft: 6 }}
          />
        </View>
        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          <Button
            title="Grievance Desk"
            onPress={() => navigation.navigate('ComplaintsFeedback')}
            variant="outline"
            style={{ flex: 1, marginRight: 6 }}
          />
          <Button
            title="Records & Exports"
            onPress={() => navigation.navigate('ReportsRecords')}
            variant="outline"
            style={{ flex: 1, marginLeft: 6 }}
          />
        </View>
      </View>

      <Button
        title="Sign Out"
        onPress={logout}
        variant="outline"
        style={styles.logoutBtn}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  cachedBadge: {
    backgroundColor: '#854D0E',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  cachedBadgeText: {
    color: '#FEF08A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  roleTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  roleTagText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  metaText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 10,
  },
  scopeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  scopeYear: {
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
  scopeDetails: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  noScopeText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    lineHeight: 18,
  },
  bodyText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    lineHeight: 19,
  },
  logoutBtn: {
    marginTop: THEME.spacing.xs,
  },
});
