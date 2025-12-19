import { gql } from '@apollo/client';

export const APP_VERSION = gql`
  query AppVersion {
    appVersion {
      companyApp
      customerApp
      companyAppDownloadUrl
      customerAppDownloadUrl
      forceUpdate
      updateMessage
      releaseNotes
    }
  }
`;
