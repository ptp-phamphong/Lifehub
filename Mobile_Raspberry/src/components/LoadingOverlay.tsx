import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, View } from 'react-native';

interface Props {
  visible: boolean;
  message?: string;
}

export default function LoadingOverlay({ visible, message = 'Đang tải...' }: Props) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Spin loop
      const loop = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
          useNativeDriver: true,
        }),
      );
      loop.start();

      return () => loop.stop();
    } else {
      fadeAnim.setValue(0);
      spinAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <View style={styles.card}>
          <Animated.View style={[styles.ring, { transform: [{ rotate: spin }] }]}>
            <View style={styles.ringInner} />
          </Animated.View>
          <Text style={styles.text}>{message}</Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 28,
    paddingHorizontal: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
  },
  ring: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: '#e2e8f0',
    borderTopColor: '#3b82f6',
    borderRightColor: '#8b5cf6',
  },
  ringInner: {
    // Empty inner view to maintain the ring shape
    flex: 1,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    letterSpacing: 0.3,
  },
});
