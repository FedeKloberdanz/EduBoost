# EduBoost - Kafka Event-Driven Architecture

## 📋 Overview

This implementation extends the EduBoost POC with **Apache Kafka** for event-driven communication between microservices. It demonstrates a real-world architecture where events flow through a message broker to multiple independent consumers.

---

## 🏗️ Architecture

```
┌─────────────────┐
│   Mobile App    │
│  (React Native) │
└────────┬────────┘
         │
         │ HTTP API calls
         │
┌────────▼────────┐         ┌──────────────────────────┐
│   PostgreSQL    │         │     Event Producer       │
│  (SQL Triggers) │────────>│   (publishes to Kafka)   │
└─────────────────┘  HTTP   └────────────┬─────────────┘
                                          │
                                          │ Kafka Messages
                                          │
                    ┌─────────────────────▼──────────────────────┐
                    │           Apache Kafka                      │
                    │  Topics:                                    │
                    │  - eduboost.task.completed                  │
                    │  - eduboost.task.uncompleted                │
                    │  - eduboost.achievement.unlocked            │
                    │  - eduboost.user.levelup                    │
                    │  - eduboost.user.login                      │
                    └────┬──────────┬────────────┬─────────────┘
                         │          │            │
                         │          │            │
           ┌─────────────▼─┐  ┌────▼──────┐  ┌──▼────────────┐
           │  Notification │  │ Analytics │  │  Leaderboard  │
           │   Consumer    │  │ Consumer  │  │   Consumer    │
           └───────────────┘  └───────────┘  └───────────────┘
           Push/Email/SMS     Metrics/Stats   Rankings/Top10
```

---

## 🚀 Services

### 1. **Event Producer** (Port 3001)
- Receives events from PostgreSQL triggers
- Publishes events to Kafka topics
- REST API for manual event publishing

**Endpoints:**
```bash
POST http://localhost:3001/events/task-completed
POST http://localhost:3001/events/task-uncompleted
POST http://localhost:3001/events/achievement-unlocked
POST http://localhost:3001/events/level-up
POST http://localhost:3001/events/user-login
GET  http://localhost:3001/stats
GET  http://localhost:3001/health
```

### 2. **Notification Consumer**
- Listens to all event topics
- Simulates sending notifications (email, push, SMS)
- Logs notification details to console

**Processes:**
- ✅ Task completed → Success notification
- ↩️ Task uncompleted → Info notification
- 🏆 Achievement unlocked → Achievement notification
- 🚀 Level up → Celebration notification
- 👋 User login → Welcome back notification

### 3. **Analytics Consumer**
- Tracks metrics and user behavior
- Stores analytics data in database
- Generates periodic reports

**Metrics:**
- Total events processed
- Tasks completed/uncompleted count
- Achievements unlocked count
- Level ups count
- User logins count

### 4. **Leaderboard Consumer**
- Maintains real-time user rankings
- Updates on task completion/uncomplete and level ups
- Displays top 10 users

**Features:**
- Real-time ranking updates
- Periodic leaderboard refresh
- Console display with medals 🥇🥈🥉

### 5. **Kafka UI** (Port 8090)
- Web interface to monitor Kafka
- View topics, messages, consumer groups
- Access: http://localhost:8090

---

## 🔧 Installation & Setup

### 1. Start all services:

```bash
cd C:\Facultad\IngeSoft2
docker-compose up -d --build
```

This will start:
- ✅ Zookeeper (required by Kafka)
- ✅ Kafka broker
- ✅ Kafka UI (monitoring)
- ✅ PostgreSQL database
- ✅ PostgREST API
- ✅ PgAdmin
- ✅ Event Producer service
- ✅ Notification Consumer
- ✅ Analytics Consumer
- ✅ Leaderboard Consumer

### 2. Verify services are running:

```bash
docker-compose ps
```

You should see 10 containers running.

### 3. Access Kafka UI:

Open http://localhost:8090 to see:
- Topics and their messages
- Consumer groups and lag
- Broker configuration

---

## 🧪 Testing the Event Flow

### Test 1: Complete a Task (End-to-End)

1. **Open Kafka UI**: http://localhost:8090
2. **Navigate to Topics** → Click on `eduboost.task.completed`
3. **In another terminal**, watch consumer logs:
   ```bash
   docker logs -f eduboost_notification_consumer
   docker logs -f eduboost_analytics_consumer
   docker logs -f eduboost_leaderboard_consumer
   ```
4. **Complete a task in the mobile app**
5. **Observe**:
   - Message appears in Kafka UI
   - Notification consumer logs the notification
   - Analytics consumer updates metrics
   - Leaderboard consumer updates rankings

### Test 2: Manual Event Publishing

```bash
curl -X POST http://localhost:3001/events/task-completed \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "15f806e1-2c80-4886-9656-f846d4e90606",
    "taskId": "task-123",
    "taskTitle": "Test Manual Event",
    "points": 10
  }'
```

Watch the consumer logs to see all services processing the event!

### Test 3: View Analytics Stats

```bash
curl http://localhost:3001/stats
```

---

## 📊 Kafka Topics

| Topic | Description | Consumers |
|-------|-------------|-----------|
| `eduboost.task.completed` | User completes a task | Notification, Analytics, Leaderboard |
| `eduboost.task.uncompleted` | User uncompletes a task | Notification, Analytics, Leaderboard |
| `eduboost.achievement.unlocked` | User unlocks achievement | Notification, Analytics |
| `eduboost.user.levelup` | User levels up | Notification, Analytics, Leaderboard |
| `eduboost.user.login` | User logs in | Notification, Analytics |

---

## 🎯 Event-Driven Patterns Demonstrated

### 1. **Pub/Sub Pattern**
- One producer publishes events
- Multiple consumers subscribe independently
- Consumers don't know about each other

### 2. **Fan-Out Pattern**
- Single event triggers multiple actions
- Each consumer processes the same event differently

### 3. **Consumer Groups**
- Each service has its own consumer group
- Enables horizontal scaling
- Independent offset tracking

### 4. **Event Sourcing**
- All events stored in Kafka
- Event replay capability
- Audit trail of user actions

### 5. **Decoupling**
- Services communicate via events, not direct calls
- Add/remove consumers without changing producers
- Services can be developed in different languages

---

## 📈 Monitoring & Debugging

### View Kafka UI
```
http://localhost:8090
```

### Check Event Producer logs
```bash
docker logs -f eduboost_event_producer
```

### Check Consumer logs
```bash
# Notifications
docker logs -f eduboost_notification_consumer

# Analytics
docker logs -f eduboost_analytics_consumer

# Leaderboard
docker logs -f eduboost_leaderboard_consumer
```

### Check Kafka broker logs
```bash
docker logs -f eduboost_kafka
```

### View database events
```bash
docker exec -it eduboost_db psql -U postgres -d eduboost

SELECT * FROM user_events ORDER BY created_at DESC LIMIT 10;
```

---

## 🔬 Non-Trivial Aspects

### 1. **Reliability**
- Kafka persists messages (even if consumers are down)
- Consumers resume from last offset
- At-least-once delivery guarantee

### 2. **Scalability**
- Add more consumer instances to same group for parallel processing
- Topics partitioned for distributed consumption
- Independent service scaling

### 3. **Fault Tolerance**
- If a consumer crashes, Kafka retains messages
- Other consumers unaffected
- Automatic reconnection and retry logic

### 4. **Real-time Processing**
- Events processed as they occur
- Sub-second latency
- Live leaderboard updates

### 5. **Operational Complexity**
- Multi-service orchestration
- Distributed logging
- Message ordering considerations
- Consumer lag monitoring

---

## 🚦 Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

---

## 📝 Assignment Deliverables

### What to Include in Your Report:

1. **Architecture Diagram** (provided above)
2. **Kafka vs SQL Triggers Comparison**
3. **Event Flow Documentation**
4. **Consumer Implementation Details**
5. **Testing Screenshots**:
   - Kafka UI showing messages
   - Consumer logs processing events
   - Leaderboard updates
6. **Performance Metrics**:
   - Message throughput
   - Consumer lag
   - End-to-end latency
7. **Challenges & Solutions**
8. **Scalability Discussion**

### Demo Script:

1. Show architecture diagram
2. Start all services
3. Open Kafka UI
4. Complete a task in mobile app
5. Show message in Kafka
6. Show all 3 consumers processing
7. Show leaderboard update
8. Explain benefits vs direct DB triggers

---

## 🎓 Key Takeaways

✅ **Decoupling**: Services don't depend on each other  
✅ **Scalability**: Easy to add consumers and scale independently  
✅ **Reliability**: Messages persist even if consumers fail  
✅ **Flexibility**: Add new event types without changing existing code  
✅ **Real-world**: Used by Netflix, Uber, LinkedIn  
✅ **Event Sourcing**: Complete audit trail of user actions  
✅ **Asynchronous**: Non-blocking, high-performance processing  

---

## 🔗 Resources

- Kafka Documentation: https://kafka.apache.org/documentation/
- KafkaJS Library: https://kafka.js.org/
- Event-Driven Architecture: https://martinfowler.com/articles/201701-event-driven.html
