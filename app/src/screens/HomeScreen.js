import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  Button,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { supabase } from "../api/supabase";
import { API_CONFIG } from "../../config";
import TaskItem from "../components/TaskItem";
import ScoreCard from "../components/ScoreCard";
import NotificationList from "../components/NotificationList";

export default function HomeScreen({ route, navigation }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [score, setScore] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Store user in state so it persists across navigation
  const [user, setUser] = useState(route.params?.user);
  
  // Update user if route params change
  React.useEffect(() => {
    if (route.params?.user) {
      setUser(route.params.user);
    }
  }, [route.params?.user]);

  const fetchTasks = async () => {
    try {
      setError(null);
      
      // Use Supabase client
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setTasks(data || []);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError("No se pudieron cargar las tareas. Verifica la conexión.");
      Alert.alert("Error", "No se pudieron cargar las tareas");
    }
  };

  const fetchScore = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('scores')
        .select('*')
        .eq('user_id', user.id);

      if (!error && data && data.length > 0) {
        setScore(data[0]);
      }
    } catch (err) {
      console.error("Error fetching score:", err);
    }
  };

  const fetchNotifications = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setNotifications(data);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!user?.id) return;

    // Subscribe to notifications
    const notificationSubscription = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("New notification:", payload.new);
          setNotifications((prev) => [payload.new, ...prev]);
          Alert.alert(payload.new.title, payload.new.message);
        }
      )
      .subscribe();

    // Subscribe to score updates
    const scoreSubscription = supabase
      .channel("scores")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "scores",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Score updated:", payload.new);
          setScore(payload.new);
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      notificationSubscription.unsubscribe();
      scoreSubscription.unsubscribe();
    };
  };

  const toggleTaskCompletion = async (taskId, currentStatus) => {
    // Find the task
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) return;

    // If task is not completed, navigate to lesson screen
    if (!currentStatus) {
      navigation.navigate('Lesson', { task, user });
      return;
    }

    // If task is already completed, allow uncompleting it
    try {
      // Check if user exists
      if (!user || !user.id) {
        console.error('❌ Cannot uncomplete task: user is undefined');
        Alert.alert("Error", "No se pudo identificar el usuario");
        return;
      }
      
      // Use Supabase client to update task
      const { error } = await supabase
        .from('tasks')
        .update({ done: false })
        .eq('id', taskId);

      if (error) {
        throw error;
      }

      // Update local state
      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === taskId ? { ...t, done: false } : t
        )
      );

      // Publish uncompleted event to Kafka
      try {
        const eventUrl = `${API_CONFIG.EVENT_PRODUCER_URL}/events/task-uncompleted`;
        
        const eventData = {
          userId: user.id,
          taskId: taskId,
          taskTitle: task.title,
          points: 10
        };
        
        console.log(`📤 Publishing task-uncompleted event to Kafka:`, eventData);
        
        const response = await fetch(eventUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData)
        });
        
        if (response.ok) {
          console.log('✅ Event published to Kafka successfully');
        } else {
          console.warn('⚠️ Failed to publish event to Kafka:', response.status);
        }
      } catch (kafkaError) {
        console.warn('⚠️ Kafka event publish error (non-critical):', kafkaError.message);
      }

      // Refresh score and notifications
      setTimeout(() => {
        fetchScore();
        fetchNotifications();
      }, 500);
    } catch (err) {
      console.error("Error updating task:", err);
      Alert.alert("Error", "No se pudo actualizar la tarea");
    }
  };

  const completeTask = async (taskId) => {
    try {
      // Find the task
      const task = tasks.find(t => t.id === taskId);
      
      // Check if user exists
      if (!user || !user.id) {
        console.error('❌ Cannot complete task: user is undefined');
        Alert.alert("Error", "No se pudo identificar el usuario");
        return;
      }
      
      // Use Supabase client to update task
      const { error } = await supabase
        .from('tasks')
        .update({ done: true })
        .eq('id', taskId);

      if (error) {
        throw error;
      }

      // Update local state
      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === taskId ? { ...t, done: true } : t
        )
      );

      // Publish event to Kafka via Event Producer
      try {
        const eventUrl = `${API_CONFIG.EVENT_PRODUCER_URL}/events/task-completed`;
        
        const eventData = {
          userId: user.id,
          taskId: taskId,
          taskTitle: task?.title || 'Unknown Task',
          points: 10
        };
        
        console.log(`📤 Publishing task-completed event to Kafka:`, eventData);
        
        const response = await fetch(eventUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData)
        });
        
        if (response.ok) {
          console.log('✅ Event published to Kafka successfully');
        } else {
          console.warn('⚠️ Failed to publish event to Kafka:', response.status);
        }
      } catch (kafkaError) {
        console.warn('⚠️ Kafka event publish error (non-critical):', kafkaError.message);
      }

      // Refresh score and notifications after task completion
      setTimeout(() => {
        fetchScore();
        fetchNotifications();
      }, 500);
    } catch (err) {
      console.error("Error completing task:", err);
      Alert.alert("Error", "No se pudo completar la tarea");
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        throw error;
      }

      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchTasks(), fetchScore(), fetchNotifications()]).finally(
      () => setRefreshing(false)
    );
  };

  // Handle lesson completion
  useEffect(() => {
    if (route.params?.lessonCompleted && route.params?.taskId) {
      const taskId = route.params.taskId;
      console.log('🎓 Lesson completed for task:', taskId);
      
      // Complete the task
      completeTask(taskId);
      
      // Clear the params to prevent re-triggering
      navigation.setParams({ lessonCompleted: undefined, taskId: undefined });
    }
  }, [route.params?.lessonCompleted, route.params?.taskId]);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchTasks(), fetchScore(), fetchNotifications()]);
      setLoading(false);
    };

    loadData();

    // Setup realtime subscriptions
    const cleanup = setupRealtimeSubscriptions();

    return cleanup;
  }, [user?.id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Cargando tareas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          EduBoost {user?.username && `- ${user.username}`}
        </Text>
        <Button
          title={`🔔 ${unreadCount > 0 ? `(${unreadCount})` : ""}`}
          onPress={() => navigation.navigate('Notifications', { user })}
        />
      </View>

      {showNotifications ? (
        <View style={styles.notificationsContainer}>
          <Text style={styles.sectionTitle}>Notificaciones</Text>
          <NotificationList
            notifications={notifications}
            onMarkAsRead={markNotificationAsRead}
          />
          <Button
            title="Volver a Tareas"
            onPress={() => setShowNotifications(false)}
          />
        </View>
      ) : (
        <>
          <ScoreCard score={score} />

          {/* Navigation to new screens */}
          <View style={styles.quickActions}>
            <Button
              title="🏆 Leaderboard"
              onPress={() => navigation.navigate('Leaderboard')}
              color="#FF9500"
            />
            <View style={styles.buttonSpacer} />
            <Button
              title="📊 Analytics"
              onPress={() => navigation.navigate('Analytics', { user })}
              color="#34C759"
            />
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Mis Tareas</Text>

          {tasks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay tareas disponibles</Text>
            </View>
          ) : (
            <FlatList
              data={tasks}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TaskItem task={item} onToggle={toggleTaskCompletion} />
              )}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              contentContainerStyle={styles.listContent}
            />
          )}

          <Button title="Actualizar" onPress={onRefresh} />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f5f5f5" },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  loadingText: { marginTop: 10, color: "#666", fontSize: 16 },
  errorContainer: {
    backgroundColor: "#ffebee",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  errorText: { color: "#c62828", fontSize: 14 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: { color: "#999", fontSize: 16 },
  notificationsContainer: {
    flex: 1,
  },
  quickActions: {
    flexDirection: "row",
    marginVertical: 10,
  },
  buttonSpacer: {
    width: 10,
  },
  listContent: {
    paddingBottom: 20,
  },
});
