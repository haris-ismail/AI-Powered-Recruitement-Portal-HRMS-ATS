import { createClient, RedisClientType } from 'redis';

class RedisService {
  private client: RedisClientType;
  private isConnected: boolean = false;
  private connectionAttempted: boolean = false;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            if (!this.connectionAttempted) {
              console.log('⚠️  Redis not available, using in-memory storage');
              this.connectionAttempted = true;
            }
            return false;
          }
          return Math.min(retries * 500, 2000);
        }
      }
    });

    this.client.on('error', (err) => {
      // Only log the first error to avoid spam
      if (!this.connectionAttempted) {
        console.log('⚠️  Redis connection failed, using in-memory storage');
        this.connectionAttempted = true;
      }
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('✅ Redis connected successfully');
      this.isConnected = true;
      this.connectionAttempted = true;
    });

    this.client.on('disconnect', () => {
      console.log('❌ Redis disconnected');
      this.isConnected = false;
    });
  }

  async connect() {
    if (!this.isConnected && !this.connectionAttempted) {
      try {
        await this.client.connect();
      } catch (error) {
        // Fallback to in-memory storage if Redis is not available
        console.log('⚠️  Falling back to in-memory token storage');
        this.connectionAttempted = true;
      }
    }
  }

  async disconnect() {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  // Token Blacklisting
  async blacklistToken(token: string, expiresIn: number = 86400): Promise<void> {
    try {
      if (this.isConnected) {
        // Store token in Redis with expiration
        await this.client.setEx(`blacklist:${token}`, expiresIn, '1');
      } else {
        // Fallback to in-memory storage
        this.fallbackBlacklist.set(token, Date.now() + (expiresIn * 1000));
      }
    } catch (error) {
      console.error('Error blacklisting token:', error);
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      if (this.isConnected) {
        const result = await this.client.get(`blacklist:${token}`);
        return result === '1';
      } else {
        // Fallback to in-memory storage
        const expiry = this.fallbackBlacklist.get(token);
        if (!expiry) return false;
        
        if (Date.now() > expiry) {
          this.fallbackBlacklist.delete(token);
          return false;
        }
        return true;
      }
    } catch (error) {
      console.error('Error checking token blacklist:', error);
      return false;
    }
  }

  // User Session Management
  async storeUserSession(userId: number, sessionData: any, expiresIn: number = 86400): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.setEx(`session:${userId}`, expiresIn, JSON.stringify(sessionData));
      }
    } catch (error) {
      console.error('Error storing user session:', error);
    }
  }

  async getUserSession(userId: number): Promise<any | null> {
    try {
      if (this.isConnected) {
        const session = await this.client.get(`session:${userId}`);
        return session ? JSON.parse(session) : null;
      }
    } catch (error) {
      console.error('Error getting user session:', error);
    }
    return null;
  }

  async invalidateUserSession(userId: number): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.del(`session:${userId}`);
      }
    } catch (error) {
      console.error('Error invalidating user session:', error);
    }
  }

  // Rate Limiting
  async incrementRateLimit(key: string, windowMs: number = 60000): Promise<number> {
    try {
      if (this.isConnected) {
        const current = await this.client.incr(`ratelimit:${key}`);
        if (current === 1) {
          await this.client.expire(`ratelimit:${key}`, Math.floor(windowMs / 1000));
        }
        return current;
      }
    } catch (error) {
      console.error('Error incrementing rate limit:', error);
    }
    return 0;
  }

  // Cleanup expired tokens (run periodically)
  async cleanupExpiredTokens(): Promise<void> {
    try {
      if (this.isConnected) {
        // Redis automatically handles expiration
        console.log('Redis cleanup: Expired tokens automatically removed');
      } else {
        // Cleanup in-memory storage
        const now = Date.now();
        for (const [token, expiry] of this.fallbackBlacklist.entries()) {
          if (now > expiry) {
            this.fallbackBlacklist.delete(token);
          }
        }
        console.log('In-memory cleanup: Expired tokens removed');
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  // Fallback in-memory storage
  private fallbackBlacklist = new Map<string, number>();

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      if (this.isConnected) {
        await this.client.ping();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }
}

// Create singleton instance
export const redisService = new RedisService();

// Initialize connection
redisService.connect();

// Cleanup expired tokens every hour
setInterval(() => {
  redisService.cleanupExpiredTokens();
}, 60 * 60 * 1000);

export default redisService; 