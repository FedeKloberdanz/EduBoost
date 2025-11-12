const { Kafka } = require('kafkajs');
const { Pool } = require('pg');

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';

const kafka = new Kafka({
  clientId: 'eduboost-analytics-consumer',
  brokers: [KAFKA_BROKER],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const consumer = kafka.consumer({ 
  groupId: 'analytics-service',
  sessionTimeout: 30000,
  heartbeatInterval: 3000
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/eduboost'
});

// Analytics metrics
let metrics = {
  tasksCompleted: 0,
  tasksUncompleted: 0,
  achievementsUnlocked: 0,
  levelUps: 0,
  userLogins: 0,
  totalEvents: 0
};

async function trackMetric(event) {
  metrics.totalEvents++;
  
  console.log(`\n📊 [ANALYTICS] Processing event: ${event.eventType}`);
  console.log(`   👤 User: ${event.userId}`);
  console.log(`   ⏰ Time: ${event.timestamp}`);
  
  switch (event.eventType) {
    case 'task_completed':
      metrics.tasksCompleted++;
      console.log(`   ✅ Task completed: "${event.taskTitle}"`);
      console.log(`   💰 Points earned: ${event.points}`);
      
      // Store in analytics table (you could create a separate analytics schema)
      await pool.query(`
        INSERT INTO user_events (user_id, event_type, event_data, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT DO NOTHING
      `, [event.userId, 'analytics_task_completed', JSON.stringify(event)]);
      break;
      
    case 'task_uncompleted':
      metrics.tasksUncompleted++;
      console.log(`   ↩️ Task uncompleted: "${event.taskTitle}"`);
      break;
      
    case 'achievement_unlocked':
      metrics.achievementsUnlocked++;
      console.log(`   🏆 Achievement: "${event.achievementName}"`);
      break;
      
    case 'level_up':
      metrics.levelUps++;
      console.log(`   🚀 Level up: ${event.oldLevel} → ${event.newLevel}`);
      break;
      
    case 'user_login':
      metrics.userLogins++;
      console.log(`   👋 User logged in from: ${event.deviceInfo || 'unknown device'}`);
      break;
  }
  
  console.log(`\n📈 Current Metrics:`);
  console.log(`   Tasks Completed: ${metrics.tasksCompleted}`);
  console.log(`   Tasks Uncompleted: ${metrics.tasksUncompleted}`);
  console.log(`   Achievements: ${metrics.achievementsUnlocked}`);
  console.log(`   Level Ups: ${metrics.levelUps}`);
  console.log(`   User Logins: ${metrics.userLogins}`);
  console.log(`   Total Events: ${metrics.totalEvents}\n`);
}

async function start() {
  try {
    await consumer.connect();
    console.log('✅ Analytics Consumer connected to Kafka');
    
    await consumer.subscribe({ 
      topics: [
        'eduboost.task.completed',
        'eduboost.task.uncompleted',
        'eduboost.achievement.unlocked',
        'eduboost.user.levelup',
        'eduboost.user.login'
      ],
      fromBeginning: false 
    });
    
    console.log('📊 Analytics service listening for events...\n');
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          await trackMetric(event);
        } catch (error) {
          console.error('❌ Error processing message:', error);
        }
      },
    });
  } catch (error) {
    console.error('❌ Error starting consumer:', error);
    setTimeout(start, 5000);
  }
}

// Log metrics every 30 seconds
setInterval(() => {
  console.log('\n=== 📊 Analytics Report ===');
  console.log(`Total Events Processed: ${metrics.totalEvents}`);
  console.log(`Tasks Completed: ${metrics.tasksCompleted}`);
  console.log(`Tasks Uncompleted: ${metrics.tasksUncompleted}`);
  console.log(`Achievements Unlocked: ${metrics.achievementsUnlocked}`);
  console.log(`Level Ups: ${metrics.levelUps}`);
  console.log(`User Logins: ${metrics.userLogins}`);
  console.log('===========================\n');
}, 30000);

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing consumer');
  await consumer.disconnect();
  await pool.end();
  process.exit(0);
});

start();
