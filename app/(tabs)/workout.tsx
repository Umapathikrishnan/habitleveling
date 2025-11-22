import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { calculateExp } from '../../lib/workout-logic';

export default function Workout() {
    const { user } = useAuth();
    const router = useRouter();
    const [plan, setPlan] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<any>(null);
    const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [earnedExp, setEarnedExp] = useState(0);

    useEffect(() => {
        fetchPlan();
    }, [user]);

    const fetchPlan = async () => {
        try {
            if (!user) return;

            const { data, error } = await supabase
                .from('workout_plans')
                .select(`
                    *,
                    plan_exercises (
                        *,
                        exercises (*)
                    )
                `)
                .eq('user_id', user.id)
                .eq('is_active', true)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No active plan
                    setPlan(null);
                } else {
                    throw error;
                }
            } else {
                // Sort exercises by order_index
                if (data && data.plan_exercises) {
                    data.plan_exercises.sort((a: any, b: any) => a.order_index - b.order_index);
                }
                setPlan(data);
            }
        } catch (error: any) {
            console.error('Error fetching plan:', error);
            Alert.alert('Error', 'Failed to load workout plan');
        } finally {
            setLoading(false);
        }
    };

    const startSession = async () => {
        try {
            const { data, error } = await supabase
                .from('workout_sessions')
                .insert({
                    user_id: user?.id,
                    plan_id: plan.id,
                    started_at: new Date(),
                    status: 'in_progress'
                })
                .select()
                .single();

            if (error) throw error;
            setSession(data);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const toggleExercise = (exerciseId: string) => {
        const newCompleted = new Set(completedExercises);
        if (newCompleted.has(exerciseId)) {
            newCompleted.delete(exerciseId);
        } else {
            newCompleted.add(exerciseId);
        }
        setCompletedExercises(newCompleted);
    };

    const finishWorkout = async () => {
        if (!session) return;

        // Calculate EXP
        let totalExp = 0;
        plan.plan_exercises.forEach((item: any) => {
            if (completedExercises.has(item.id)) {
                totalExp += calculateExp(item.exercises.difficulty, item.sets, item.reps);
            }
        });

        try {
            // Update session
            const { error: sessionError } = await supabase
                .from('workout_sessions')
                .update({
                    ended_at: new Date(),
                    status: 'completed',
                    exp_earned: totalExp
                })
                .eq('id', session.id);

            if (sessionError) throw sessionError;

            // Update User Stats (EXP, Streak)
            // We need to fetch current stats first or use a stored procedure.
            // For simplicity, let's fetch and update.
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('exp, level, exp_to_next_level, streak_current')
                .eq('id', user?.id)
                .single();

            if (profileError) throw profileError;

            let newExp = profile.exp + totalExp;
            let newLevel = profile.level;
            let newExpToNext = profile.exp_to_next_level;

            // Level up logic
            while (newExp >= newExpToNext) {
                newExp -= newExpToNext;
                newLevel += 1;
                newExpToNext = Math.floor(newExpToNext * 1.2); // 20% increase per level
            }

            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    exp: newExp,
                    level: newLevel,
                    exp_to_next_level: newExpToNext,
                    streak_current: profile.streak_current + 1, // Simple streak increment
                    updated_at: new Date()
                })
                .eq('id', user?.id);

            if (updateError) throw updateError;

            setEarnedExp(totalExp);
            setShowCompletionModal(true);
            setSession(null);
            setCompletedExercises(new Set());

        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6C63FF" />
            </View>
        );
    }

    if (!plan) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>No Active Plan</Text>
                <Text style={styles.subtext}>Go to settings to generate a new plan.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{plan.name}</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{plan.plan_exercises?.length || 0} Exercises</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {plan.plan_exercises?.map((item: any, index: number) => (
                    <View key={item.id} style={styles.exerciseCard}>
                        <View style={styles.exerciseInfo}>
                            <Text style={styles.exerciseName}>{item.exercises.name}</Text>
                            <Text style={styles.exerciseDetails}>
                                {item.sets} Sets x {item.reps} Reps • {item.exercises.muscle_group}
                            </Text>
                        </View>

                        {session ? (
                            <TouchableOpacity
                                style={[styles.checkbox, completedExercises.has(item.id) && styles.checkedBox]}
                                onPress={() => toggleExercise(item.id)}
                            >
                                {completedExercises.has(item.id) && <Ionicons name="checkmark" size={20} color="#FFF" />}
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.lockedIcon}>
                                <Ionicons name="lock-closed-outline" size={20} color="#666" />
                            </View>
                        )}
                    </View>
                ))}
            </ScrollView>

            <View style={styles.footer}>
                {!session ? (
                    <TouchableOpacity style={styles.startButton} onPress={startSession}>
                        <Text style={styles.startButtonText}>START WORKOUT</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.finishButton} onPress={finishWorkout}>
                        <Text style={styles.finishButtonText}>FINISH WORKOUT</Text>
                    </TouchableOpacity>
                )}
            </View>

            <Modal visible={showCompletionModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Ionicons name="trophy" size={60} color="#f1c40f" />
                        <Text style={styles.modalTitle}>WORKOUT COMPLETE!</Text>
                        <Text style={styles.modalExp}>+{earnedExp} EXP</Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => {
                                setShowCompletionModal(false);
                                router.replace('/(tabs)');
                            }}
                        >
                            <Text style={styles.closeButtonText}>CONTINUE</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        paddingTop: 50,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingHorizontal: 20,
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    badge: {
        backgroundColor: '#2a2a2a',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    badgeText: {
        color: '#ccc',
        fontSize: 12,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 100,
        gap: 15,
    },
    exerciseCard: {
        backgroundColor: '#1a1a1a',
        padding: 15,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    exerciseDetails: {
        color: '#888',
        fontSize: 14,
    },
    checkbox: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: '#6C63FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkedBox: {
        backgroundColor: '#6C63FF',
    },
    lockedIcon: {
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: 'rgba(10,10,10,0.9)',
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    startButton: {
        backgroundColor: '#6C63FF',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    startButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
        letterSpacing: 1,
    },
    finishButton: {
        backgroundColor: '#e74c3c',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    finishButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
        letterSpacing: 1,
    },
    text: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    subtext: {
        color: '#888',
        marginTop: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#1a1a1a',
        padding: 30,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f1c40f',
    },
    modalTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
    },
    modalExp: {
        color: '#f1c40f',
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 30,
    },
    closeButton: {
        backgroundColor: '#6C63FF',
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 25,
    },
    closeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
