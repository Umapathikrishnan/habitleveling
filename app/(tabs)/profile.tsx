import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, RefreshControl, Modal } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

import EditProfileModal from '../../components/EditProfileModal';

export default function Profile() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);

    const [settingsVisible, setSettingsVisible] = useState(false);

    useEffect(() => {
        fetchData();
    }, [user]);

    const fetchData = async () => {
        try {
            if (!user) return;

            const [profileRes, inventoryRes] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', user.id).single(),
                supabase.from('inventory').select('*, shop_items(*)').eq('user_id', user.id)
            ]);

            if (profileRes.error) throw profileRes.error;
            if (inventoryRes.error) throw inventoryRes.error;

            setProfile(profileRes.data);
            setInventory(inventoryRes.data || []);
        } catch (error) {
            console.error('Error fetching profile data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    const getRankName = (level: number) => {
        if (level < 10) return 'E-Rank';
        if (level < 20) return 'D-Rank';
        if (level < 30) return 'C-Rank';
        if (level < 40) return 'B-Rank';
        if (level < 50) return 'A-Rank';
        return 'S-Rank';
    };

    const daysOfWeek = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        >
            <View style={styles.header}>
                <TouchableOpacity style={styles.settingsIcon} onPress={() => setSettingsVisible(true)}>
                    <Ionicons name="settings-sharp" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.avatarContainer}>
                    {profile?.avatar_url ? (
                        <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                    ) : (
                        <Ionicons name="person" size={40} color="#fff" />
                    )}
                </View>
                <Text style={styles.username}>{profile?.full_name || 'Hunter'}</Text>
                <Text style={styles.rank}>{getRankName(profile?.level || 1)}</Text>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{profile?.level || 1}</Text>
                    <Text style={styles.statLabel}>Level</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{profile?.streak_current || 0}</Text>
                    <Text style={styles.statLabel}>Streak</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{profile?.exp || 0}</Text>
                    <Text style={styles.statLabel}>EXP</Text>
                </View>
            </View>

            {/* Physical Stats Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Physical Stats</Text>
                <View style={styles.gridContainer}>
                    <View style={styles.gridItem}>
                        <Ionicons name="body" size={20} color="#6C63FF" />
                        <Text style={styles.gridValue}>{profile?.height || '--'} cm</Text>
                        <Text style={styles.gridLabel}>Height</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <Ionicons name="scale" size={20} color="#6C63FF" />
                        <Text style={styles.gridValue}>{profile?.weight || '--'} kg</Text>
                        <Text style={styles.gridLabel}>Weight</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <Ionicons name="calendar" size={20} color="#6C63FF" />
                        <Text style={styles.gridValue}>{profile?.age || '--'}</Text>
                        <Text style={styles.gridLabel}>Age</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <Ionicons name="male-female" size={20} color="#6C63FF" />
                        <Text style={styles.gridValue}>{profile?.gender || '--'}</Text>
                        <Text style={styles.gridLabel}>Gender</Text>
                    </View>
                </View>
            </View>

            {/* Fitness Profile Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Fitness Profile</Text>
                <View style={styles.cardRow}>
                    <View style={styles.card}>
                        <Ionicons name="fitness" size={24} color="#f1c40f" />
                        <Text style={styles.cardLabel}>Focus Area</Text>
                        <Text style={styles.cardValue}>{profile?.focus_area || 'Not Set'}</Text>
                    </View>
                    <View style={styles.card}>
                        <Ionicons name="pulse" size={24} color="#e74c3c" />
                        <Text style={styles.cardLabel}>Activity Level</Text>
                        <Text style={styles.cardValue}>{profile?.activity_level || 'Not Set'}</Text>
                    </View>
                </View>
            </View>

            {/* Workout Schedule Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Schedule</Text>
                    {profile?.workout_time && (
                        <View style={styles.timeTag}>
                            <Ionicons name="time" size={14} color="#fff" />
                            <Text style={styles.timeText}>{profile.workout_time}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.daysContainer}>
                    {daysOfWeek.map((day) => {
                        const isSelected = profile?.workout_days?.includes(day);
                        return (
                            <View key={day} style={[styles.dayCircle, isSelected && styles.dayCircleActive]}>
                                <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>
                                    {day.charAt(0)}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Inventory</Text>
                {inventory.length === 0 ? (
                    <Text style={styles.emptyText}>Your inventory is empty.</Text>
                ) : (
                    inventory.map((item) => (
                        <View key={item.id} style={styles.inventoryItem}>
                            <View style={styles.itemIcon}>
                                <Ionicons
                                    name={item.shop_items.type === 'streak_freeze' ? 'snow' : 'cube'}
                                    size={24}
                                    color="#6C63FF"
                                />
                            </View>
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemName}>{item.shop_items.name}</Text>
                                <Text style={styles.itemDesc}>{item.shop_items.description}</Text>
                            </View>
                            <View style={styles.itemQty}>
                                <Text style={styles.qtyText}>x{item.quantity}</Text>
                            </View>
                        </View>
                    ))
                )}
            </View>

            <Modal
                visible={settingsVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSettingsVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setSettingsVisible(false)}
                >
                    <View style={styles.sidebar}>
                        <Text style={styles.sidebarTitle}>Settings</Text>
                        <TouchableOpacity style={styles.sidebarItem} onPress={() => { setSettingsVisible(false); setEditModalVisible(true); }}>
                            <Ionicons name="person-outline" size={20} color="#fff" />
                            <Text style={styles.sidebarItemText}>Edit Profile</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.sidebarItem}>
                            <Ionicons name="notifications-outline" size={20} color="#fff" />
                            <Text style={styles.sidebarItemText}>Notifications</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.sidebarItem} onPress={handleSignOut}>
                            <Ionicons name="log-out-outline" size={20} color="#e74c3c" />
                            <Text style={styles.sidebarItemTextDestructive}>Sign Out</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <EditProfileModal
                visible={editModalVisible}
                onClose={() => setEditModalVisible(false)}
                profile={profile}
                onUpdate={fetchData}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    content: {
        paddingTop: 60,
        paddingBottom: 40,
        paddingHorizontal: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
        width: '100%',
    },
    settingsIcon: {
        position: 'absolute',
        right: 0,
        top: 0,
        padding: 10,
        zIndex: 10,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 2,
        borderColor: '#6C63FF',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    username: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    rank: {
        color: '#f1c40f',
        fontSize: 16,
        fontWeight: 'bold',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#1a1a1a',
        padding: 20,
        borderRadius: 16,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#333',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    statLabel: {
        color: '#888',
        fontSize: 12,
    },
    section: {
        marginBottom: 30,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    gridItem: {
        width: '48%',
        backgroundColor: '#1a1a1a',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    gridValue: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 8,
        marginBottom: 4,
    },
    gridLabel: {
        color: '#888',
        fontSize: 12,
    },
    cardRow: {
        flexDirection: 'row',
        gap: 10,
    },
    card: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        alignItems: 'flex-start',
    },
    cardLabel: {
        color: '#888',
        fontSize: 12,
        marginTop: 8,
        marginBottom: 4,
    },
    cardValue: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    timeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6C63FF',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 5,
    },
    timeText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    daysContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#1a1a1a',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
    },
    dayCircle: {
        width: 35,
        height: 35,
        borderRadius: 17.5,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayCircleActive: {
        backgroundColor: '#6C63FF',
    },
    dayText: {
        color: '#888',
        fontSize: 12,
        fontWeight: 'bold',
    },
    dayTextActive: {
        color: '#fff',
    },
    emptyText: {
        color: '#666',
        fontStyle: 'italic',
    },
    inventoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#333',
    },
    itemIcon: {
        width: 40,
        height: 40,
        backgroundColor: 'rgba(108, 99, 255, 0.1)',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    itemDesc: {
        color: '#888',
        fontSize: 12,
    },
    itemQty: {
        backgroundColor: '#333',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    qtyText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        flexDirection: 'row',
    },
    sidebar: {
        width: '70%',
        backgroundColor: '#1a1a1a',
        height: '100%',
        padding: 20,
        paddingTop: 60,
        borderLeftWidth: 1,
        borderLeftColor: '#333',
    },
    sidebarTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
    },
    sidebarItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    sidebarItemText: {
        color: '#fff',
        fontSize: 16,
        marginLeft: 15,
    },
    sidebarItemTextDestructive: {
        color: '#e74c3c',
        fontSize: 16,
        marginLeft: 15,
        fontWeight: 'bold',
    },
});
