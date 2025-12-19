import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CalendarIcon({ size = 28 }: { size?: number }) {
  const today = new Date();
  const day = today.getDate();
  const month = today.toLocaleString('en-US', { month: 'short' }).toUpperCase();

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[styles.header, { height: size * 0.25 }]}>
        <Text style={[styles.month, { fontSize: size * 0.22 }]}>{month}</Text>
      </View>
      <View style={styles.body}>
        <Text style={[styles.day, { fontSize: size * 0.4 }]}>{day}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  header: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  month: {
    color: '#fff',
    fontWeight: 'bold',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  day: {
    color: '#1f2937',
    fontWeight: 'bold',
  },
});
