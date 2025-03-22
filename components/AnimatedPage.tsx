import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface AnimatedPageProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function AnimatedPage({ children, style }: AnimatedPageProps) {
  return (
    <Animated.View 
      entering={FadeIn.duration(300)}
      style={[styles.container, style]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});