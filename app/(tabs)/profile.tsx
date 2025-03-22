import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { Card, AnimatedPage } from '@/components';
import { LogOut, CircleAlert as AlertCircle, Mail, User as UserIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface Profile {
  id: string;
  username: string;
  email: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/sign-in');
        return;
      }

      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!existingProfile) {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            username: user.email?.split('@')[0] || `user_${Date.now()}`
          })
          .select()
          .single();

        if (createError) throw createError;
        setProfile(newProfile);
      } else {
        setProfile(existingProfile);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <AnimatedPage>
        <View style={styles.container}>
          <Text style={styles.loadingText}>Loading profile...</Text>
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
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadProfile}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
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
          <Text style={styles.title}>Account</Text>
        </Animated.View>

        <Card>
          <Animated.View 
            entering={FadeInDown.delay(300)}
            style={styles.avatarContainer}
          >
            <LinearGradient
              colors={['#6366f1', '#4f46e5']}
              style={styles.avatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.avatarText}>
                {profile?.username?.[0]?.toUpperCase() || '?'}
              </Text>
            </LinearGradient>
          </Animated.View>
          
          <Animated.View 
            entering={FadeInDown.delay(400)}
            style={styles.infoContainer}
          >
            <View style={styles.infoRow}>
              <UserIcon size={20} color="#64748b" />
              <Text style={styles.username}>{profile?.username}</Text>
            </View>
            <View style={styles.infoRow}>
              <Mail size={20} color="#64748b" />
              <Text style={styles.email}>{profile?.email}</Text>
            </View>
          </Animated.View>
        </Card>

        <Animated.View entering={FadeInDown.delay(500)}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <LogOut size={20} color="#fff" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </AnimatedPage>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1e293b',
    letterSpacing: -1,
  },
  loadingText: {
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    marginVertical: 12,
    letterSpacing: -0.5,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryText: {
    color: '#fff',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 36,
    fontFamily: 'Poppins_600SemiBold',
  },
  infoContainer: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  username: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  email: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#64748b',
  },
  signOutButton: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
});