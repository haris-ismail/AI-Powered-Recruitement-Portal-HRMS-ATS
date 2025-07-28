# 🚀 Redis Setup Guide for Windows

## **📋 Prerequisites**
- Windows 10/11
- PowerShell (Administrator)
- Internet connection

## **🔧 Installation Methods**

### **Method 1: Using Chocolatey (Recommended)**

1. **Install Chocolatey** (if not already installed):
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
   ```

2. **Install Redis**:
   ```powershell
   choco install redis-64
   ```

### **Method 2: Using Scoop**

1. **Install Scoop** (if not already installed):
   ```powershell
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   irm get.scoop.sh | iex
   ```

2. **Install Redis**:
   ```powershell
   scoop install redis
   ```

### **Method 3: Manual Installation**

1. **Download Redis for Windows**:
   - Visit: https://github.com/microsoftarchive/redis/releases
   - Download: `Redis-x64-xxx.msi`

2. **Install the MSI file**:
   - Run the downloaded MSI file
   - Follow the installation wizard
   - Default installation path: `C:\Program Files\Redis`

## **⚙️ Configuration**

### **Step 1: Start Redis Service**

After installation, start Redis:

```powershell
# Start Redis service
redis-server

# Or if installed as a service
net start Redis
```

### **Step 2: Verify Installation**

```powershell
# Test Redis connection
redis-cli ping

# Expected output: PONG
```

### **Step 3: Configure Redis (Optional)**

Create a Redis configuration file:

```powershell
# Create config directory
mkdir C:\Redis

# Create redis.conf file
@"
# Redis Configuration
port 6379
bind 127.0.0.1
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
"@ | Out-File -FilePath "C:\Redis\redis.conf" -Encoding UTF8
```

## **🔗 Application Integration**

### **Step 1: Update Environment Variables**

Add Redis configuration to your `.env` file:

```env
# Redis Configuration
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### **Step 2: Test Redis Connection**

Run this test script to verify Redis is working:

```javascript
// test-redis-connection.js
import redis from 'redis';

const client = redis.createClient({
  host: '127.0.0.1',
  port: 6379
});

client.on('connect', () => {
  console.log('✅ Redis connected successfully');
  client.quit();
});

client.on('error', (err) => {
  console.log('❌ Redis connection failed:', err.message);
});
```

## **🚀 Production Setup**

### **Step 1: Install Redis as Windows Service**

```powershell
# Install Redis as a Windows service
redis-server --service-install redis.conf

# Start the service
net start Redis

# Set to auto-start
sc config Redis start= auto
```

### **Step 2: Configure Firewall**

```powershell
# Allow Redis through Windows Firewall
netsh advfirewall firewall add rule name="Redis" dir=in action=allow protocol=TCP localport=6379
```

### **Step 3: Performance Tuning**

Add to `redis.conf`:

```conf
# Performance settings
maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

## **🔍 Troubleshooting**

### **Common Issues:**

1. **Port 6379 already in use**:
   ```powershell
   netstat -ano | findstr :6379
   taskkill /F /PID <PID>
   ```

2. **Redis service not starting**:
   ```powershell
   # Check service status
   sc query Redis
   
   # Restart service
   net stop Redis
   net start Redis
   ```

3. **Connection refused**:
   ```powershell
   # Check if Redis is running
   redis-cli ping
   
   # Start Redis manually
   redis-server
   ```

### **Verification Commands:**

```powershell
# Check Redis status
redis-cli ping

# Check Redis info
redis-cli info

# Monitor Redis in real-time
redis-cli monitor

# Check memory usage
redis-cli info memory
```

## **📊 Monitoring & Maintenance**

### **Redis CLI Commands:**

```bash
# Connect to Redis
redis-cli

# Basic commands
SET key value
GET key
DEL key
KEYS *
INFO
```

### **Performance Monitoring:**

```bash
# Memory usage
redis-cli info memory

# Connected clients
redis-cli info clients

# Statistics
redis-cli info stats
```

## **🔒 Security Considerations**

### **Step 1: Set Password (Recommended)**

```bash
# In redis.conf
requirepass your_strong_password

# In your .env
REDIS_PASSWORD=your_strong_password
```

### **Step 2: Bind to Localhost Only**

```bash
# In redis.conf
bind 127.0.0.1
```

### **Step 3: Disable Dangerous Commands**

```bash
# In redis.conf
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""
```

## **✅ Verification Checklist**

- [ ] Redis installed successfully
- [ ] Redis service running (`redis-cli ping` returns `PONG`)
- [ ] Application connects to Redis
- [ ] Token blacklisting works
- [ ] Session management functional
- [ ] Performance monitoring active
- [ ] Security measures implemented

## **🎯 Next Steps**

1. **Test the application** with Redis enabled
2. **Monitor performance** using Redis CLI
3. **Set up monitoring** tools (optional)
4. **Configure backups** (for production)
5. **Document the setup** for team members

---

**📝 Note**: The fallback to in-memory storage will still work if Redis becomes unavailable, ensuring your application remains functional even during Redis maintenance or outages. 