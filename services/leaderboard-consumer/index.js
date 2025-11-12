const { Kafka } = require('kafkajs');
const { Pool } = require('pg');

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';

const kafka = new Kafka({
  clientId: 'eduboost-leaderboard-consumer',
  brokers: [KAFKA_BROKER],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const consumer = kafka.consumer({ 
  groupId: 'leaderboard-service',
  sessionTimeout: 30000,
  heartbeatInterval: 3000
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/eduboost'
});

// In-memory leaderboard cache
let leaderboard = [];

async function updateLeaderboard() {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        s.total_points,
        s.current_level,
        s.tasks_completed,
        s.current_streak
      FROM users u
      JOIN scores s ON u.id = s.user_id
      ORDER BY s.total_points DESC, s.tasks_completed DESC
      LIMIT 10
    `);
    
    leaderboard = result.rows;
    
    console.log('\n🏆 === LEADERBOARD TOP 10 ===');
    leaderboard.forEach((user, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      console.log(`${medal} ${user.username || user.email} - ${user.total_points} pts (Level ${user.current_level}, ${user.tasks_completed} tasks)`);
    });
    console.log('==============================\n');
    
  } catch (error) {
    console.error('❌ Error updating leaderboard:', error);
  }
}

async function processEvent(event) {
  console.log(`\n🏅 [LEADERBOARD] Event received: ${event.eventType}`);
  
  // Events that affect leaderboard
  if (['task_completed', 'task_uncompleted', 'level_up'].includes(event.eventType)) {
    console.log(`   👤 User ${event.userId} ranking may have changed`);
    console.log(`   🔄 Updating leaderboard...`);
    await updateLeaderboard();
  }
}

async function start() {
  try {
    await consumer.connect();
    console.log('✅ Leaderboard Consumer connected to Kafka');
    
    // Initial leaderboard load
    await updateLeaderboard();
    
    await consumer.subscribe({ 
      topics: [
        'eduboost.task.completed',
        'eduboost.task.uncompleted',
        'eduboost.user.levelup'
      ],
      fromBeginning: false 
    });
    
    console.log('🏅 Leaderboard service listening for ranking changes...\n');
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          await processEvent(event);
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

// Refresh leaderboard every 60 seconds
setInterval(async () => {
  console.log('🔄 Periodic leaderboard refresh...');
  await updateLeaderboard();
}, 60000);

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing consumer');
  await consumer.disconnect();
  await pool.end();
  process.exit(0);
});

start();
