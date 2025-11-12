const express = require('express');
const { Kafka } = require('kafkajs');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';

// Kafka setup
const kafka = new Kafka({
  clientId: 'eduboost-event-producer',
  brokers: [KAFKA_BROKER],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const producer = kafka.producer();

// PostgreSQL setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/eduboost'
});

// Kafka Topics
const TOPICS = {
  TASK_COMPLETED: 'eduboost.task.completed',
  TASK_UNCOMPLETED: 'eduboost.task.uncompleted',
  ACHIEVEMENT_UNLOCKED: 'eduboost.achievement.unlocked',
  LEVEL_UP: 'eduboost.user.levelup',
  USER_LOGIN: 'eduboost.user.login'
};

// Initialize Kafka producer
async function initKafka() {
  try {
    await producer.connect();
    console.log('✅ Kafka Producer connected');
    
    // Create topics if they don't exist
    const admin = kafka.admin();
    await admin.connect();
    
    const topics = Object.values(TOPICS).map(topic => ({
      topic,
      numPartitions: 3,
      replicationFactor: 1
    }));
    
    await admin.createTopics({ topics });
    console.log('✅ Kafka topics created/verified');
    await admin.disconnect();
  } catch (error) {
    console.error('❌ Kafka connection error:', error);
    setTimeout(initKafka, 5000); // Retry after 5 seconds
  }
}

// Publish event to Kafka
async function publishEvent(topic, key, value) {
  try {
    await producer.send({
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(value),
          timestamp: Date.now().toString()
        }
      ]
    });
    console.log(`📤 Published to ${topic}:`, value);
    return { success: true };
  } catch (error) {
    console.error('❌ Error publishing event:', error);
    return { success: false, error: error.message };
  }
}

// API Endpoints

// Publish task completed event
app.post('/events/task-completed', async (req, res) => {
  const { userId, taskId, taskTitle, points } = req.body;
  
  const event = {
    eventType: 'task_completed',
    userId,
    taskId,
    taskTitle,
    points,
    timestamp: new Date().toISOString()
  };
  
  const result = await publishEvent(TOPICS.TASK_COMPLETED, userId, event);
  res.json(result);
});

// Publish task uncompleted event
app.post('/events/task-uncompleted', async (req, res) => {
  const { userId, taskId, taskTitle, points } = req.body;
  
  const event = {
    eventType: 'task_uncompleted',
    userId,
    taskId,
    taskTitle,
    points,
    timestamp: new Date().toISOString()
  };
  
  const result = await publishEvent(TOPICS.TASK_UNCOMPLETED, userId, event);
  res.json(result);
});

// Publish achievement unlocked event
app.post('/events/achievement-unlocked', async (req, res) => {
  const { userId, achievementId, achievementName, points } = req.body;
  
  const event = {
    eventType: 'achievement_unlocked',
    userId,
    achievementId,
    achievementName,
    points,
    timestamp: new Date().toISOString()
  };
  
  const result = await publishEvent(TOPICS.ACHIEVEMENT_UNLOCKED, userId, event);
  res.json(result);
});

// Publish level up event
app.post('/events/level-up', async (req, res) => {
  const { userId, oldLevel, newLevel, totalPoints } = req.body;
  
  const event = {
    eventType: 'level_up',
    userId,
    oldLevel,
    newLevel,
    totalPoints,
    timestamp: new Date().toISOString()
  };
  
  const result = await publishEvent(TOPICS.LEVEL_UP, userId, event);
  res.json(result);
});

// Publish user login event
app.post('/events/user-login', async (req, res) => {
  const { userId, email, deviceInfo } = req.body;
  
  const event = {
    eventType: 'user_login',
    userId,
    email,
    deviceInfo,
    timestamp: new Date().toISOString()
  };
  
  const result = await publishEvent(TOPICS.USER_LOGIN, userId, event);
  res.json(result);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'event-producer',
    kafka: 'connected' 
  });
});

// Get event stats
app.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        event_type,
        COUNT(*) as count,
        MAX(created_at) as last_event
      FROM user_events
      GROUP BY event_type
      ORDER BY count DESC
    `);
    
    res.json({ events: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
async function start() {
  await initKafka();
  
  app.listen(PORT, () => {
    console.log(`🚀 Event Producer Service running on port ${PORT}`);
    console.log(`📊 Stats: http://localhost:${PORT}/stats`);
    console.log(`💚 Health: http://localhost:${PORT}/health`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await producer.disconnect();
  await pool.end();
  process.exit(0);
});

start();
