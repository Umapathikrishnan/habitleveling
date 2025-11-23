import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Alert,
    Image,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';

interface EditProfileModalProps {
    visible: boolean;
    onClose: () => void;
    profile: any;
    onUpdate: () => void;
}

export default function EditProfileModal({ visible, onClose, profile, onUpdate }: EditProfileModalProps) {
    const [loading, setLoading] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showFocusPicker, setShowFocusPicker] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        gender: '',
        age: '',
        height: '',
        weight: '',
        target_weight: '',
        activity_level: '',
        fitness_level: '',
        focus_area: '',
        workout_time: '',
        workout_days: [] as string[],
        avatar_url: ''
    });

    useEffect(() => {
        if (profile) {
            setFormData({
                username: profile.username || '',
                full_name: profile.full_name || '',
                gender: profile.gender || '',
                age: profile.age?.toString() || '',
                height: profile.height?.toString() || '',
                weight: profile.weight?.toString() || '',
                target_weight: profile.target_weight?.toString() || '',
                activity_level: profile.activity_level || '',
                fitness_level: profile.fitness_level || '',
                focus_area: profile.focus_area || '',
                workout_time: profile.workout_time || '',
                workout_days: profile.workout_days || [],
                avatar_url: profile.avatar_url || ''
            });
        }
    }, [profile]);

    const handleSave = async () => {
        try {
            setLoading(true);
            const updates = {
                username: formData.username,
                full_name: formData.full_name,
                gender: formData.gender,
                age: parseInt(formData.age) || null,
                height: parseFloat(formData.height) || null,
                weight: parseFloat(formData.weight) || null,
                target_weight: parseFloat(formData.target_weight) || null,
                activity_level: formData.activity_level,
                fitness_level: formData.fitness_level,
                focus_area: formData.focus_area,
                workout_time: formData.workout_time,
                workout_days: formData.workout_days,
                avatar_url: formData.avatar_url,
                updated_at: new Date(),
            };

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', profile.id);

            if (error) throw error;

            onUpdate();
            onClose();
            Alert.alert('Success', 'Profile updated successfully!');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                if (asset.base64) {
                    uploadAvatar(asset.base64, asset.uri.split('.').pop() || 'jpg');
                }
            }
        } catch (error) {
            console.log('Error picking image:', error);
        }
    };

    const uploadAvatar = async (base64: string, fileExt: string) => {
        try {
            setLoading(true);
            const fileName = `${profile.id}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, decode(base64), {
                    contentType: `image/${fileExt}`,
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, avatar_url: data.publicUrl }));
        } catch (error: any) {
            Alert.alert('Error uploading avatar', error.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleDay = (day: string) => {
        setFormData(prev => {
            const days = prev.workout_days.includes(day)
                ? prev.workout_days.filter(d => d !== day)
                : [...prev.workout_days, day];
            return { ...prev, workout_days: days };
        });
    };

    const handleTimeChange = (event: any, selectedDate?: Date) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (selectedDate) {
            const timeString = selectedDate.toLocaleTimeString('en-US', { hour12: false });
            setFormData(prev => ({ ...prev, workout_time: timeString }));
        }
    };

    const focusAreas = ['Full Body', 'Upper Body', 'Lower Body', 'Core', 'Cardio', 'Flexibility', 'Strength'];

    const daysOfWeek = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Edit Profile</Text>
                    <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveButton}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save</Text>}
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.avatarSection}>
                        <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
                            {formData.avatar_url ? (
                                <Image source={{ uri: formData.avatar_url }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Ionicons name="camera" size={40} color="#666" />
                                </View>
                            )}
                            <View style={styles.editIconContainer}>
                                <Ionicons name="pencil" size={16} color="#fff" />
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.changePhotoText}>Change Profile Photo</Text>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.full_name}
                            onChangeText={text => setFormData({ ...formData, full_name: text })}
                            placeholder="Enter full name"
                            placeholderTextColor="#666"
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Username</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.username}
                            onChangeText={text => setFormData({ ...formData, username: text })}
                            placeholder="Enter username"
                            placeholderTextColor="#666"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                            <Text style={styles.label}>Age</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.age}
                                onChangeText={text => setFormData({ ...formData, age: text })}
                                keyboardType="numeric"
                                placeholder="Age"
                                placeholderTextColor="#666"
                            />
                        </View>
                        <View style={[styles.formGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Gender</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.gender}
                                onChangeText={text => setFormData({ ...formData, gender: text })}
                                placeholder="Gender"
                                placeholderTextColor="#666"
                            />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                            <Text style={styles.label}>Height (cm)</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.height}
                                onChangeText={text => setFormData({ ...formData, height: text })}
                                keyboardType="numeric"
                                placeholder="Height"
                                placeholderTextColor="#666"
                            />
                        </View>
                        <View style={[styles.formGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Weight (kg)</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.weight}
                                onChangeText={text => setFormData({ ...formData, weight: text })}
                                keyboardType="numeric"
                                placeholder="Weight"
                                placeholderTextColor="#666"
                            />
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Target Weight (kg)</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.target_weight}
                            onChangeText={text => setFormData({ ...formData, target_weight: text })}
                            keyboardType="numeric"
                            placeholder="Target Weight"
                            placeholderTextColor="#666"
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Workout Days</Text>
                        <View style={styles.daysContainer}>
                            {daysOfWeek.map(day => (
                                <TouchableOpacity
                                    key={day}
                                    style={[
                                        styles.dayButton,
                                        formData.workout_days.includes(day) && styles.dayButtonActive
                                    ]}
                                    onPress={() => toggleDay(day)}
                                >
                                    <Text style={[
                                        styles.dayText,
                                        formData.workout_days.includes(day) && styles.dayTextActive
                                    ]}>{day}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Workout Time</Text>
                        <TouchableOpacity
                            style={styles.input}
                            onPress={() => setShowTimePicker(!showTimePicker)}
                        >
                            <Text style={{ color: formData.workout_time ? '#fff' : '#666' }}>
                                {formData.workout_time || 'Select Time'}
                            </Text>
                        </TouchableOpacity>
                        {showTimePicker && (
                            <DateTimePicker
                                value={formData.workout_time ? new Date(`2000-01-01T${formData.workout_time}`) : new Date()}
                                mode="time"
                                is24Hour={true}
                                display="default"
                                onChange={handleTimeChange}
                            />
                        )}
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Focus Area</Text>
                        <TouchableOpacity
                            style={styles.input}
                            onPress={() => setShowFocusPicker(true)}
                        >
                            <Text style={{ color: formData.focus_area ? '#fff' : '#666' }}>
                                {formData.focus_area || 'Select Focus Area'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.spacer} />
                </ScrollView>

                <Modal
                    visible={showFocusPicker}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowFocusPicker(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowFocusPicker(false)}
                    >
                        <View style={styles.pickerContainer}>
                            <Text style={styles.pickerTitle}>Select Focus Area</Text>
                            {focusAreas.map(area => (
                                <TouchableOpacity
                                    key={area}
                                    style={styles.pickerItem}
                                    onPress={() => {
                                        setFormData(prev => ({ ...prev, focus_area: area }));
                                        setShowFocusPicker(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.pickerItemText,
                                        formData.focus_area === area && styles.pickerItemTextActive
                                    ]}>{area}</Text>
                                    {formData.focus_area === area && (
                                        <Ionicons name="checkmark" size={20} color="#6C63FF" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableOpacity>
                </Modal>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    closeButton: {
        padding: 5,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    saveButton: {
        padding: 5,
        minWidth: 50,
        alignItems: 'flex-end',
    },
    saveButtonText: {
        color: '#6C63FF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    content: {
        padding: 20,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 10,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: '#6C63FF',
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#6C63FF',
    },
    editIconContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#6C63FF',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#0a0a0a',
    },
    changePhotoText: {
        color: '#6C63FF',
        fontSize: 14,
        fontWeight: '600',
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        color: '#888',
        fontSize: 14,
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#1a1a1a',
        color: '#fff',
        padding: 15,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    daysContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    dayButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: '#333',
    },
    dayButtonActive: {
        backgroundColor: '#6C63FF',
        borderColor: '#6C63FF',
    },
    dayText: {
        color: '#888',
        fontSize: 12,
        fontWeight: '600',
    },
    dayTextActive: {
        color: '#fff',
    },
    spacer: {
        height: 50,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        padding: 20,
    },
    pickerContainer: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#333',
    },
    pickerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    pickerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    pickerItemText: {
        color: '#ccc',
        fontSize: 16,
    },
    pickerItemTextActive: {
        color: '#6C63FF',
        fontWeight: 'bold',
    },
});
