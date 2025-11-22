import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Modal, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { generateWorkoutPlan } from '../../lib/workout-logic';

const STEPS = [
    'Reason',
    'Focus',
    'Fitness Level',
    'Activity Level',
    'Stats',
    'Target',
    'Schedule',
];

export default function Onboarding() {
    const [currentStep, setCurrentStep] = useState(0);
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        workout_reason: '',
        focus_area: '',
        fitness_level: '',
        activity_level: '',
        gender: '',
        age: '',
        height: '',
        weight: '',
        target_weight: '',
        workout_days: [] as string[],
        workout_time: new Date().toISOString(),
        reminders_enabled: false,
    });

    const [showPopup, setShowPopup] = useState(false);
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            // Show popup
            setShowPopup(true);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }).start();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const updateData = (key: string, value: any) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const toggleDay = (day: string) => {
        const days = formData.workout_days.includes(day)
            ? formData.workout_days.filter((d) => d !== day)
            : [...formData.workout_days, day];
        updateData('workout_days', days);
    };

    const finishOnboarding = async () => {
        // Validate inputs
        if (!formData.age || !formData.height || !formData.weight || !formData.target_weight) {
            Alert.alert('Missing Info', 'Please fill in all stats fields.');
            return;
        }

        setLoading(true);
        try {
            console.log('Starting onboarding finish...');
            if (!user) throw new Error('No user found');

            const age = parseInt(formData.age) || 0;
            const height = parseFloat(formData.height) || 0;
            const weight = parseFloat(formData.weight) || 0;
            const target_weight = parseFloat(formData.target_weight) || 0;

            // Extract HH:MM:SS from ISO string for Postgres time type
            const workout_time = formData.workout_time.split('T')[1] ? formData.workout_time.split('T')[1].split('.')[0] : '09:00:00';

            console.log('Updating profile...');
            const { error } = await supabase
                .from('profiles')
                .update({
                    ...formData,
                    age,
                    height,
                    weight,
                    target_weight,
                    workout_time,
                    updated_at: new Date(),
                })
                .eq('id', user.id);

            if (error) {
                console.error('Profile update error:', error);
                throw error;
            }

            console.log('Generating workout plan...');
            // Generate Workout Plan
            await generateWorkoutPlan(user.id, {
                ...formData,
                id: user.id, // Add ID to match interface
                age,
                height,
                weight,
                target_weight,
                workout_time: formData.workout_time
            });

            console.log('Navigating to tabs...');
            router.replace('/(tabs)');
        } catch (error: any) {
            console.error('Onboarding error:', error);
            Alert.alert('Error', error.message || 'Failed to complete onboarding');
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 0:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.question}>Why do you want to workout?</Text>
                        {['Health', 'Weight Loss', 'Build Muscle', 'Endurance'].map((item) => (
                            <TouchableOpacity
                                key={item}
                                style={[styles.option, formData.workout_reason === item && styles.selectedOption]}
                                onPress={() => updateData('workout_reason', item)}
                            >
                                <Text style={[styles.optionText, formData.workout_reason === item && styles.selectedOptionText]}>{item}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                );
            case 1:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.question}>What is your focus area?</Text>
                        {['Full Body', 'Upper Body', 'Lower Body', 'Core', 'Cardio'].map((item) => (
                            <TouchableOpacity
                                key={item}
                                style={[styles.option, formData.focus_area === item && styles.selectedOption]}
                                onPress={() => updateData('focus_area', item)}
                            >
                                <Text style={[styles.optionText, formData.focus_area === item && styles.selectedOptionText]}>{item}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                );
            case 2:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.question}>What is your fitness level?</Text>
                        {['Beginner', 'Intermediate', 'Advanced'].map((item) => (
                            <TouchableOpacity
                                key={item}
                                style={[styles.option, formData.fitness_level === item && styles.selectedOption]}
                                onPress={() => updateData('fitness_level', item)}
                            >
                                <Text style={[styles.optionText, formData.fitness_level === item && styles.selectedOptionText]}>{item}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                );
            case 3:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.question}>What is your activity level?</Text>
                        {['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active'].map((item) => (
                            <TouchableOpacity
                                key={item}
                                style={[styles.option, formData.activity_level === item && styles.selectedOption]}
                                onPress={() => updateData('activity_level', item)}
                            >
                                <Text style={[styles.optionText, formData.activity_level === item && styles.selectedOptionText]}>{item}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                );
            case 4:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.question}>Tell us about yourself</Text>
                        <View style={styles.row}>
                            {['Male', 'Female', 'Other'].map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    style={[styles.smallOption, formData.gender === item && styles.selectedOption]}
                                    onPress={() => updateData('gender', item)}
                                >
                                    <Text style={[styles.optionText, formData.gender === item && styles.selectedOptionText]}>{item}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="Age"
                            keyboardType="numeric"
                            value={formData.age}
                            onChangeText={(text) => updateData('age', text)}
                            placeholderTextColor="#666"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Height (cm)"
                            keyboardType="numeric"
                            value={formData.height}
                            onChangeText={(text) => updateData('height', text)}
                            placeholderTextColor="#666"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Weight (kg)"
                            keyboardType="numeric"
                            value={formData.weight}
                            onChangeText={(text) => updateData('weight', text)}
                            placeholderTextColor="#666"
                        />
                    </View>
                );
            case 5:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.question}>What is your target weight?</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Target Weight (kg)"
                            keyboardType="numeric"
                            value={formData.target_weight}
                            onChangeText={(text) => updateData('target_weight', text)}
                            placeholderTextColor="#666"
                        />
                    </View>
                );
            case 6:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.question}>When do you want to workout?</Text>
                        <View style={styles.daysContainer}>
                            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
                                <TouchableOpacity
                                    key={day}
                                    style={[styles.dayOption, formData.workout_days.includes(day) && styles.selectedDayOption]}
                                    onPress={() => toggleDay(day)}
                                >
                                    <Text style={[styles.dayText, formData.workout_days.includes(day) && styles.selectedDayText]}>{day}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[styles.option, { marginTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                            onPress={() => updateData('reminders_enabled', !formData.reminders_enabled)}
                        >
                            <Text style={styles.optionText}>Enable Reminders</Text>
                            <Ionicons
                                name={formData.reminders_enabled ? "notifications" : "notifications-off"}
                                size={24}
                                color={formData.reminders_enabled ? "#6C63FF" : "#666"}
                            />
                        </TouchableOpacity>
                    </View>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Animated.View style={{ transform: [{ scale: fadeAnim }] }}>
                    <Text style={styles.loadingText}>Creating Custom Plan...</Text>
                    <Text style={styles.loadingSubText}>Analyzing your stats...</Text>
                </Animated.View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${((currentStep + 1) / STEPS.length) * 100}%` }]} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {renderStep()}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity onPress={handleBack} disabled={currentStep === 0} style={styles.navButton}>
                    <Text style={[styles.navButtonText, currentStep === 0 && styles.disabledText]}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleNext} style={styles.navButton}>
                    <Text style={styles.navButtonText}>{currentStep === STEPS.length - 1 ? 'Finish' : 'Next'}</Text>
                </TouchableOpacity>
            </View>

            <Modal visible={showPopup} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <Animated.View style={[styles.popup, { opacity: fadeAnim }]}>
                        <Text style={styles.popupTitle}>SYSTEM ALERT</Text>
                        <Text style={styles.popupText}>Are you ready to accept the challenge?</Text>
                        <Text style={styles.popupSubtext}>"The only limit to your growth is you."</Text>

                        <View style={styles.popupButtons}>
                            <TouchableOpacity style={styles.acceptButton} onPress={finishOnboarding}>
                                <Text style={styles.acceptButtonText}>YES</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.declineButton} onPress={() => setShowPopup(false)}>
                                <Text style={styles.declineButtonText}>NO</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
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
    progressBar: {
        height: 4,
        backgroundColor: '#333',
        marginHorizontal: 20,
        borderRadius: 2,
        marginBottom: 20,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#6C63FF',
        borderRadius: 2,
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: 20,
    },
    stepContainer: {
        gap: 15,
    },
    question: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 20,
    },
    subtext: {
        fontSize: 16,
        color: '#888',
    },
    option: {
        backgroundColor: '#1a1a1a',
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
    },
    selectedOption: {
        borderColor: '#6C63FF',
        backgroundColor: '#2a2a2a',
    },
    optionText: {
        color: '#fff',
        fontSize: 18,
    },
    selectedOptionText: {
        color: '#6C63FF',
        fontWeight: 'bold',
    },
    smallOption: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        alignItems: 'center',
    },
    row: {
        flexDirection: 'row',
        gap: 10,
    },
    input: {
        backgroundColor: '#1a1a1a',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        color: '#fff',
        fontSize: 16,
    },
    daysContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    dayOption: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    selectedDayOption: {
        backgroundColor: '#6C63FF',
        borderColor: '#6C63FF',
    },
    dayText: {
        color: '#fff',
        fontSize: 12,
    },
    selectedDayText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    navButton: {
        padding: 10,
    },
    navButtonText: {
        color: '#6C63FF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    disabledText: {
        color: '#333',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    popup: {
        width: '80%',
        backgroundColor: '#000',
        borderWidth: 2,
        borderColor: '#4169E1', // Royal Blue for Solo Leveling vibe
        padding: 20,
        alignItems: 'center',
        shadowColor: '#4169E1',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 10,
    },
    popupTitle: {
        color: '#4169E1',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        letterSpacing: 2,
    },
    popupText: {
        color: '#fff',
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 10,
    },
    popupSubtext: {
        color: '#888',
        fontSize: 14,
        fontStyle: 'italic',
        marginBottom: 20,
    },
    popupButtons: {
        flexDirection: 'row',
        gap: 20,
    },
    acceptButton: {
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderWidth: 1,
        borderColor: '#4169E1',
        backgroundColor: 'rgba(65, 105, 225, 0.2)',
    },
    acceptButtonText: {
        color: '#4169E1',
        fontWeight: 'bold',
        fontSize: 16,
    },
    declineButton: {
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderWidth: 1,
        borderColor: '#666',
    },
    declineButtonText: {
        color: '#666',
        fontWeight: 'bold',
        fontSize: 16,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#6C63FF',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    loadingSubText: {
        color: '#888',
        fontSize: 16,
    },
});
