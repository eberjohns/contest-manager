#!/usr/bin/env bash
# Stop the contest platform system using Docker Compose

cd "$(dirname "$0")"

echo "Stopping Contest Platform..."
docker-compose down

echo "System stopped."
