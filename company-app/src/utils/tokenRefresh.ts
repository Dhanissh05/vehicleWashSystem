import AsyncStorage from '@react-native-async-storage/async-storage';
import { gql, ApolloClient } from '@apollo/client';

const REFRESH_TOKEN = gql`
  mutation RefreshToken {
    refreshToken {
      token
      user {
        id
        mobile
        name
        role
      }
    }
  }
`;

/**
 * Check if token needs refresh and refresh if necessary
 * Call this on app launch and periodically
 */
export const refreshTokenIfNeeded = async (apolloClient: ApolloClient<any>) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
    
    if (!token || isLoggedIn !== 'true') {
      return false;
    }

    // Decode token to check expiration (without verifying signature - that's backend's job)
    const tokenPayload = JSON.parse(atob(token.split('.')[1]));
    const expiresAt = tokenPayload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const oneDayInMs = 24 * 60 * 60 * 1000;

    // If token expires in less than 1 day, refresh it
    if (timeUntilExpiry < oneDayInMs) {
      console.log('[Token Refresh] Token expires soon, refreshing...');
      
      const { data } = await apolloClient.mutate({
        mutation: REFRESH_TOKEN,
      });

      if (data?.refreshToken?.token) {
        await AsyncStorage.setItem('token', data.refreshToken.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.refreshToken.user));
        console.log('[Token Refresh] Token refreshed successfully');
        return true;
      }
    } else {
      console.log('[Token Refresh] Token still valid, no refresh needed');
    }

    return false;
  } catch (error) {
    console.error('[Token Refresh] Failed:', error);
    // If refresh fails, user will need to login again when token expires
    return false;
  }
};

/**
 * Setup automatic token refresh - call this after login
 */
export const setupAutoTokenRefresh = (apolloClient: ApolloClient<any>) => {
  // Refresh token every 6 hours
  const refreshInterval = 6 * 60 * 60 * 1000;
  
  const intervalId = setInterval(() => {
    refreshTokenIfNeeded(apolloClient);
  }, refreshInterval);

  return () => clearInterval(intervalId);
};
