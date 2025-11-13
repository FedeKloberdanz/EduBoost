const { Kafka } = require('kafkajs');

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';

const kafka = new Kafka({
  clientId: 'eduboost-notification-consumer',
  brokers: [KAFKA_BROKER],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const consumer = kafka.consumer({ 
  groupId: 'notification-service',
  sessionTimeout: 30000,
  heartbeatInterval: 3000
});

// Simulate sending notifications
async function sendNotification(userId, title, message, type = 'info') {
  console.log(`📬 [NOTIFICATION] Sending to user ${userId}`);
  console.log(`   📧 Title: ${title}`);
  console.log(`   💬 Message: ${message}`);
  console.log(`   🏷️  Type: ${type}`);
  console.log(`   ⏰ Time: ${new Date().toISOString()}`);
  console.log('   ✅ Notification sent successfully!\n');
  
  // In a real system, this would:
  // - Send push notification via Firebase/OneSignal
  // - Send email via SendGrid/Mailgun
  // - Send SMS via Twilio
  // - Update notification table in database
}

async function processEvent(topic, event) {
  console.log(`\n🔔 [${topic}] Processing event:`, event.eventType);
  
  switch (event.eventType) {
    case 'task_completed':
      await sendNotification(
        event.userId,
        '🎉 Task Completed!',
        `You completed "${event.taskTitle}" and earned ${event.points} points`,
        'success'
      );
      break;
      
    case 'task_uncompleted':
      await sendNotification(
        event.userId,
        '↩️ Task Unchecked',
        `You unchecked "${event.taskTitle}" and lost ${event.points} points`,
        'info'
      );
      break;
      
    case 'achievement_unlocked':
      await sendNotification(
        event.userId,
        '🏆 Achievement Unlocked!',
        `You unlocked: ${event.achievementName} (+${event.points} points)`,
        'achievement'
      );
      break;
      
    case 'level_up':
      await sendNotification(
        event.userId,
        '🚀 Level Up!',
        `Congratulations! You are now level ${event.newLevel}`,
        'celebration'
      );
      break;
      
    case 'user_login':
      await sendNotification(
        event.userId,
        '👋 Welcome back',
        `Last access: ${event.timestamp}`,
        'info'
      );
      break;
      
    default:
      console.log(`⚠️  Unknown event type: ${event.eventType}`);
  }
}

async function start() {
  try {
    await consumer.connect();
    console.log('✅ Notification Consumer connected to Kafka');
    
    // Subscribe to all event topics
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
    
    console.log('📨 Subscribed to event topics');
    console.log('🎧 Listening for events...\n');
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          await processEvent(topic, event);
        } catch (error) {
          console.error('❌ Error processing message:', error);
        }
      },
    });
  } catch (error) {
    console.error('❌ Error starting consumer:', error);
    setTimeout(start, 5000); // Retry after 5 seconds
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing consumer');
  await consumer.disconnect();
  process.exit(0);
});

start();
