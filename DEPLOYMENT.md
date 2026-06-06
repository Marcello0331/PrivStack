# PrivStack Deployment Guide

## Server Requirements

- Debian Linux (12 or newer recommended)
- Docker & Docker Compose installed
- At least 2GB RAM available
- 5GB disk space for database and media metadata
- Network access to homelab services

## Step-by-Step Deployment

### 1. Prepare Server

```bash
# SSH into your Debian server
ssh user@192.168.0.131

# Create deployment directory
sudo mkdir -p /opt/docker/privstack
sudo chown $USER:$USER /opt/docker/privstack
cd /opt/docker/privstack
```

### 2. Download PrivStack

```bash
# Option A: Via git (if available)
git clone <repo-url> .

# Option B: Manual copy
# Copy the entire privstack folder from your development machine
# to /opt/docker/privstack/ on the server
```

### 3. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Generate secure secret (run on server)
openssl rand -base64 32
# Copy the output

# Edit .env file
nano .env
```

Update these critical settings:

```
NEXTAUTH_SECRET=<paste_your_generated_secret>
NEXTAUTH_URL=http://192.168.0.131:8082

# Update service URLs if they differ from defaults:
GLANCES_URL=http://192.168.0.131:61208
SONARR_URL=http://192.168.0.131:8989
RADARR_URL=http://192.168.0.131:7878
# ... etc
```

### 4. Deploy Container

```bash
# Build and start the container
docker compose up -d --build

# Check container status
docker compose ps

# View logs
docker compose logs -f privstack
```

### 5. First Access

Open browser: `http://192.168.0.131:8082`

You'll be redirected to the setup wizard:

1. **Create Admin Account**: Choose username and password
2. **Add Your Apps**: Select default apps and verify URLs
3. **Configure Services**: Add API keys for Sonarr, Radarr, etc.
4. **Complete**: Dashboard is now ready!

## Post-Deployment Configuration

### Via Web UI (Recommended)

1. Login to dashboard
2. Click Settings gear icon (top right)
3. Go to **Services** tab
4. Enter API keys and URLs for each service
5. Click **Save Changes**

### Via Environment Variables

Edit `docker-compose.yml` and add service-specific environment variables, then:

```bash
docker compose restart
```

### Docker Socket Widget

The Docker Containers widget reads the local Docker socket to list containers,
show uptime and logs, and run start, stop, and restart actions. The provided
Compose file mounts `/var/run/docker.sock` and sets
`DOCKER_SOCKET_PATH=/var/run/docker.sock`.

On Linux, if the widget reports a Docker socket permission error, set the host
Docker group ID before starting the stack:

```bash
export DOCKER_GID=$(getent group docker | cut -d: -f3)
docker compose up -d
```

## Integrating with Portainer

PrivStack can be managed via Portainer:

1. In Portainer, click **Stacks**
2. Click **Add Stack**
3. Name: `privstack`
4. Paste contents of `docker-compose.yml`
5. Add environment variables under **Env**
6. Click **Deploy**

## Backup & Restore

### Backup Database

```bash
# Create backup
docker compose exec -T privstack cp /data/privstack.db /data/privstack.db.backup

# Copy to local machine
docker compose cp privstack:/data/privstack.db ./privstack.db.backup
```

### Restore Database

```bash
# Copy backup to container
docker compose cp ./privstack.db.backup privstack:/data/privstack.db.restore

# Restore (stop container first)
docker compose stop
docker compose exec -T privstack cp /data/privstack.db.restore /data/privstack.db
docker compose start
```

## Monitoring & Maintenance

### Check Container Health

```bash
# View health status
docker compose ps

# View detailed logs
docker compose logs privstack

# Check resource usage
docker stats privstack
```

### Update PrivStack

```bash
cd /opt/docker/privstack

# Pull latest changes
git pull

# Rebuild and restart
docker compose up -d --build

# Check logs for issues
docker compose logs -f privstack
```

### Database Maintenance

```bash
# Optimize database (removes unused space)
docker compose exec privstack sqlite3 /data/privstack.db "VACUUM;"

# Check database integrity
docker compose exec privstack sqlite3 /data/privstack.db "PRAGMA integrity_check;"
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker compose logs privstack

# Common issues:
# - DATABASE_PATH invalid
# - NEXTAUTH_SECRET not set
# - Port 8082 already in use

# Rebuild from scratch
docker compose down
docker system prune
docker compose up -d --build
```

### Services show "unreachable"

1. Verify service URLs in Settings are correct
2. Check services are accessible from server:
   ```bash
   curl -I http://192.168.0.131:8989  # Sonarr example
   ```
3. If using API keys, verify they're correct
4. Check firewall rules if applicable

### High memory usage

- Reduce widget polling intervals in code
- Clear old data: `sqlite3 /data/privstack.db "DELETE FROM logs;"`
- Restart container: `docker compose restart`

### Slow dashboard

- Check Glances is running (`curl http://192.168.0.131:61208/api/3/`)
- Reduce number of widgets displayed
- Check system resources: `free -h && df -h`

## Security Hardening

### HTTPS with Reverse Proxy

Use nginx or Caddy to reverse-proxy PrivStack with SSL:

**nginx example:**

```nginx
server {
    listen 443 ssl http2;
    server_name privstack.yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
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

### Network Isolation

Create restricted Docker network:

```yaml
networks:
  privstack_net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
    driver_opts:
      com.docker.network.bridge.enable_ip_masquerade: "false"
```

### Regular Backups

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups/privstack"
mkdir -p $BACKUP_DIR
docker compose -f /opt/docker/privstack/docker-compose.yml \
  cp privstack:/data/privstack.db $BACKUP_DIR/privstack.db.$(date +%Y%m%d)

# Keep only last 30 days
find $BACKUP_DIR -mtime +30 -delete
```

## Support & Issues

- Check logs: `docker compose logs -f`
- Verify configuration: `cat .env`
- Test connectivity: `curl -I http://service-url`
- Review README.md for architecture details

## Version Updates

PrivStack follows semantic versioning. Check releases for upgrade notes.

To upgrade:

```bash
cd /opt/docker/privstack
git pull origin main
docker compose up -d --build
docker compose logs -f privstack
```
