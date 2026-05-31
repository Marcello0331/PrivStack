# PrivStack - Self-Hosted Homelab Dashboard

A production-ready, fully-featured homelab dashboard built with Next.js, TypeScript, and SQLite. Deploy via Docker to monitor and manage your entire homelab from a single, beautifully designed interface.

## Features

- **14 Widget Types**: System stats, Docker containers, Sonarr, Radarr, qBittorrent, Jellyfin, Plex, Uptime Kuma, Weather, ESXi VMs, Grafana embeds, app shortcuts, search, and quick stats
- **Drag-and-Drop Dashboard**: Customize your layout with react-grid-layout
- **Pinned App Launcher**: Quick access to your favorite services with online status indicators
- **Authentication**: NextAuth.js with bcrypt password hashing
- **Service Integration**: Configure URLs and API keys for all supported services
- **Glassmorphism Design**: Beautiful dark theme with animated particle canvas background
- **Fully Customizable**: Widget registry system makes it easy to add new widget types
- **SQLite Database**: Lightweight, file-based persistence with no external DB needed

## Quick Start

### Prerequisites

- Docker & Docker Compose
- A Debian Linux server at 192.168.0.131 (or adjust the compose file)
- Basic homelab services (Sonarr, Radarr, qBittorrent, etc.) already running

### Installation

1. Clone/download this project to `/opt/docker/privstack/`:

```bash
mkdir -p /opt/docker
# Copy the entire privstack directory here
cd /opt/docker/privstack
```

2. Copy environment file:

```bash
cp .env.example .env
```

3. Generate a secure NEXTAUTH_SECRET:

```bash
openssl rand -base64 32
```

4. Update `.env` with your settings:

```bash
NEXTAUTH_SECRET=your_generated_secret_here
NEXTAUTH_URL=http://192.168.0.131:8082
DATABASE_PATH=/data/privstack.db
```

5. Deploy with Docker Compose:

```bash
docker compose up -d --build
```

6. Access the dashboard:

```
http://192.168.0.131:8082
```

7. Complete the setup wizard to create your admin account and configure services

## Configuration

### Service Setup

After login, go to **Settings** to configure:

- **Glances**: System monitoring (CPU, RAM, disk, network)
- **Sonarr**: TV show automation
- **Radarr**: Movie automation
- **qBittorrent**: Torrent client
- **Jellyfin**: Media server
- **Plex**: Media server
- **Uptime Kuma**: Service monitoring
- **OpenWeatherMap**: Weather widget (requires free API key)
- **ESXi**: VMware virtual machines (optional)
- **Grafana**: Embedded dashboards (optional)

### Widget Management

1. Click the **✎ Edit** button in the header to enter edit mode
2. Click **+ Add Widget** to insert new widgets
3. Drag widgets to rearrange, resize using the corner handles
4. Click the **...** menu on each widget for refresh/settings/remove options
5. Click **Done Editing** when satisfied with the layout

### App Launcher

The app launcher section shows pinned services. In edit mode:
- Drag tiles to reorder
- Click the X to remove an app
- Click **+ Add app** to add more
- Icons are fetched from the selfh.st community library

## Architecture

### Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts
- **Backend**: Next.js API routes, NextAuth.js
- **Database**: SQLite via better-sqlite3
- **UI Components**: Lucide React, custom glassmorphism components
- **Layout**: react-grid-layout
- **Auth**: NextAuth.js with credentials provider

### Database Schema

- **users**: Admin and viewer accounts with bcrypt-hashed passwords
- **apps**: Pinned app shortcuts with icons and URLs
- **widget_layouts**: Per-user widget configurations and positions
- **settings**: Key-value configuration store
- **icon_cache**: Cached selfh.st app icons
- **app_status**: Online/offline status for app pings

### Widget System

Each widget consists of:

- **Component** (`components/widgets/WidgetName.tsx`): React UI component
- **API Route** (`app/api/widgets/widget-name/route.ts`): Server-side data fetching
- **Registry Entry** (`lib/widgetRegistry.ts`): Metadata and configuration schema

Adding a new widget is as simple as creating these three files.

## Deployment

### Docker Compose

The included `docker-compose.yml` provides:

- Multi-stage build for minimal image size
- Volume mounts for data persistence and Docker socket access
- Health checks
- Automatic restart on failure
- Bridge network for service isolation

### Environment Variables

All configurable via `.env`:

```
NEXTAUTH_SECRET          # Generated random string (required)
NEXTAUTH_URL             # Dashboard URL accessible from browser
DATABASE_PATH            # SQLite database location (default: /data/privstack.db)
TZ                       # Timezone (default: Europe/Budapest)
GLANCES_URL              # Optional: override Glances API URL
SONARR_URL              # Optional: override Sonarr URL
... (and others for each service)
```

### Port Mapping

The dashboard runs on port 3000 inside the container, exposed as **8082** by default. Adjust in `docker-compose.yml` if needed.

## Advanced Usage

### Custom Widget Development

1. Create a new folder: `components/widgets/MyWidget/`
2. Create `index.tsx`:

```typescript
export default function MyWidget({ config }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/widgets/my-widget')
      .then(r => r.json())
      .then(setData);
  }, []);

  return <div>{data ? 'Your widget' : 'Loading...'}</div>;
}
```

3. Create `app/api/widgets/my-widget/route.ts`:

```typescript
export async function GET(request) {
  // Fetch data from your service
  return NextResponse.json({ /* data */ });
}
```

4. Add to widget registry in `lib/widgetRegistry.ts`

5. Restart the container

### Backup & Restore

Database is stored in the `./data/` volume. To backup:

```bash
docker compose exec privstack cp /data/privstack.db /data/privstack.db.backup
```

To restore:

```bash
docker compose exec privstack cp /data/privstack.db.backup /data/privstack.db
```

## Troubleshooting

### Can't connect to services

1. Verify service URLs in Settings are correct
2. Check that services are accessible from the Docker container
3. Ensure API keys are correct
4. Check container logs: `docker compose logs -f privstack`

### Database issues

If the database gets corrupted, delete it and restart:

```bash
rm data/privstack.db
docker compose restart
```

### Setup wizard not appearing

The setup wizard only shows on first run. To reset:

```bash
docker compose exec privstack sqlite3 /data/privstack.db "DELETE FROM users;"
docker compose restart
```

## Logs

View container logs:

```bash
docker compose logs -f privstack
```

## Performance

- **Minimal resource usage**: Runs comfortably on low-spec hardware
- **Polling intervals**: Configurable per widget (default 30-60 seconds)
- **Database**: SQLite is performant for this use case (< 1000 records)
- **Frontend**: Next.js automatic code splitting keeps load times fast

## Security Considerations

- ✅ Passwords hashed with bcrypt
- ✅ API keys stored in database (encrypted via env vars recommended)
- ✅ Docker socket mounted as read-only
- ✅ NextAuth.js JWT-based sessions
- ⚠️ Deploy behind a reverse proxy (nginx, Caddy) with HTTPS in production
- ⚠️ Use strong admin password
- ⚠️ Regularly backup database

## License

MIT

## Contributing

PrivStack is open source. Contributions welcome! Fork, modify, and submit pull requests.

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Built with ❤️ for homelab enthusiasts**
