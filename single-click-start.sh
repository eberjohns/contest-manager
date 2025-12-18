#!/usr/bin/env bash
# Start the full contest platform using Docker Compose

set -e
cd "$(dirname "$0")"

echo "Starting Contest Platform using Docker Compose..."
docker-compose up -d --build

echo "Waiting for credentials to be generated..."

# Wait until credentials file exists
while [ ! -f data/credentials.json ]; do
  sleep 2
done

# Read credentials using jq
ADMIN_USERNAME=$(jq -r '.admin_username' data/credentials.json)
CLASS_PIN=$(jq -r '.class_pin' data/credentials.json)
URL=$(jq -r '.url' data/credentials.json)

echo
echo "============================="
echo "  Contest Platform Started!"
echo "  Admin Username: $ADMIN_USERNAME"
echo "  Class PIN: $CLASS_PIN"
echo "  URL: $URL"
echo "============================="
echo

# Open browser (Linux / macOS)
if command -v xdg-open > /dev/null; then
  xdg-open "$URL"
elif command -v open > /dev/null; then
  open "$URL"
else
  echo "Please open the URL manually."
fi

echo "To stop the system, run ./stop.sh"
