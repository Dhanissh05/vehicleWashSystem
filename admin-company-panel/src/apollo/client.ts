import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_API_URL || 'http://localhost:4000/graphql',
  fetchOptions: { timeout: 15000 },
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('platform_token');
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

let errorLogged = false;
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors && !errorLogged) {
    errorLogged = true;
    graphQLErrors.forEach(({ message }) => {
      console.error('[GraphQL error]:', message);
      if (message === 'Not authenticated' || message.includes('Platform access required')) {
        localStorage.removeItem('platform_token');
        localStorage.removeItem('platform_user');
        window.location.href = '/login';
      }
    });
    setTimeout(() => { errorLogged = false; }, 1000);
  }
  if (networkError) {
    console.error('[Network error]:', networkError);
  }
});

export const client = new ApolloClient({
  link: from([authLink, errorLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'network-only' },
    query: { fetchPolicy: 'network-only' },
  },
});
