import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, RefreshControl } from 'react-native';
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

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        >
            <View style={styles.header}>
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

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Settings</Text>
                <TouchableOpacity style={styles.settingRow} onPress={() => setEditModalVisible(true)}>
                    <Text style={styles.settingText}>Edit Profile</Text>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingRow}>
                    <Text style={styles.settingText}>Notifications</Text>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
            </View>

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
    sectionTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
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
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    settingText: {
        color: '#ccc',
        fontSize: 16,
    },
    signOutButton: {
        marginTop: 20,
        paddingVertical: 15,
        alignItems: 'center',
    },
    signOutText: {
        color: '#e74c3c',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
