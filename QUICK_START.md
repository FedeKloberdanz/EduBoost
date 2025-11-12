# 🚀 Quick Start Guide - Kafka Implementation

## Prerequisites
- Docker & Docker Compose installed
- Mobile device with Expo Go
- Computer and phone on same network

---

## 📦 Step 1: Start All Services

```bash
cd C:\Facultad\IngeSoft2
docker-compose up -d --build
```

**Wait 2-3 minutes** for all services to start. This command starts:
- Zookeeper + Kafka
- PostgreSQL + PostgREST
- Event Producer (port 3001)
- 3 Consumer services
- Kafka UI (Port 8090)
- PgAdmin (port 5050)

---

## ✅ Step 2: Verify Services

```bash
docker-compose ps
```

You should see **10 containers** running:
- ✅ eduboost_zookeeper
- ✅ eduboost_kafka
- ✅ eduboost_kafka_ui
- ✅ eduboost_db
- ✅ eduboost_postgrest
- ✅ eduboost_pgadmin
- ✅ eduboost_event_producer
- ✅ eduboost_notification_consumer
- ✅ eduboost_analytics_consumer
- ✅ eduboost_leaderboard_consumer

---

## 🖥️ Step 3: Open Monitoring Tools

### Kafka UI (Essential!)
```
http://localhost:8090
```
- View topics
- See messages in real-time
- Monitor consumer groups

### Event Producer Stats
```
http://localhost:3001/stats
```

### PgAdmin (Database)
```
http://localhost:5050
Login: admin@eduboost.com / admin
```

---

## 📱 Step 4: Start Mobile App

```bash
cd app
npx expo start --tunnel
```

Scan QR with Expo Go app.

---

## 🧪 Step 5: Test Event Flow

### Test 1: Watch Consumers

**Open 3 terminal windows:**

```bash
# Terminal 1
docker logs -f eduboost_notification_consumer

# Terminal 2
docker logs -f eduboost_analytics_consumer

# Terminal 3
docker logs -f eduboost_leaderboard_consumer
```

### Test 2: Trigger Event

**In mobile app:**
1. Login with `test@example.com` / `1234`
2. Complete a task by tapping it
3. Watch ALL terminals light up! 🎉

**You'll see:**
- 📬 Notification Consumer: Sends notification
- 📊 Analytics Consumer: Updates metrics
- 🏅 Leaderboard Consumer: Updates rankings

### Test 3: View in Kafka UI

1. Open http://localhost:8090
2. Click **Topics**
3. Click `eduboost.task.completed`
4. Click **Messages**
5. See your event! 🎊

---

## 🎥 Demo for Your Assignment

### Show this sequence:

1. **Architecture** - Show KAFKA_IMPLEMENTATION.md diagram
2. **Running Services** - `docker-compose ps`
3. **Kafka UI** - Open http://localhost:8090
4. **Open Consumer Logs** - 3 terminals with `docker logs -f`
5. **Mobile App** - Complete a task
6. **Watch Magic Happen**:
   - See message in Kafka UI
   - See all 3 consumers process
   - See leaderboard update
7. **Explain Benefits** - Compare to SQL triggers only

---

## 🐛 Troubleshooting

### Services not starting?

```bash
# Check logs
docker-compose logs kafka
docker-compose logs event-producer

# Restart specific service
docker-compose restart event-producer
```

### Kafka taking long to start?

Kafka needs 30-60 seconds to initialize. Check with:
```bash
docker logs eduboost_kafka
```

Look for: `[KafkaServer id=1] started`

### Consumer not receiving messages?

```bash
# Restart consumer
docker-compose restart notification-consumer

# Check if connected
docker logs eduboost_notification_consumer
```

### Mobile app not connecting?

Check that:
- Computer and phone are on same WiFi
- Docker containers are running
- Look for auto-detected IP in logs: `🌐 Auto-detected host IP: ...`
- Restart Expo if needed: `npm start` in app directory

The app automatically detects your computer's IP using Expo. No manual configuration needed!

---

## 📸 Screenshots for Report

Capture these for your assignment:

1. ✅ `docker-compose ps` - All services running
2. ✅ Kafka UI - Topics list
3. ✅ Kafka UI - Message content
4. ✅ Consumer logs - Processing event
5. ✅ Mobile app - Task completion
6. ✅ Leaderboard output in console
7. ✅ Event Producer stats endpoint

---

## 🎯 Key Points to Mention

1. **Decoupling**: Consumers don't know about producers
2. **Scalability**: Can add more consumers easily
3. **Reliability**: Messages persist in Kafka
4. **Fan-out**: One event → Multiple actions
5. **Real-time**: Sub-second latency
6. **Production-ready**: Same tech as Netflix, Uber

---

## 🛑 Stop Services

```bash
# Stop all
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

---

## 📝 Report Checklist

- [ ] Architecture diagram explained
- [ ] Kafka setup documented
- [ ] Event topics described
- [ ] Each consumer's purpose explained
- [ ] Screenshots of event flow
- [ ] Performance metrics included
- [ ] Comparison: Kafka vs SQL triggers
- [ ] Scalability discussion
- [ ] Real-world use cases mentioned
- [ ] Challenges & solutions documented

---

**Good luck with your presentation! 🚀**
