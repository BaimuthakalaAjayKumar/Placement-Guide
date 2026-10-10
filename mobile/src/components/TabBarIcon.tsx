import React from 'react';
import { StyleSheet, View } from 'react-native';

export type IconType =
  | 'dashboard'
  | 'attendance'
  | 'scan'
  | 'faculty'
  | 'staff'
  | 'governance'
  | 'timetable'
  | 'dispute'
  | 'notification'
  | 'profile';

interface TabBarIconProps {
  type: IconType;
  color: string;
}

export const TabBarIcon: React.FC<TabBarIconProps> = ({ type, color }) => {
  switch (type) {
    case 'dashboard':
      return (
        <View style={styles.dashboardContainer}>
          <View style={[styles.gridSquare, { backgroundColor: color }]} />
          <View style={[styles.gridSquare, { backgroundColor: color }]} />
          <View style={[styles.gridSquare, { backgroundColor: color }]} />
          <View style={[styles.gridSquare, { backgroundColor: color }]} />
        </View>
      );

    case 'attendance':
      return (
        <View style={[styles.sheetContainer, { borderColor: color }]}>
          <View style={[styles.sheetLine, { width: '80%', backgroundColor: color }]} />
          <View style={[styles.sheetLine, { width: '55%', backgroundColor: color }]} />
          <View style={[styles.sheetLine, { width: '85%', backgroundColor: color }]} />
        </View>
      );

    case 'scan':
      return (
        <View style={styles.scanContainer}>
          <View style={[styles.cornerTL, { borderColor: color }]} />
          <View style={[styles.cornerTR, { borderColor: color }]} />
          <View style={[styles.cornerBL, { borderColor: color }]} />
          <View style={[styles.cornerBR, { borderColor: color }]} />
          <View style={[styles.scanCenterDot, { backgroundColor: color }]} />
        </View>
      );

    case 'faculty':
    case 'staff':
      return (
        <View style={styles.staffContainer}>
          <View style={[styles.staffHead, { borderColor: color }]} />
          <View style={[styles.staffTorso, { borderColor: color }]} />
        </View>
      );

    case 'governance':
      return (
        <View style={[styles.shieldContainer, { borderColor: color }]}>
          <View style={[styles.shieldSpine, { backgroundColor: color }]} />
        </View>
      );

    case 'timetable':
      return (
        <View style={[styles.calendarContainer, { borderColor: color }]}>
          <View style={[styles.calendarTopBar, { backgroundColor: color }]} />
          <View style={styles.calendarDotsRow}>
            <View style={[styles.calendarDot, { backgroundColor: color }]} />
            <View style={[styles.calendarDot, { backgroundColor: color }]} />
            <View style={[styles.calendarDot, { backgroundColor: color }]} />
          </View>
        </View>
      );

    case 'dispute':
      return (
        <View style={[styles.disputeContainer, { borderColor: color }]}>
          <View style={[styles.disputeSpine, { backgroundColor: color }]} />
          <View style={[styles.disputeDot, { backgroundColor: color }]} />
        </View>
      );

    case 'notification':
      return (
        <View style={styles.bellContainer}>
          <View style={[styles.bellTopLoop, { borderColor: color }]} />
          <View style={[styles.bellBody, { borderColor: color }]} />
          <View style={[styles.bellClapper, { backgroundColor: color }]} />
        </View>
      );

    case 'profile':
    default:
      return (
        <View style={styles.profileContainer}>
          <View style={[styles.profileHead, { borderColor: color }]} />
          <View style={[styles.profileTorso, { borderColor: color }]} />
        </View>
      );
  }
};

const styles = StyleSheet.create({
  dashboardContainer: {
    width: 18,
    height: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  gridSquare: {
    width: 7.5,
    height: 7.5,
    borderRadius: 2,
  },
  sheetContainer: {
    width: 17,
    height: 20,
    borderWidth: 1.6,
    borderRadius: 3.5,
    padding: 2.5,
    justifyContent: 'space-around',
  },
  sheetLine: {
    height: 1.5,
    borderRadius: 1,
  },
  scanContainer: {
    width: 19,
    height: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 5,
    height: 5,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 5,
    height: 5,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 5,
    height: 5,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 5,
    height: 5,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  scanCenterDot: {
    width: 5,
    height: 5,
    borderRadius: 1,
  },
  staffContainer: {
    width: 20,
    height: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffHead: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.6,
    marginBottom: 1.5,
  },
  staffTorso: {
    width: 17,
    height: 7,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderWidth: 1.6,
    borderBottomWidth: 0,
  },
  shieldContainer: {
    width: 17,
    height: 20,
    borderWidth: 1.6,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldSpine: {
    width: 1.6,
    height: 10,
    borderRadius: 1,
  },
  profileContainer: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHead: {
    width: 7.5,
    height: 7.5,
    borderRadius: 3.75,
    borderWidth: 1.6,
    marginBottom: 1.5,
  },
  profileTorso: {
    width: 15,
    height: 6.5,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    borderWidth: 1.6,
    borderBottomWidth: 0,
  },
  calendarContainer: {
    width: 18,
    height: 18,
    borderWidth: 1.6,
    borderRadius: 3.5,
    padding: 1.5,
    justifyContent: 'space-between',
  },
  calendarTopBar: {
    height: 2.5,
    borderRadius: 1,
    marginBottom: 2,
  },
  calendarDotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flex: 1,
  },
  calendarDot: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.25,
  },
  disputeContainer: {
    width: 17,
    height: 19,
    borderWidth: 1.6,
    borderRadius: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disputeSpine: {
    width: 1.6,
    height: 7,
    borderRadius: 0.8,
    marginBottom: 2,
  },
  disputeDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
  },
  bellContainer: {
    width: 18,
    height: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellTopLoop: {
    width: 5,
    height: 4,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderTopLeftRadius: 2.5,
    borderTopRightRadius: 2.5,
  },
  bellBody: {
    width: 14,
    height: 10,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderWidth: 1.6,
    borderBottomWidth: 1.8,
  },
  bellClapper: {
    width: 3.5,
    height: 2,
    borderBottomLeftRadius: 1.75,
    borderBottomRightRadius: 1.75,
  },
});
