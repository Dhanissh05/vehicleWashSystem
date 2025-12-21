import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useMutation, useQuery, gql } from '@apollo/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GET_ME = gql`
  query GetMe {
    me {
      id
      name
      role
    }
  }
`;

const SEND_BROADCAST_NOTIFICATION = gql`
  mutation SendBroadcastNotification($title: String!, $message: String!) {
    sendBroadcastNotification(title: $title, message: $message) {
      success
      sentCount
      failedCount
    }
  }
`;

export default function PushNotificationScreen() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [userRole, setUserRole] = useState('');
  
  const { data: userData, loading: userLoading } = useQuery(GET_ME, {
    onError: (error) => {
      console.error('Failed to get user:', error);
    },
  });

  useEffect(() => {
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        setUserRole(user.role);
        console.log('Current user role:', user.role);
      }
    } catch (error) {
      console.error('Failed to load user role:', error);
    }
  };
  
  const [sendNotification, { loading }] = useMutation(SEND_BROADCAST_NOTIFICATION, {
    context: {
      headers: {
        'content-type': 'application/json',
      },
    },
    onCompleted: (data) => {
      console.log('✅ Notification sent successfully:', data);
      const result = data.sendBroadcastNotification;
      Alert.alert(
        'Notification Sent!',
        `Successfully sent to ${result.sentCount} customers${result.failedCount > 0 ? `\n${result.failedCount} failed` : ''}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setTitle('');
              setMessage('');
            },
          },
        ]
      );
    },
    onError: (error) => {
      console.error('Push Notification Error:', error);
      console.error('Network Error:', error.networkError);
      console.error('GraphQL Errors:', error.graphQLErrors);
      console.error('Error message:', error.message);
      
      let errorMessage = 'Failed to send notification';
      if (error.message.includes('Not authenticated')) {
        errorMessage = 'Please login again';
      } else if (error.message.includes('Admin access required')) {
        errorMessage = 'Only admins can send notifications';
      } else if (error.networkError) {
        errorMessage = `Network error: ${error.message}`;
      }
      
      Alert.alert('Error', errorMessage);
    },
  });

  const handleSendNotification = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a notification title');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a notification message');
      return;
    }

    Alert.alert(
      'Send Notification',
      `Send "${title}" to all customers?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send',
          onPress: () => {
            sendNotification({
              variables: {
                title: title.trim(),
                message: message.trim(),
              },
            });
          },
        },
      ]
    );
  };

  const quickTemplates = [
    {
      title: 'Special Offer',
      message: '🎉 Get 20% off on all car wash services today! Limited time offer.',
    },
    {
      title: 'New Service Available',
      message: '✨ Introducing our new premium detailing service. Book now!',
    },
    {
      title: 'Holiday Promotion',
      message: '🎊 Happy holidays! Enjoy special discounts on all services.',
    },
    {
      title: 'Reminder',
      message: '💧 Time for your regular car wash! Book your slot today.',
    },
  ];

  const useTemplate = (template: { title: string; message: string }) => {
    setTitle(template.title);
    setMessage(template.message);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {userRole !== 'ADMIN' && (
          <View style={styles.warningBox}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              Only admins can send push notifications. Current role: {userRole || 'Loading...'}
            </Text>
          </View>
        )}
        
        <View style={styles.header}>
          <Text style={styles.headerIcon}>📢</Text>
          <Text style={styles.title}>Send Push Notification</Text>
          <Text style={styles.subtitle}>
            Send notifications to all registered customers
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Notification Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter notification title"
            value={title}
            onChangeText={setTitle}
            maxLength={50}
            editable={!loading}
          />
          <Text style={styles.charCount}>{title.length}/50</Text>

          <Text style={styles.label}>Message</Text>
          <TextInput
            style={[styles.input, styles.messageInput]}
            placeholder="Enter your message..."
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            maxLength={200}
            textAlignVertical="top"
            editable={!loading}
          />
          <Text style={styles.charCount}>{message.length}/200</Text>

          <TouchableOpacity
            style={[styles.sendButton, loading && styles.sendButtonDisabled]}
            onPress={handleSendNotification}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.sendButtonIcon}>📤</Text>
                <Text style={styles.sendButtonText}>Send to All Customers</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.templates}>
          <Text style={styles.templatesTitle}>Quick Templates</Text>
          <Text style={styles.templatesSubtitle}>
            Tap to use a template
          </Text>
          
          {quickTemplates.map((template, index) => (
            <TouchableOpacity
              key={index}
              style={styles.templateCard}
              onPress={() => useTemplate(template)}
              disabled={loading}
            >
              <Text style={styles.templateTitle}>{template.title}</Text>
              <Text style={styles.templateMessage} numberOfLines={2}>
                {template.message}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            This notification will be sent to all customers who have the app installed and notifications enabled.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  messageInput: {
    minHeight: 120,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  sendButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  sendButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  templates: {
    marginBottom: 20,
  },
  templatesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  templatesSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  templateCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  templateMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
});
