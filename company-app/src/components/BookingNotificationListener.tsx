import React, { useEffect, useRef } from 'react';
import { useQuery, gql } from '@apollo/client';
import { Audio } from 'expo-av';

const SLOT_BOOKINGS_COUNT = gql`
  query SlotBookingsCount {
    slotBookings(status: PENDING) {
      id
    }
  }
`;

export default function BookingNotificationListener() {
  const playedBookingIds = useRef<Set<string>>(new Set());

  const { data } = useQuery(SLOT_BOOKINGS_COUNT, {
    fetchPolicy: 'network-only',
    pollInterval: 5000, // Poll every 5 seconds
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
            require('../assets/notification.mp3')
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
        
        // Play sound once for new bookings
        playNewBookingSound();
        
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

  return null; // This component doesn't render anything
}
