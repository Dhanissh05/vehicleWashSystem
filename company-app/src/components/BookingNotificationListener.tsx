import React, { useEffect, useRef, useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GlobalNotification from './GlobalNotification';

const SLOT_BOOKINGS_COUNT = gql`
  query SlotBookingsCount {
    slotBookings(status: PENDING) {
      id
    }
  }
`;

export default function BookingNotificationListener() {
  const playedBookingIds = useRef<Set<string>>(new Set());
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  // Load mute preference
  useEffect(() => {
    const loadMuteSetting = async () => {
      try {
        const muted = await AsyncStorage.getItem('slot_notification_muted');
        setIsMuted(muted === 'true');
      } catch (error) {
        console.log('Error loading mute setting:', error);
      }
    };
    loadMuteSetting();

    // Listen for mute setting changes
    const interval = setInterval(async () => {
      try {
        const muted = await AsyncStorage.getItem('slot_notification_muted');
        setIsMuted(muted === 'true');
      } catch (error) {
        console.log('Error checking mute setting:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const { data } = useQuery(SLOT_BOOKINGS_COUNT, {
    fetchPolicy: 'network-only',
    pollInterval: 3000, // Poll every 3 seconds for instant detection
    errorPolicy: 'ignore',
  });

  useEffect(() => {
    const playNewBookingSound = async () => {
      console.log('🔊 [Background] Playing notification sound for new booking...');
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        
        try {
          const { sound } = await Audio.Sound.createAsync(
            require('../../assets/notification.mp3')
          );
          await sound.playAsync();
          
          sound.setOnPlaybackStatusUpdate((status: any) => {
            if (status.didJustFinish) {
              sound.unloadAsync();
            }
          });
        } catch (soundError) {
          console.log('❌ [Background] Notification sound error:', soundError);
        }
      } catch (error) {
        console.log('❌ [Background] Error setting audio mode:', error);
      }
    };

    if (data?.slotBookings) {
      const pendingBookings = data.slotBookings;
      
      // Check for new bookings that haven't played sound yet
      const newBookings = pendingBookings.filter((b: any) => !playedBookingIds.current.has(b.id));
      
      if (newBookings.length > 0) {
        console.log(`🆕 [Background] ${newBookings.length} new booking(s) detected!`);
        
        // Only play sound and show notification if not muted
        if (!isMuted) {
          // Play sound once for new bookings
          playNewBookingSound();
          
          // Show visual notification
          setNotificationMessage('Slot Booking has been received');
          setShowNotification(true);
        } else {
          console.log('🔇 [Background] Notifications muted, skipping sound and visual alert');
        }
        
        // Mark these bookings as played
        newBookings.forEach((b: any) => {
          playedBookingIds.current.add(b.id);
        });
      }
      
      // Clean up tracking for bookings that are no longer pending
      const currentPendingIds = new Set(pendingBookings.map((b: any) => b.id));
      playedBookingIds.current.forEach((id) => {
        if (!currentPendingIds.has(id)) {
          playedBookingIds.current.delete(id);
        }
      });
    }
  }, [data]);

  return (
    <GlobalNotification
      message={notificationMessage}
      visible={showNotification}
      onHide={() => setShowNotification(false)}
      duration={5000}
    />
  );
}
