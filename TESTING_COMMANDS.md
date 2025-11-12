# 🧪 Testing Kafka Event Flow - Commands

## Watch All Consumers in Real-Time

Open 3 separate PowerShell terminals and run these commands:

### Terminal 1 - Notification Consumer
```powershell
docker logs -f eduboost_notification_consumer
```

### Terminal 2 - Analytics Consumer  
```powershell
docker logs -f eduboost_analytics_consumer
```

### Terminal 3 - Leaderboard Consumer
```powershell
docker logs -f eduboost_leaderboard_consumer
```

---

## What to Do in Mobile App

1. Login with `test@example.com` / `1234`
2. Tap any task to complete it
3. Watch ALL 3 terminals light up with event processing!

---

## What You Should See

### In Notification Consumer Terminal:
```
🔔 [eduboost.task.completed] Processing event: task_completed
📬 [NOTIFICATION] Sending to user 15f806e1-2c80-4886-9656-f846d4e90606
   📧 Title: 🎉 ¡Tarea Completada!
   💬 Message: Has completado "Task Name" y ganado 10 puntos
   🏷️  Type: success
   ✅ Notification sent successfully!
```

### In Analytics Consumer Terminal:
```
📊 [ANALYTICS] Processing event: task_completed
   👤 User: 15f806e1-2c80-4886-9656-f846d4e90606
   ✅ Task completed: "Task Name"
   💰 Points earned: 10

📈 Current Metrics:
   Tasks Completed: 1
   Total Events: 1
```

### In Leaderboard Consumer Terminal:
```
🏅 [LEADERBOARD] Event received: task_completed
   👤 User 15f806e1-2c80-4886-9656-f846d4e90606 ranking may have changed
   🔄 Updating leaderboard...

🏆 === LEADERBOARD TOP 10 ===
🥇 Usuario Demo - 290 pts (Level 5, 14 tasks)
==============================
```

---

## View Events in Kafka UI

1. Open: http://localhost:8080
2. Click **Topics**
3. Click **eduboost.task.completed**
4. Click **Messages** tab
5. See your event JSON!

---

## Check Event Producer

See all events that were published:
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/stats"
```

---

## Test Uncompleting a Task

1. Tap the task again to unmark it
2. Watch terminals for `task_uncompleted` events
3. See score decrease in leaderboard

---

## 📸 Screenshots to Take

1. All 3 consumer terminals showing the same event
2. Kafka UI showing message
3. Mobile app with completed task
4. Leaderboard output
5. Event Producer stats

**Perfect for your assignment demo!** 🎉
