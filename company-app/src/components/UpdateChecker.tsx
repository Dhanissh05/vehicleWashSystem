import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as Updates from 'expo-updates';

export default function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      if (__DEV__) return; // Skip in development

      setIsChecking(true);
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        console.log('Update available! Auto-downloading...');
        setUpdateAvailable(true);
        // Automatically download and apply update
        await downloadAndApplyUpdate();
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const downloadAndApplyUpdate = async () => {
    try {
      setIsDownloading(true);
      console.log('Fetching update...');
      await Updates.fetchUpdateAsync();
      
      console.log('Update downloaded! Reloading app...');
      // Automatically reload without showing alert
      await Updates.reloadAsync();
    } catch (error) {
      console.error('Error downloading update:', error);
      // Silently fail - user can continue using current version
      setIsDownloading(false);
      setUpdateAvailable(false);
    }
  };

  if (!updateAvailable || isDownloading) {
    return (
      <View style={styles.updateIndicator}>
        {isDownloading && (
          <>
            <ActivityIndicator size="small" color="#8B5CF6" />
            <Text style={styles.updateText}>Updating...</Text>
          </>
        )}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  updateIndicator: {
    position: 'absolute',
    top: 40,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  updateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});
