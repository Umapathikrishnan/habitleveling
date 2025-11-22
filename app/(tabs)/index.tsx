import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todaySession, setTodaySession] = useState<any>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setErrorMsg(null);
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        // If table doesn't exist
        if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
          throw new Error('Database setup required. Please run the schema.sql script in your Supabase Dashboard SQL Editor.');
        }
        // If profile doesn't exist (trigger failed or didn't run)
        if (error.code === 'PGRST116') {
          // Redirect to onboarding if profile missing (should ideally be created by trigger, but fallback here)
          // But wait, if profile is missing, we can't check workout_reason.
          // We should probably create it or just redirect.
          router.replace('/onboarding');
          return;
        }
        throw error;
      }

      if (!data.workout_reason) {
        router.replace('/onboarding');
        return;
      }

      setProfile(data);

      // Fetch today's session
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data: sessionData } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('started_at', startOfDay.toISOString())
        .maybeSingle();

      setTodaySession(sessionData);

    } catch (error: any) {
      console.error('Error fetching profile:', error);
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle" size={50} color="#e74c3c" />
        <Text style={{ color: '#fff', marginTop: 20, textAlign: 'center', paddingHorizontal: 20 }}>{errorMsg}</Text>
        <TouchableOpacity onPress={fetchProfile} style={{ marginTop: 20, padding: 10, backgroundColor: '#6C63FF', borderRadius: 8 }}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getRankColor = (level: number): [string, string] => {
    if (level < 10) return ['#2c3e50', '#000000']; // E-Rank
    if (level < 20) return ['#2980b9', '#2c3e50']; // D-Rank
    if (level < 30) return ['#27ae60', '#2980b9']; // C-Rank
    if (level < 40) return ['#f1c40f', '#d35400']; // B-Rank
    if (level < 50) return ['#e74c3c', '#c0392b']; // A-Rank
    return ['#8e44ad', '#2c3e50']; // S-Rank
  };

  const getRankName = (level: number) => {
    if (level < 10) return 'E-Rank';
    if (level < 20) return 'D-Rank';
    if (level < 30) return 'C-Rank';
    if (level < 40) return 'B-Rank';
    if (level < 50) return 'A-Rank';
    return 'S-Rank';
  };

  const rankColors = getRankColor(profile?.level || 1);

  return (
    <LinearGradient colors={rankColors} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.username}>{profile?.full_name || 'Hunter'}</Text>
          </View>
          <View style={styles.streakContainer}>
            <Ionicons name="flame" size={24} color="#FF4500" />
            <Text style={styles.streakText}>{profile?.streak_current || 0}</Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.levelInfo}>
            <Text style={styles.levelText}>Level {profile?.level || 1}</Text>
            <Text style={styles.rankText}>{getRankName(profile?.level || 1)}</Text>
          </View>

          <View style={styles.expContainer}>
            <Text style={styles.expText}>EXP {profile?.exp || 0} / {profile?.exp_to_next_level || 100}</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${((profile?.exp || 0) / (profile?.exp_to_next_level || 100)) * 100}%` }]} />
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Today's Mission</Text>
        <TouchableOpacity style={styles.missionCard} onPress={() => router.push('/(tabs)/workout')}>
          <View style={styles.missionHeader}>
            <Text style={styles.missionTitle}>Daily Workout</Text>
            <View style={[styles.difficultyBadge, todaySession?.status === 'completed' && { backgroundColor: '#6C63FF' }]}>
              <Text style={styles.difficultyText}>{todaySession?.status === 'completed' ? 'COMPLETED' : 'Normal'}</Text>
            </View>
          </View>
          <Text style={styles.missionDesc}>
            {todaySession?.status === 'completed'
              ? 'Great job! You have completed your daily training.'
              : 'Complete your daily training to earn EXP.'}
          </Text>
          <View style={styles.rewardsContainer}>
            <Text style={styles.rewardText}>Rewards:</Text>
            <Text style={styles.rewardValue}>+50 EXP</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.statsGrid}>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Strength</Text>
            <Text style={styles.gridValue}>10</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Agility</Text>
            <Text style={styles.gridValue}>12</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Vitality</Text>
            <Text style={styles.gridValue}>15</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Sense</Text>
            <Text style={styles.gridValue}>8</Text>
          </View>
        </View>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  greeting: {
    color: '#ccc',
    fontSize: 16,
  },
  username: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 8,
    borderRadius: 20,
    gap: 5,
  },
  streakText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsCard: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
    borderRadius: 16,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  levelInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  levelText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  rankText: {
    color: '#f1c40f',
    fontSize: 24,
    fontWeight: 'bold',
  },
  expContainer: {
    gap: 8,
  },
  expText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'right',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6C63FF',
    borderRadius: 4,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  missionCard: {
    backgroundColor: 'rgba(65, 105, 225, 0.1)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4169E1',
    marginBottom: 30,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  missionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  difficultyBadge: {
    backgroundColor: '#2ecc71',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  difficultyText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  missionDesc: {
    color: '#ccc',
    marginBottom: 15,
  },
  rewardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 10,
  },
  rewardText: {
    color: '#888',
  },
  rewardValue: {
    color: '#f1c40f',
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  gridItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  gridLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 5,
  },
  gridValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
