import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function Shop() {
    const { user } = useAuth();
    const [items, setItems] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);

    useEffect(() => {
        fetchData();
    }, [user]);

    const fetchData = async () => {
        try {
            if (!user) return;

            const [itemsRes, profileRes] = await Promise.all([
                supabase.from('shop_items').select('*'),
                supabase.from('profiles').select('*').eq('id', user.id).single()
            ]);

            if (itemsRes.error) throw itemsRes.error;
            if (profileRes.error) throw profileRes.error;

            setItems(itemsRes.data || []);
            setProfile(profileRes.data);
        } catch (error) {
            console.error('Error fetching shop data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (item: any) => {
        if (profile.exp < item.cost_exp) {
            Alert.alert('Insufficient Funds', 'You do not have enough EXP to buy this item.');
            return;
        }

        setPurchasing(true);
        try {
            // 1. Deduct EXP
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ exp: profile.exp - item.cost_exp })
                .eq('id', user?.id);

            if (profileError) throw profileError;

            // 2. Add to Inventory (check if exists first)
            const { data: existingItem } = await supabase
                .from('inventory')
                .select('*')
                .eq('user_id', user?.id)
                .eq('item_id', item.id)
                .single();

            if (existingItem) {
                await supabase
                    .from('inventory')
                    .update({ quantity: existingItem.quantity + 1 })
                    .eq('id', existingItem.id);
            } else {
                await supabase
                    .from('inventory')
                    .insert({
                        user_id: user?.id,
                        item_id: item.id,
                        quantity: 1
                    });
            }

            // 3. If streak freeze, update profile counter too (optional, but good for quick access)
            if (item.type === 'streak_freeze') {
                await supabase
                    .from('profiles')
                    .update({ streak_freeze_count: (profile.streak_freeze_count || 0) + 1 })
                    .eq('id', user?.id);
            }

            Alert.alert('Success', `You purchased ${item.name}!`);
            fetchData(); // Refresh data
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setPurchasing(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.iconContainer}>
                <Ionicons
                    name={item.type === 'streak_freeze' ? 'snow' : 'cube'}
                    size={40}
                    color="#6C63FF"
                />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDesc}>{item.description}</Text>
                <View style={styles.priceContainer}>
                    <Text style={styles.priceText}>{item.cost_exp} EXP</Text>
                </View>
            </View>
            <TouchableOpacity
                style={[styles.buyButton, profile?.exp < item.cost_exp && styles.disabledButton]}
                onPress={() => handlePurchase(item)}
                disabled={profile?.exp < item.cost_exp || purchasing}
            >
                <Text style={styles.buyButtonText}>BUY</Text>
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6C63FF" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>System Shop</Text>
                    <Text style={styles.subtitle}>Exchange your EXP for power.</Text>
                </View>
                <View style={styles.balanceContainer}>
                    <Text style={styles.balanceLabel}>Balance</Text>
                    <Text style={styles.balanceValue}>{profile?.exp || 0} EXP</Text>
                </View>
            </View>

            <FlatList
                data={items}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
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
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingHorizontal: 20,
        marginBottom: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
    },
    subtitle: {
        color: '#888',
        fontSize: 14,
    },
    balanceContainer: {
        alignItems: 'flex-end',
        backgroundColor: 'rgba(108, 99, 255, 0.1)',
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(108, 99, 255, 0.3)',
    },
    balanceLabel: {
        color: '#888',
        fontSize: 12,
    },
    balanceValue: {
        color: '#6C63FF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    listContent: {
        paddingHorizontal: 20,
        gap: 20,
    },
    card: {
        backgroundColor: '#1a1a1a',
        padding: 15,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    iconContainer: {
        width: 60,
        height: 60,
        backgroundColor: 'rgba(108, 99, 255, 0.1)',
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    cardContent: {
        flex: 1,
    },
    itemName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    itemDesc: {
        color: '#888',
        fontSize: 12,
        marginBottom: 8,
    },
    priceContainer: {
        backgroundColor: '#000',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    priceText: {
        color: '#f1c40f',
        fontSize: 12,
        fontWeight: 'bold',
    },
    buyButton: {
        backgroundColor: '#6C63FF',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginLeft: 10,
    },
    disabledButton: {
        backgroundColor: '#333',
    },
    buyButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
