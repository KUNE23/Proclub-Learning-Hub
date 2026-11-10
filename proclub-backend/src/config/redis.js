import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 5) {
        console.warn('Redis unavailable, disabling further reconnects (caching disabled)');
        return false;
      }

      return Math.min(retries * 500, 3000);
    },
  },
});

redisClient.on('connect', () => {
  console.log('✅ Redis Connected');
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Redis Reconnecting...');
});

redisClient.on('error', (error) => {
  console.error('❌ Redis Error:', error.message);
});

export default redisClient;
