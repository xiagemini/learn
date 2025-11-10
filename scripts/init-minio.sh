#!/bin/bash
# MinIO initialization script
# Creates buckets and sets up initial configuration

set -e

# Wait for MinIO to be ready
until curl -f http://localhost:9000/minio/health/live; do
  echo 'Waiting for MinIO to be ready...'
  sleep 2
done

echo 'MinIO is ready!'

# Configure MC (MinIO Client) alias
export MC_HOST_minio=http://minioadmin:minioadmin123@localhost:9000

# Create buckets
echo 'Creating MinIO buckets...'

# Learning assets bucket
if ! mc ls minio/assets >/dev/null 2>&1; then
  mc mb minio/assets
  echo 'Created assets bucket'
else
  echo 'assets bucket already exists'
fi

# User uploads bucket
if ! mc ls minio/uploads >/dev/null 2>&1; then
  mc mb minio/uploads
  echo 'Created uploads bucket'
else
  echo 'uploads bucket already exists'
fi

# Temporary/cache bucket
if ! mc ls minio/temp >/dev/null 2>&1; then
  mc mb minio/temp
  echo 'Created temp bucket'
else
  echo 'temp bucket already exists'
fi

# Make assets bucket public for reading
mc policy set public minio/assets

echo 'MinIO initialization complete!'
