#!/bin/bash
# Backend setup script
# Initializes environment and database configuration

set -e

echo "=== Backend Setup Script ==="
echo ""

# Check if backend .env exists
if [ ! -f packages/backend/.env ]; then
    echo "Creating backend .env from template..."
    cp packages/backend/.env.example packages/backend/.env
else
    echo "Backend .env already exists"
fi

# Check if frontend .env exists
if [ ! -f packages/frontend/.env ]; then
    echo "Creating frontend .env from template..."
    cp packages/frontend/.env.example packages/frontend/.env
else
    echo "Frontend .env already exists"
fi

# Ensure data directories exist
echo "Creating data directories..."
mkdir -p data/sqlite
mkdir -p data/minio

echo ""
echo "=== Setup Complete ==="
echo "Next steps:"
echo "1. Run 'pnpm docker:up' to start Docker services"
echo "2. Run 'pnpm dev' to start development servers"
echo ""
