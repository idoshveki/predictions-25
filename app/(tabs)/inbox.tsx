import { View, Text, StyleSheet, SectionList, RefreshControl, Pressable } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { AnimatedPage } from '@/components/AnimatedPage';
import { Clock, User, CircleAlert as AlertCircle } from 'lucide-react-native';
import Animated, { 
  FadeInDown,
  SlideInRight,
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
  sender?: {
    username: string;
    email: string;
  };
}

interface Section {
  title: string;
  data: Prediction[];
  type: 'pending' | 'revealed';
}

interface PredictionCardProps {
  item: Prediction;
  type: 'pending' | 'revealed';
  index: number;
}

function PredictionCard({ item, type, index }: PredictionCardProps) {
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

  if (type === 'pending') {
    return (
      <Card index={index}>
        <AnimatedPressable
          entering={SlideInRight.delay(300)}
          style={[styles.pendingCardContent, animatedStyle]}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        >
          <LinearGradient
            colors={['#fef3c7', '#fffbeb']}
            style={[StyleSheet.absoluteFill, styles.cardGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.pendingIconContainer}>
            <Clock size={24} color="#854d0e" />
          </View>
          <View style={styles.pendingContent}>
            <Text style={styles.pendingTitle}>Future Prediction</Text>
            <Text style={styles.pendingText}>
              {item.sender?.username} sent you a prediction that will be revealed {formatRelativeTime(item.scheduled_for)}
            </Text>
          </View>
        </AnimatedPressable>
      </Card>
    );
  }

  return (
    <Card index={index}>
      <AnimatedPressable
        style={[styles.revealedCardContent, animatedStyle]}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <LinearGradient
          colors={['#fff', '#f8fafc']}
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
              <Text style={styles.metaText}>{item.sender?.username}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Clock size={16} color="#6366f1" />
              <Text style={styles.metaText}>{formatDateTime(item.scheduled_for)}</Text>
            </View>
          </View>
        </View>
      </AnimatedPressable>
    </Card>
  );
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(date - now);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays < 7) return `in ${diffDays} days`;
  if (diffDays < 30) return `in ${Math.ceil(diffDays / 7)} weeks`;
  return `on ${formatDateTime(dateString)}`;
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

export default function InboxScreen() {
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

      const { data: userPredictions, error: userPredictionsError } = await supabase
        .from('predictions')
        .select(`
          id,
          message,
          scheduled_for,
          delivered_at,
          sender:profiles!sender_id (
            username,
            email
          )
        `)
        .eq('recipient_id', user.id)
        .order('scheduled_for', { ascending: false });

      if (userPredictionsError) throw userPredictionsError;
      setPredictions(userPredictions || []);
    } catch (err) {
      console.error('Error in loadPredictions:', err);
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

  const now = new Date();

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

  const pendingPredictions = predictions.filter(p => new Date(p.scheduled_for) > now);
  const revealedPredictions = predictions.filter(p => new Date(p.scheduled_for) <= now);

  const sections: Section[] = [
    {
      title: 'Scheduled',
      data: pendingPredictions,
      type: 'pending'
    },
    {
      title: 'Delivered',
      data: revealedPredictions,
      type: 'revealed'
    }
  ].filter(section => section.data.length > 0);

  if (sections.length === 0) {
    return (
      <AnimatedPage>
        <View style={styles.container}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No predictions yet</Text>
            <Text style={styles.emptyText}>
              When someone sends you a prediction,{'\n'}it will appear here like magic
            </Text>
          </View>
        </View>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <View style={styles.container}>      
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366f1"
            />
          }
          renderSectionHeader={({ section }) => (
            <Animated.View 
              style={styles.sectionHeader}
              entering={FadeInDown.delay(200)}
            >
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionCount}>
                {section.data.length} {section.data.length === 1 ? 'prediction' : 'predictions'}
              </Text>
            </Animated.View>
          )}
          renderItem={({ item, section, index }) => (
            <PredictionCard item={item} type={section.type} index={index} />
          )}
          stickySectionHeadersEnabled={false}
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
  listContent: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 24,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  sectionCount: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  cardGradient: {
    borderRadius: 16,
  },
  pendingCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    overflow: 'hidden',
  },
  revealedCardContent: {
    padding: 20,
    overflow: 'hidden',
  },
  pendingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#854d0e',
  },
  pendingContent: {
    flex: 1,
  },
  pendingTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: '#854d0e',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  pendingText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: '#854d0e',
    lineHeight: 22,
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
    paddingHorizontal: 4,
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