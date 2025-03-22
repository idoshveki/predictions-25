import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { AnimatedPage } from '@/components';
import { Search, X, Calendar, Clock, Send, ArrowLeft } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

interface User {
  id: string;
  username: string;
}

function WebDateTimePicker({ value, onChange }) {
  const localDateTime = new Date(value).toLocaleString('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace(' ', 'T');

  return (
    <input
      type="datetime-local"
      value={localDateTime}
      onChange={(e) => {
        const newDate = new Date(e.target.value);
        onChange(newDate);
      }}
      style={{
        padding: 16,
        fontSize: 16,
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        width: '100%',
        fontFamily: 'Poppins_400Regular',
        backgroundColor: '#fff',
        color: '#1e293b',
      }}
    />
  );
}

export default function CreatePredictionScreen() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [recipientUsername, setRecipientUsername] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'web');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
        .neq('id', user.id)
        .order('username');

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const handleCreatePrediction = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!message.trim()) {
        throw new Error('Please enter a prediction message');
      }

      if (!recipientUsername) {
        throw new Error('Please select a recipient');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: recipientData, error: recipientError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', recipientUsername)
        .single();

      if (recipientError || !recipientData) {
        throw new Error('Recipient not found');
      }

      const { error: predictionError } = await supabase
        .from('predictions')
        .insert([{
          sender_id: user.id,
          recipient_id: recipientData.id,
          message,
          scheduled_for: scheduledDate.toISOString(),
        }]);

      if (predictionError) throw predictionError;

      router.push('/outbox');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (date: Date) => {
    return date.toLocaleString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <AnimatedPage>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <Animated.View 
          entering={FadeInDown.delay(200)}
          style={styles.header}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
          </TouchableOpacity>
          <Text style={styles.title}>New Prediction</Text>
          <Text style={styles.subtitle}>Send a prediction to a friend</Text>
        </Animated.View>

        {error && (
          <Animated.View 
            entering={FadeInDown.delay(300)}
            style={styles.errorContainer}
          >
            <Text style={styles.error}>{error}</Text>
          </Animated.View>
        )}

        <Animated.View 
          entering={FadeInDown.delay(400)}
          style={styles.form}
        >
          <TouchableOpacity
            style={styles.recipientButton}
            onPress={() => {
              loadUsers();
              setShowUserPicker(true);
            }}
          >
            <Text style={[
              styles.recipientButtonText,
              !recipientUsername && styles.recipientButtonPlaceholder
            ]}>
              {recipientUsername || 'Select recipient'}
            </Text>
          </TouchableOpacity>

          <View style={styles.messageContainer}>
            <TextInput
              style={styles.messageInput}
              placeholder="Your prediction..."
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              placeholderTextColor="#94a3b8"
            />
          </View>

          {Platform.OS === 'web' ? (
            <WebDateTimePicker
              value={scheduledDate}
              onChange={setScheduledDate}
            />
          ) : (
            <View style={styles.dateTimeContainer}>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Calendar size={20} color="#64748b" />
                <Text style={styles.dateTimeText}>
                  {formatDate(scheduledDate)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Clock size={20} color="#64748b" />
                <Text style={styles.dateTimeText}>
                  {formatTime(scheduledDate)}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={scheduledDate}
                  mode="date"
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) setScheduledDate(date);
                  }}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={scheduledDate}
                  mode="time"
                  onChange={(event, date) => {
                    setShowTimePicker(false);
                    if (date) setScheduledDate(date);
                  }}
                />
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleCreatePrediction}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Sending...' : 'Send Prediction'}
            </Text>
            {!loading && <Send size={20} color="#fff" />}
          </TouchableOpacity>
        </Animated.View>

        {/* User Picker Modal */}
        {showUserPicker && (
          <View style={styles.modalOverlay}>
            <Animated.View 
              entering={FadeInDown}
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Recipient</Text>
                <TouchableOpacity
                  onPress={() => setShowUserPicker(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.searchContainer}>
                <Search size={20} color="#64748b" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search users..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <ScrollView style={styles.userList}>
                {filteredUsers.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={styles.userItem}
                    onPress={() => {
                      setRecipientUsername(user.username);
                      setShowUserPicker(false);
                    }}
                  >
                    <LinearGradient
                      colors={['#6366f1', '#4f46e5']}
                      style={styles.userAvatar}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.avatarText}>
                        {user.username[0].toUpperCase()}
                      </Text>
                    </LinearGradient>
                    <Text style={styles.username}>{user.username}</Text>
                  </TouchableOpacity>
                ))}

                {filteredUsers.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No users found</Text>
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          </View>
        )}
      </ScrollView>
    </AnimatedPage>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  backButton: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1e293b',
    marginBottom: 8,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Poppins_400Regular',
    color: '#64748b',
  },
  form: {
    padding: 20,
    gap: 16,
  },
  recipientButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recipientButtonText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    color: '#1e293b',
  },
  recipientButtonPlaceholder: {
    color: '#94a3b8',
  },
  messageContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  messageInput: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    color: '#1e293b',
    height: 120,
    textAlignVertical: 'top',
  },
  dateTimeContainer: {
    gap: 12,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateTimeText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    color: '#1e293b',
  },
  submitButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    margin: 20,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  error: {
    color: '#dc2626',
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#1e293b',
  },
  userList: {
    maxHeight: 400,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  username: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#1e293b',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#64748b',
  },
});