#!/bin/bash
# MinIO initialization script with retry logic

set -e

MINIO_HOST="${MINIO_HOST:-localhost:9000}"
MINIO_ROOT_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-minioadmin123}"
MAX_RETRIES=30
RETRY_COUNT=0

echo "Waiting for MinIO to be ready at $MINIO_HOST..."

# Wait for MinIO to be accessible
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -f --silent http://${MINIO_HOST}/minio/health/live > /dev/null 2>&1; then
    echo "MinIO is ready!"
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Waiting... (attempt $RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "MinIO failed to start within timeout"
  exit 1
fi

echo "MinIO initialization complete!"
