import { Tabs } from 'expo-router';
import { MessageSquare, Inbox, User, Plus } from 'lucide-react-native';
import { Platform, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

function FloatingActionButton() {
  const router = useRouter();
  
  return (
    <TouchableOpacity
      style={{
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 100 : 85,
        right: 20,
        backgroundColor: '#6366f1',
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        zIndex: 100,
      }}
      onPress={() => router.push('/create')}
    >
      <Plus size={24} color="#fff" />
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { 
            backgroundColor: '#fff',
            borderTopColor: '#e2e8f0',
            height: Platform.OS === 'ios' ? 85 : 65,
            paddingBottom: Platform.OS === 'ios' ? 20 : 5,
          },
          tabBarActiveTintColor: '#6366f1',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarLabelStyle: {
            fontFamily: 'Poppins_400Regular',
            fontSize: 12,
          },
          unmountOnBlur: true,
        }}>
        <Tabs.Screen
          name="inbox"
          options={{
            tabBarLabel: 'Incoming',
            tabBarIcon: ({ color, size }) => (
              <MessageSquare size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="outbox"
          options={{
            tabBarLabel: 'Sent',
            tabBarIcon: ({ color, size }) => (
              <Inbox size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <User size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      <FloatingActionButton />
    </>
  );
}