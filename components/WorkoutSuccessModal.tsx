import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
    withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface WorkoutSuccessModalProps {
    visible: boolean;
    onClose: () => void;
    expEarned: number;
    levelUp?: boolean;
    newLevel?: number;
    streak?: number;
}

export default function WorkoutSuccessModal({
    visible,
    onClose,
    expEarned,
    levelUp = false,
    newLevel = 1,
    streak = 0
}: WorkoutSuccessModalProps) {
    // Animation values
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);
    const expScale = useSharedValue(0);
    const streakTranslateY = useSharedValue(50);
    const streakOpacity = useSharedValue(0);
    const levelScale = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            // Reset values
            scale.value = 0;
            opacity.value = 0;
            expScale.value = 0;
            streakTranslateY.value = 50;
            streakOpacity.value = 0;
            levelScale.value = 0;

            // Start sequence
            opacity.value = withTiming(1, { duration: 300 });
            scale.value = withSpring(1, { damping: 12 });

            // Trigger haptics
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // EXP Animation
            expScale.value = withDelay(400, withSpring(1, { damping: 10 }));

            // Level Up Animation
            if (levelUp) {
                levelScale.value = withDelay(600, withSpring(1));
            }

            // Streak Animation
            streakTranslateY.value = withDelay(800, withSpring(0));
            streakOpacity.value = withDelay(800, withTiming(1));
        }
    }, [visible, levelUp]);

    const modalStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const expStyle = useAnimatedStyle(() => ({
        transform: [{ scale: expScale.value }],
    }));

    const levelUpStyle = useAnimatedStyle(() => ({
        transform: [{ scale: levelScale.value }],
    }));

    const streakStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: streakTranslateY.value }],
        opacity: streakOpacity.value,
    }));

    return (
        <Modal visible={visible} transparent animationType="none">
            <View style={styles.overlay}>
                <Animated.View style={[styles.container, modalStyle]}>
                    <LinearGradient
                        colors={['#1a1a1a', '#0a0a0a']}
                        style={styles.gradient}
                    >
                        {/* Trophy Icon */}
                        <View style={styles.iconContainer}>
                            <LinearGradient
                                colors={['#f1c40f', '#f39c12']}
                                style={styles.iconBackground}
                            >
                                <Ionicons name="trophy" size={50} color="#fff" />
                            </LinearGradient>
                        </View>

                        <Text style={styles.title}>WORKOUT COMPLETE!</Text>

                        {/* EXP Section */}
                        <Animated.View style={[styles.statContainer, expStyle]}>
                            <Text style={styles.statLabel}>EXP EARNED</Text>
                            <Text style={styles.expValue}>+{expEarned}</Text>
                        </Animated.View>

                        {/* Level Up Badge */}
                        {levelUp && (
                            <Animated.View style={[styles.levelUpContainer, levelUpStyle]}>
                                <LinearGradient
                                    colors={['#6C63FF', '#5a52d5']}
                                    style={styles.levelUpBadge}
                                >
                                    <Text style={styles.levelUpText}>LEVEL UP!</Text>
                                    <Text style={styles.levelValue}>{newLevel}</Text>
                                </LinearGradient>
                            </Animated.View>
                        )}

                        {/* Streak Section */}
                        <Animated.View style={[styles.streakContainer, streakStyle]}>
                            <Ionicons name="flame" size={24} color="#e74c3c" />
                            <Text style={styles.streakText}>{streak} Day Streak</Text>
                        </Animated.View>

                        <TouchableOpacity
                            style={styles.button}
                            onPress={onClose}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#6C63FF', '#5a52d5']}
                                style={styles.buttonGradient}
                            >
                                <Text style={styles.buttonText}>CONTINUE</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </LinearGradient>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: width * 0.85,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333',
        shadowColor: '#6C63FF',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    gradient: {
        padding: 30,
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 20,
        shadowColor: '#f1c40f',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    iconBackground: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#fff',
    },
    title: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 30,
        textAlign: 'center',
        letterSpacing: 1,
    },
    statContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    statLabel: {
        color: '#888',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 5,
    },
    expValue: {
        color: '#f1c40f',
        fontSize: 48,
        fontWeight: '900',
        textShadowColor: 'rgba(241, 196, 15, 0.3)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
    },
    levelUpContainer: {
        marginBottom: 20,
    },
    levelUpBadge: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    levelUpText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    levelValue: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '900',
    },
    streakContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(231, 76, 60, 0.3)',
    },
    streakText: {
        color: '#e74c3c',
        fontWeight: 'bold',
        marginLeft: 8,
        fontSize: 16,
    },
    button: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#6C63FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonGradient: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
});
