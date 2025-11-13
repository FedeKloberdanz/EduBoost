import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native';
import { supabase } from '../api/supabase';

export default function AnalyticsScreen({ route, navigation }) {
  const { user } = route.params;
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      console.log('📊 Fetching analytics for user:', user?.id);

      // Fetch user score data
      const { data: scoreData, error: scoreError } = await supabase
        .from('scores')
        .select('*')
        .eq('user_id', user.id);

      if (scoreError) {
        console.error('Error fetching score:', scoreError);
      } else {
        console.log('📊 Score data:', scoreData);
      }

      // Get first score if it's an array, otherwise use as-is
      const scoreRecord = Array.isArray(scoreData) ? scoreData[0] : scoreData;

      // Fetch completed tasks count
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: false })
        .eq('user_id', user.id)
        .eq('done', true);

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
      } else {
        console.log('📊 Tasks data:', tasksData?.length, 'tasks');
      }

      // Fetch total achievements
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('user_achievements')
        .select('*', { count: 'exact', head: false })
        .eq('user_id', user.id);

      if (achievementsError) {
        console.error('Error fetching achievements:', achievementsError);
      } else {
        console.log('📊 Achievements data:', achievementsData?.length, 'achievements');
      }

      const analyticsData = {
        score: scoreRecord || {},
        completedTasks: tasksData?.length || 0,
        totalAchievements: achievementsData?.length || 0,
      };

      console.log('📊 Final analytics:', analyticsData);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!analytics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Unable to load analytics</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { score, completedTasks, totalAchievements } = analytics;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>📊 Your Analytics</Text>
          <Text style={styles.subtitle}>Track your progress</Text>
        </View>

        <View style={styles.content}>
          {/* Main Stats Card */}
          <View style={styles.mainCard}>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{score.total_points || 0}</Text>
                <Text style={styles.statLabel}>Total Points</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>Level {score.current_level || 1}</Text>
                <Text style={styles.statLabel}>Current Level</Text>
              </View>
          </View>
        </View>

        {/* Tasks Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✅ Task Completion</Text>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.darkValue]}>{completedTasks}</Text>
              <Text style={[styles.statLabel, styles.darkLabel]}>Completed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.darkValue]}>{score.tasks_completed || 0}</Text>
              <Text style={[styles.statLabel, styles.darkLabel]}>Tracked in Score</Text>
            </View>
          </View>
        </View>

        {/* Streak Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔥 Streak & Activity</Text>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.darkValue]}>{score.current_streak || 0} days</Text>
              <Text style={[styles.statLabel, styles.darkLabel]}>Current Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.darkValue]}>{totalAchievements}</Text>
              <Text style={[styles.statLabel, styles.darkLabel]}>Achievements</Text>
            </View>
          </View>
        </View>

        {/* Last Activity */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⏰ Activity</Text>
          <Text style={styles.lastActivity}>
            Last active: {score.last_activity 
              ? new Date(score.last_activity).toLocaleString() 
              : 'Never'}
          </Text>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 These analytics are tracked in real-time by the Analytics Kafka Consumer. 
            Every task completion event is processed and metrics are updated instantly!
          </Text>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    marginBottom: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  content: {
    padding: 15,
  },
  mainCard: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  darkValue: {
    color: '#007AFF',
  },
  darkLabel: {
    color: '#666',
  },
  lastActivity: {
    fontSize: 14,
    color: '#666',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
  },
  infoText: {
    fontSize: 12,
    color: '#1976D2',
    lineHeight: 18,
  },
});
