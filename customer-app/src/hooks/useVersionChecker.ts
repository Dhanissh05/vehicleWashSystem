import { useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import { useQuery } from '@apollo/client';
import { APP_VERSION } from '../apollo/versionQueries';

const APP_VERSION_NUMBER = '1.0.0'; // Update this with each release

export const useVersionChecker = () => {
  const { data, loading } = useQuery(APP_VERSION, {
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    if (!loading && data?.appVersion) {
      checkVersion(data.appVersion);
    }
  }, [loading, data]);

  const checkVersion = (versionInfo: any) => {
    const currentVersion = APP_VERSION_NUMBER;
    const latestVersion = versionInfo.customerApp;
    const downloadUrl = versionInfo.customerAppDownloadUrl;
    const forceUpdate = versionInfo.forceUpdate;
    const updateMessage = versionInfo.updateMessage || 'A new version is available';
    const releaseNotes = versionInfo.releaseNotes;

    // Compare versions (simple string comparison - works for x.y.z format)
    if (compareVersions(currentVersion, latestVersion) < 0) {
      showUpdateDialog(
        latestVersion,
        downloadUrl,
        forceUpdate,
        updateMessage,
        releaseNotes
      );
    }
  };

  const compareVersions = (current: string, latest: string): number => {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (currentParts[i] < latestParts[i]) return -1;
      if (currentParts[i] > latestParts[i]) return 1;
    }
    return 0;
  };

  const showUpdateDialog = (
    version: string,
    downloadUrl: string,
    forceUpdate: boolean,
    message: string,
    releaseNotes?: string
  ) => {
    const title = forceUpdate ? '🚨 Update Required' : '🎉 Update Available';
    const messageText = `${message}\n\nVersion ${version} is now available.${
      releaseNotes ? `\n\n${releaseNotes}` : ''
    }`;

    const buttons = forceUpdate
      ? [
          {
            text: 'Update Now',
            onPress: () => {
              if (downloadUrl) {
                Linking.openURL(downloadUrl);
              }
            },
          },
        ]
      : [
          {
            text: 'Later',
            style: 'cancel' as const,
          },
          {
            text: 'Update',
            onPress: () => {
              if (downloadUrl) {
                Linking.openURL(downloadUrl);
              }
            },
          },
        ];

    Alert.alert(title, messageText, buttons, {
      cancelable: !forceUpdate,
    });
  };
};
