# Deploy PrivStack to Your Homelab

The complete PrivStack application is ready. Follow these steps to deploy it to your Debian server.

## Prerequisites
- Debian Linux server (Ubuntu 22.04+ works too)
- Docker & Docker Compose installed
- SSH access to the server
- Services running (Sonarr, Radarr, etc.) already accessible on the network

## Option 1: Automated Deployment (Recommended)

### From Your Local Machine:

```bash
# 1. Copy the entire privstack folder to your server
rsync -avz /tmp/privstack/ user@192.168.0.131:/opt/docker/privstack/

# Or if rsync isn't available, use SCP:
# scp -r /tmp/privstack/* user@192.168.0.131:/opt/docker/privstack/

# 2. SSH into your server
ssh user@192.168.0.131

# 3. Run the quick start script
cd /opt/docker/privstack
bash QUICK_START.sh
```

The script will:
- ✅ Generate a secure NEXTAUTH_SECRET
- ✅ Create the .env file with your secret
- ✅ Build the Docker image
- ✅ Start the container
- ✅ Verify health status
- ✅ Provide access URL

### Result:
```
✅ PrivStack is running!

🌐 Dashboard: http://192.168.0.131:8082

📋 Setup Instructions:
   1. Open http://192.168.0.131:8082 in your browser
   2. Complete the setup wizard (admin account, apps, services)
   3. Configure service URLs and API keys in Settings
```

## Option 2: Manual Deployment

### Step 1: Create Directory and Copy Files

```bash
# On your server
sudo mkdir -p /opt/docker/privstack
sudo chown $USER:$USER /opt/docker/privstack

# On your local machine
rsync -avz /tmp/privstack/ user@192.168.0.131:/opt/docker/privstack/
```

### Step 2: Configure Environment

```bash
# On server
cd /opt/docker/privstack
cp .env.example .env

# Generate secret
openssl rand -base64 32
# Copy the output and paste it into .env

nano .env  # Edit and update:
# NEXTAUTH_SECRET=<paste_your_generated_secret>
# NEXTAUTH_URL=http://192.168.0.131:8082
# Verify service URLs match your setup
```

### Step 3: Deploy with Docker Compose

```bash
# From /opt/docker/privstack directory
docker compose up -d --build

# Check status
docker compose ps

# View logs (if there are issues)
docker compose logs -f privstack
```

### Step 4: Access Dashboard

Open in browser: **http://192.168.0.131:8082**

Complete the setup wizard.

## Post-Deployment Configuration

### 1. Create Admin Account (via Setup Wizard)
- Choose a strong password
- This account has full access to settings

### 2. Configure Services (Settings → Services Tab)

Add your service URLs and API keys:

#### Sonarr
- URL: `http://192.168.0.131:8989` (adjust IP/port as needed)
- API Key: Get from Sonarr settings → General → Security

#### Radarr
- URL: `http://192.168.0.131:7878`
- API Key: Get from Radarr settings → General → Security

#### qBittorrent
- URL: `http://192.168.0.131:8080`
- Username/Password: Usually configured in qBittorrent Web UI

#### Jellyfin
- URL: `http://192.168.0.131:8096`
- API Key: Get from Jellyfin dashboard → API Keys

#### Plex
- URL: `http://192.168.0.131:32400`
- Token: Get from Plex settings or use X-Plex-Token header

#### Uptime Kuma
- URL: `http://192.168.0.131:3001`

#### Weather (Optional)
- OpenWeatherMap API Key: Free from https://openweathermap.org

### 3. Build Your Dashboard
- Click **✎ Edit** button to enter edit mode
- Click **+ Add Widget** to add widgets
- Drag and drop to customize layout
- Click **Done Editing** when satisfied

## Verification

### Check Container Health
```bash
docker compose ps
# Should show: privstack ... healthy

# Or detailed check
docker compose exec privstack curl http://localhost:3000
```

### View Logs
```bash
docker compose logs privstack

# Follow logs in real-time
docker compose logs -f privstack
```

### Test Service Connections
- In Settings → Services tab, each service shows current connection status
- API keys and URLs are validated immediately when you save

## Troubleshooting

### "Connection refused" on 8082
```bash
# Container might not be running
docker compose ps

# Start it
docker compose up -d

# Check for errors
docker compose logs privstack
```

### "Cannot connect to Sonarr/Radarr"
```bash
# Verify service is running on the network
curl -I http://192.168.0.131:8989

# Update the URL in Settings if needed
# Make sure firewall allows access

# Check from container
docker compose exec privstack curl -I http://192.168.0.131:8989
```

### Database errors
```bash
# Reset database (will lose all config)
rm data/privstack.db
docker compose restart

# Or backup first
cp data/privstack.db data/privstack.db.backup
rm data/privstack.db
docker compose restart
```

## Maintenance

### Update Container

```bash
cd /opt/docker/privstack

# Pull latest code (if using git)
git pull

# Rebuild and restart
docker compose up -d --build

# Check logs
docker compose logs -f privstack
```

### Backup Database

```bash
# Create backup
docker compose cp privstack:/data/privstack.db ./privstack.db.backup.$(date +%Y%m%d)

# Keep backups organized
ls -lh privstack.db.backup.*
```

### View Resource Usage

```bash
docker stats privstack
```

## Advanced Configuration

### Use Custom Domain with HTTPS

Set up reverse proxy (nginx, Caddy, etc.):

```nginx
# Example nginx config
server {
    listen 443 ssl http2;
    server_name privstack.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/privstack.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/privstack.yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://192.168.0.131:8082;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Change Default Port

Edit `docker-compose.yml`:
```yaml
ports:
  - "8000:3000"  # Change 8082 to 8000
```

Then restart:
```bash
docker compose up -d
```

## Security Recommendations

1. **Use Strong Password**: 12+ characters, mix of uppercase, lowercase, numbers, symbols
2. **Enable HTTPS**: Use reverse proxy with SSL certificate
3. **Regular Backups**: Automate database backups
4. **Firewall Rules**: Only allow port 8082 from trusted IPs
5. **Keep Updated**: Regularly pull and rebuild

## Monitoring

### Set Up Uptime Alerts (Optional)

In Uptime Kuma, add a monitor for your PrivStack dashboard:
- URL: `http://192.168.0.131:8082/login`
- Check interval: 60 seconds
- Get alerts if dashboard goes down

### Check Logs Regularly

```bash
# Daily
docker compose logs privstack | tail -50

# For errors
docker compose logs privstack | grep -i error
```

## Support

- **Documentation**: See `README.md` and `DEPLOYMENT.md`
- **Logs**: `docker compose logs -f privstack`
- **Config**: Check `.env` file
- **Database**: `docker compose exec privstack sqlite3 /data/privstack.db`

## File Locations Inside Container

- Database: `/data/privstack.db`
- Application: `/app`
- Node modules: `/app/node_modules`

## Quick Reference Commands

```bash
# Start
docker compose up -d

# Stop
docker compose down

# Restart
docker compose restart

# Rebuild
docker compose up -d --build

# Logs
docker compose logs -f privstack

# Execute command in container
docker compose exec privstack <command>

# Backup database
docker compose cp privstack:/data/privstack.db ./privstack.db.backup

# Check health
docker compose ps

# Full cleanup (caution!)
docker compose down -v  # Removes volumes!
```

---

**You're all set! Happy dashboarding! 🎉**

Need help? Check the documentation files included in the project:
- `README.md` - Features and usage
- `DEPLOYMENT.md` - Advanced configuration and troubleshooting
- `PROJECT_CHECKLIST.md` - What's included
