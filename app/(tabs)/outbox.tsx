import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, AnimatedPage } from '@/components';
import { Clock, User, CircleAlert as AlertCircle, CircleCheck as CheckCircle2 } from 'lucide-react-native';
import Animated, { 
  FadeInDown,
  useAnimatedStyle,
  withSpring,
  useSharedValue
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Prediction {
  id: string;
  message: string;
  scheduled_for: string;
  delivered_at: string | null;
  recipient?: {
    username: string;
    email: string;
  };
}

interface PredictionCardProps {
  item: Prediction;
  index: number;
}

function PredictionCard({ item, index }: PredictionCardProps) {
  const scale = useSharedValue(1);
  
  const onPressIn = () => {
    scale.value = withSpring(0.95);
  };
  
  const onPressOut = () => {
    scale.value = withSpring(1);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const now = new Date();
  const scheduledDate = new Date(item.scheduled_for);
  const isPending = scheduledDate > now;

  return (
    <Card index={index}>
      <AnimatedPressable
        style={[styles.cardContent, animatedStyle]}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <LinearGradient
          colors={isPending ? ['#fef3c7', '#fffbeb'] : ['#fff', '#f8fafc']}
          style={[StyleSheet.absoluteFill, styles.cardGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>{item.message}</Text>
        </View>
        <View style={styles.metaContainer}>
          <View style={styles.metaGroup}>
            <View style={styles.metaBadge}>
              <User size={16} color="#6366f1" />
              <Text style={styles.metaText}>To {item.recipient?.username}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Clock size={16} color="#6366f1" />
              <Text style={styles.metaText}>{formatDateTime(item.scheduled_for)}</Text>
            </View>
          </View>
          <View style={[
            styles.statusBadge,
            isPending ? styles.statusPending : styles.statusDelivered
          ]}>
            {isPending ? (
              <Clock size={16} color="#854d0e" />
            ) : (
              <CheckCircle2 size={16} color="#0f766e" />
            )}
            <Text style={[
              styles.statusText,
              isPending ? styles.statusTextPending : styles.statusTextDelivered
            ]}>
              {isPending ? 'Scheduled' : 'Delivered'}
            </Text>
          </View>
        </View>
      </AnimatedPressable>
    </Card>
  );
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export default function OutboxScreen() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPredictions = async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('predictions')
        .select(`
          id,
          message,
          scheduled_for,
          delivered_at,
          recipient:profiles!recipient_id (
            username,
            email
          )
        `)
        .eq('sender_id', user.id)
        .order('scheduled_for', { ascending: false });

      if (fetchError) throw fetchError;
      setPredictions(data || []);
    } catch (err) {
      console.error('Error loading predictions:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPredictions();
    const interval = setInterval(loadPredictions, 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPredictions();
  }, []);

  if (loading && !refreshing) {
    return (
      <AnimatedPage>
        <View style={styles.container}>
          <Text style={styles.loadingText}>Loading your predictions...</Text>
        </View>
      </AnimatedPage>
    );
  }

  if (error) {
    return (
      <AnimatedPage>
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <AlertCircle size={32} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retryText} onPress={loadPredictions}>
              Tap to try again
            </Text>
          </View>
        </View>
      </AnimatedPage>
    );
  }

  if (predictions.length === 0) {
    return (
      <AnimatedPage>
        <View style={styles.container}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No predictions sent</Text>
            <Text style={styles.emptyText}>
              Your sent predictions will appear here{'\n'}when you create one
            </Text>
          </View>
        </View>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <View style={styles.container}>
        <Animated.View 
          entering={FadeInDown.delay(200)}
          style={styles.header}
        >
          <Text style={styles.count}>
            {predictions.length} {predictions.length === 1 ? 'prediction' : 'predictions'}
          </Text>
        </Animated.View>

        <FlatList
          data={predictions}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366f1"
            />
          }
          renderItem={({ item, index }) => (
            <PredictionCard item={item} index={index} />
          )}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </AnimatedPage>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  count: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  listContent: {
    padding: 16,
  },
  cardContent: {
    padding: 20,
    overflow: 'hidden',
  },
  cardGradient: {
    borderRadius: 16,
  },
  messageContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  messageText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: '#1e293b',
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  metaContainer: {
    gap: 12,
  },
  metaGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  metaText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#6366f1',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  statusDelivered: {
    backgroundColor: '#ccfbf1',
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  statusText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  statusTextPending: {
    color: '#854d0e',
  },
  statusTextDelivered: {
    color: '#0f766e',
  },
  loadingText: {
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: '#64748b',
    marginTop: 24,
    letterSpacing: -0.5,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  errorText: {
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: '#dc2626',
    marginVertical: 12,
    letterSpacing: -0.5,
  },
  retryText: {
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    color: '#3b82f6',
    textDecorationLine: 'underline',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    marginTop: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1e293b',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
});