import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function TaskItem({ task, onToggle }) {
  return (
    <TouchableOpacity
      style={styles.item}
      onPress={() => onToggle(task.id, task.done)}
      activeOpacity={0.7}
    >
      <View style={styles.textContainer}>
        <Text style={[styles.text, task.done && styles.textDone]}>
          {task.title}
        </Text>
        <Text style={styles.date}>
          {new Date(task.created_at).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.status}>{task.done ? "✅" : "🕓"}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    fontSize: 16,
    color: "#333",
  },
  textDone: {
    textDecorationLine: "line-through",
    color: "#999",
  },
  date: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  status: {
    fontSize: 24,
    marginLeft: 10,
  },
});
