#!/bin/bash
# PrivStack Quick Start Deployment Script
# Run this on your Debian server to deploy PrivStack

set -e

echo "🚀 PrivStack Quick Start Deployment"
echo "=================================="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first:"
    echo "   curl -fsSL https://get.docker.com | sh"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install it first."
    exit 1
fi

echo "✓ Docker and Docker Compose installed"
echo ""

# Create deployment directory
DEPLOY_DIR="/opt/docker/privstack"
echo "📁 Creating deployment directory: $DEPLOY_DIR"

if [ -d "$DEPLOY_DIR" ]; then
    echo "⚠️  Directory already exists. Update existing installation? (y/n)"
    read -r response
    if [ "$response" != "y" ]; then
        exit 0
    fi
fi

sudo mkdir -p "$DEPLOY_DIR"
sudo chown -R $USER:$USER "$DEPLOY_DIR" 2>/dev/null || echo "Note: You may need sudo permissions for /opt"

# Copy files
echo "📦 Copying PrivStack files..."
# User should copy the files manually, as this script is on the server
echo "Please copy the entire PrivStack folder to $DEPLOY_DIR"
echo "Then run: cd $DEPLOY_DIR && bash QUICK_START.sh"
echo ""

if [ ! -f "$DEPLOY_DIR/docker-compose.yml" ]; then
    echo "❌ docker-compose.yml not found in $DEPLOY_DIR"
    echo "Please ensure all PrivStack files are copied there first."
    exit 1
fi

cd "$DEPLOY_DIR"

# Check for .env file
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env

    # Generate NEXTAUTH_SECRET
    echo ""
    echo "🔐 Generating secure NEXTAUTH_SECRET..."
    SECRET=$(openssl rand -base64 32)

    # Update .env with secret (sed works differently on macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/changeme_replace_with_32char_random_string/$SECRET/" .env
    else
        sed -i "s/changeme_replace_with_32char_random_string/$SECRET/" .env
    fi

    echo "✓ Secret generated and added to .env"
    echo ""
    echo "📖 Review .env file and update service URLs if needed:"
    echo "   nano .env"
    echo ""
else
    echo "✓ .env file already exists"
fi

# Ensure data directory
mkdir -p data
chmod 755 data

echo "🐳 Building Docker image..."
docker compose build --no-cache

echo ""
echo "🚀 Starting PrivStack..."
docker compose up -d

echo ""
echo "⏳ Waiting for container to be healthy (this may take 30-60 seconds)..."
sleep 10

# Check if container is running
if docker compose ps | grep -q "privstack.*running"; then
    echo "✅ PrivStack is running!"
    echo ""
    echo "🌐 Dashboard: http://192.168.0.131:8082"
    echo ""
    echo "📋 Setup Instructions:"
    echo "   1. Open http://192.168.0.131:8082 in your browser"
    echo "   2. Complete the setup wizard (admin account, apps, services)"
    echo "   3. Configure service URLs and API keys in Settings"
    echo ""
    echo "📚 Documentation: See README.md and DEPLOYMENT.md"
    echo "📊 View logs: docker compose logs -f privstack"
    echo ""
else
    echo "❌ Container failed to start. Checking logs..."
    docker compose logs privstack
    exit 1
fi
