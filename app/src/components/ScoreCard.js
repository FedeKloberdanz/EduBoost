import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function ScoreCard({ score }) {
  if (!score) return null;

  return (
    <View style={styles.container}>
      <View style={styles.statBox}>
        <Text style={styles.statValue}>{score.total_points || 0}</Text>
        <Text style={styles.statLabel}>Points</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statValue}>Level {score.current_level || 1}</Text>
        <Text style={styles.statLabel}>Level</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statValue}>{score.tasks_completed || 0}</Text>
        <Text style={styles.statLabel}>Tasks</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statValue}>{score.current_streak || 0}🔥</Text>
        <Text style={styles.statLabel}>Streak</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#007AFF",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
});
