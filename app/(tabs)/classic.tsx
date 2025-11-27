import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Modal, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { calculateExp } from '../../lib/workout-logic';
import WorkoutSuccessModal from '../../components/WorkoutSuccessModal';

export default function ClassicMode() {
    const { user } = useAuth();
    const [exercises, setExercises] = useState<any[]>([]);
    const [selectedExercise, setSelectedExercise] = useState<any>(null);
    const [sets, setSets] = useState('3');
    const [reps, setReps] = useState('10');
    const [isActive, setIsActive] = useState(false);
    const [timer, setTimer] = useState(0);
    const [showCompletion, setShowCompletion] = useState(false);
    const [earnedExp, setEarnedExp] = useState(0);
    const [isLevelUp, setIsLevelUp] = useState(false);
    const [newLevel, setNewLevel] = useState(1);
    const [streak, setStreak] = useState(0);

    useEffect(() => {
        fetchExercises();
    }, []);

    useEffect(() => {
        let interval: any;
        if (isActive) {
            interval = setInterval(() => {
                setTimer(t => t + 1);
            }, 1000);
        } else if (!isActive && timer !== 0) {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isActive, timer]);

    const fetchExercises = async () => {
        const { data } = await supabase.from('exercises').select('*').order('name');
        setExercises(data || []);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleStart = () => {
        if (!selectedExercise) {
            Alert.alert('Select Exercise', 'Please select an exercise first.');
            return;
        }
        setIsActive(true);
        setTimer(0);
    };

    const handleFinish = async () => {
        setIsActive(false);

        const exp = calculateExp(selectedExercise.difficulty, parseInt(sets), parseInt(reps));
        setEarnedExp(exp);

        try {
            // Update EXP
            const { data: profile } = await supabase
                .from('profiles')
                .select('exp, level, exp_to_next_level')
                .eq('id', user?.id)
                .single();

            if (profile) {
                let newExp = profile.exp + exp;
                let newLevel = profile.level;
                let newExpToNext = profile.exp_to_next_level;

                while (newExp >= newExpToNext) {
                    newExp -= newExpToNext;
                    newLevel += 1;
                    newExpToNext = Math.floor(newExpToNext * 1.2);
                }

                await supabase.from('profiles').update({
                    exp: newExp,
                    level: newLevel,
                    exp_to_next_level: newExpToNext
                }).eq('id', user?.id);

                setIsLevelUp(newLevel > profile.level);
                setNewLevel(newLevel);
                // Note: Classic mode might not affect streak in the same way, but let's assume it does or just pass 0 if not tracked here.
                // For consistency, let's fetch streak or just default to current.
                // Since we didn't fetch streak in the select above, let's just pass 0 or update logic to fetch it.
                // Ideally we should fetch streak too.
            }

            // Let's update the select to include streak_current
            const { data: streakData } = await supabase
                .from('profiles')
                .select('streak_current')
                .eq('id', user?.id)
                .single();

            if (streakData) {
                setStreak(streakData.streak_current);
            }

            setShowCompletion(true);
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    };

    const renderExerciseItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.exerciseItem, selectedExercise?.id === item.id && styles.selectedItem]}
            onPress={() => setSelectedExercise(item)}
        >
            <Text style={[styles.exerciseName, selectedExercise?.id === item.id && styles.selectedText]}>{item.name}</Text>
            <Text style={styles.exerciseType}>{item.difficulty}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Classic Mode</Text>
                <Text style={styles.subtitle}>Farm EXP with custom workouts.</Text>
            </View>

            {!isActive ? (
                <View style={styles.setupContainer}>
                    <Text style={styles.label}>Select Exercise</Text>
                    <View style={styles.listContainer}>
                        <FlatList
                            data={exercises}
                            renderItem={renderExerciseItem}
                            keyExtractor={item => item.id}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>

                    <View style={styles.inputsRow}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Sets</Text>
                            <TextInput
                                style={styles.input}
                                value={sets}
                                onChangeText={setSets}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Reps</Text>
                            <TextInput
                                style={styles.input}
                                value={reps}
                                onChangeText={setReps}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <TouchableOpacity style={styles.startButton} onPress={handleStart}>
                        <Text style={styles.startButtonText}>START TRAINING</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.activeContainer}>
                    <View style={styles.timerContainer}>
                        <Ionicons name="timer-outline" size={50} color="#6C63FF" />
                        <Text style={styles.timerText}>{formatTime(timer)}</Text>
                    </View>

                    <View style={styles.activeInfo}>
                        <Text style={styles.activeTitle}>{selectedExercise?.name}</Text>
                        <Text style={styles.activeDetails}>{sets} Sets • {reps} Reps</Text>
                    </View>

                    <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
                        <Text style={styles.finishButtonText}>COMPLETE WORKOUT</Text>
                    </TouchableOpacity>
                </View>
            )}

            <WorkoutSuccessModal
                visible={showCompletion}
                onClose={() => {
                    setShowCompletion(false);
                    setSelectedExercise(null);
                }}
                expEarned={earnedExp}
                levelUp={isLevelUp}
                newLevel={newLevel}
                streak={streak}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        paddingTop: 60,
    },
    header: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    title: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
    },
    subtitle: {
        color: '#888',
        fontSize: 16,
    },
    setupContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    label: {
        color: '#ccc',
        marginBottom: 10,
        fontSize: 16,
        fontWeight: 'bold',
    },
    listContainer: {
        height: 200,
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        marginBottom: 20,
        padding: 10,
    },
    exerciseItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    selectedItem: {
        backgroundColor: '#2a2a2a',
    },
    exerciseName: {
        color: '#fff',
        fontSize: 16,
    },
    selectedText: {
        color: '#6C63FF',
        fontWeight: 'bold',
    },
    exerciseType: {
        color: '#888',
        fontSize: 12,
    },
    inputsRow: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 30,
    },
    inputGroup: {
        flex: 1,
    },
    input: {
        backgroundColor: '#1a1a1a',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        color: '#fff',
        fontSize: 18,
        textAlign: 'center',
    },
    startButton: {
        backgroundColor: '#6C63FF',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    startButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
        letterSpacing: 1,
    },
    activeContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    timerContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    timerText: {
        color: '#fff',
        fontSize: 60,
        fontWeight: 'bold',
        fontVariant: ['tabular-nums'],
        marginTop: 10,
    },
    activeInfo: {
        alignItems: 'center',
        marginBottom: 60,
    },
    activeTitle: {
        color: '#6C63FF',
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    activeDetails: {
        color: '#ccc',
        fontSize: 20,
    },
    finishButton: {
        backgroundColor: '#e74c3c',
        paddingVertical: 20,
        paddingHorizontal: 40,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    finishButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
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
