# 🚀 Setup Guide for Testing EduBoost

## Prerequisites
- Docker and Docker Compose installed
- Node.js and npm installed
- Expo Go app on your phone ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779))
- Computer and phone on the **same WiFi network**

---

## Step 1: Start Backend Services

```bash
# In the project root directory
docker compose up
```

Wait for all 10 services to start. You should see:
- ✅ Kafka broker started
- ✅ PostgreSQL ready
- ✅ Event Producer listening on port 3001
- ✅ 3 consumers connected

---

## Step 2: Install and Start Mobile App

```bash
cd app
npm install  # First time only
npm start
```

This will:
1. Start Expo Dev Server
2. **Automatically detect your computer's IP address**
3. Open a QR code in your terminal
4. Use tunnel mode (accessible from anywhere)

**Important**: The app automatically detects your computer's IP via Expo. No manual configuration needed! ✨

---

## Step 3: Test on Your Phone

1. Open **Expo Go** app on your phone
2. Scan the QR code from the terminal
3. Wait for app to load
4. Login with:
   - Email: `test@example.com`
   - Password: `1234`

---

## Step 4: Test the Features

### Test Task Completion:
1. Tap any uncompleted task
2. Answer the question (hint: 2 + 2 = 4! 😉)
3. Select correct answer
4. Watch your score increase!

### Monitor Kafka Events:
Open 3 terminal windows and run:

```bash
# Terminal 1: Notification Consumer
docker logs -f eduboost_notification_consumer

# Terminal 2: Analytics Consumer
docker logs -f eduboost_analytics_consumer

# Terminal 3: Leaderboard Consumer
docker logs -f eduboost_leaderboard_consumer
```

When you complete a task, all 3 should show activity! 🎉

### Check Kafka UI:
Open browser: http://localhost:8080
- Go to Topics → `eduboost.task.completed`
- See your events!

---

## Troubleshooting

### "Cannot connect to server"
- ✅ Check computer and phone are on same WiFi
- ✅ Make sure Docker containers are running (`docker ps`)
- ✅ Look for auto-detected IP in app logs: `🌐 Auto-detected host IP: ...`

### "Kafka event publish error"
- ✅ Check Event Producer is running: `curl http://localhost:3001/health` (from your computer)
- ✅ Check Docker logs: `docker logs eduboost_event_producer`
- ✅ App will still work, just events won't be published

### "Cannot read package.json"
- ✅ Make sure you're in the `app` directory when running `npm start`

### Expo QR code not working
- ✅ Try pressing `w` in Expo terminal to open in web browser
- ✅ Manually enter the URL in Expo Go app

### IP detection not working
- ✅ Check logs for: `🌐 Auto-detected host IP: ...`
- ✅ Make sure `expo-constants` is installed: `npm list expo-constants`
- ✅ Restart Expo: Stop with Ctrl+C, then `npm start` again

---

## Cleaning Up

```bash
# Stop all containers
docker compose down

# Stop Expo
# Press Ctrl+C in the terminal running npm start
```

---

## Quick Test (Without Mobile App)

Want to test Kafka without the mobile app?

```bash
# Test Event Producer health (from your computer)
curl http://localhost:3001/health

# Manually publish an event
curl -X POST http://localhost:3001/events/task-completed \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "taskId": "test-task-123",
    "taskTitle": "Test Lesson",
    "points": 10
  }'
```

Then check the consumer logs - all 3 should process it!

---

## Ports Used

- **3000**: PostgREST API (database)
- **3001**: Event Producer API (Kafka)
- **5432**: PostgreSQL database
- **5050**: pgAdmin (optional, for DB management)
- **8080**: Kafka UI
- **9092**: Kafka broker (internal)
- **9093**: Kafka broker (external)
- **2181**: Zookeeper

Make sure these ports are available!

---

## Need Help?

Check the other documentation files:
- `QUICK_START.md` - Quick reference
- `KAFKA_IMPLEMENTATION.md` - Technical details
- `TESTING_COMMANDS.md` - All test commands
- `WHITE_PAPER.md` - Full explanation

---

**Happy testing!** 🎓🚀
