.PHONY: help docker-up docker-down docker-logs docker-status docker-clean init-env dev build lint typecheck format clean

help:
    @echo "Available commands:"
    @echo ""
    @echo "Docker commands:"
    @echo "  make docker-up       - Start Docker services (SQLite + MinIO)"
    @echo "  make docker-down     - Stop Docker services"
    @echo "  make docker-logs     - View Docker service logs"
    @echo "  make docker-status   - Check Docker service status"
    @echo "  make docker-clean    - Stop and remove Docker containers, volumes"
    @echo ""
    @echo "Development commands:"
    @echo "  make init-env        - Initialize environment files"
    @echo "  make dev             - Start dev server (requires docker-up)"
    @echo "  make build           - Build all packages"
    @echo "  make lint            - Lint all packages"
    @echo "  make typecheck       - Type check all packages"
    @echo "  make format          - Format code"
    @echo ""
    @echo "Cleanup:"
    @echo "  make clean           - Remove build artifacts"

# Docker commands
docker-up:
    @echo "Starting Docker services..."
    docker compose up -d
    @echo "Waiting for services to be ready..."
    sleep 5
    @echo "Docker services started!"
    @echo ""
    @echo "Services available at:"
    @echo "  MinIO API:    http://localhost:9000"
    @echo "  MinIO UI:     http://localhost:9001"
    @echo "  SQLite Data:  ./data/sqlite/app.db"
    @echo ""
    @echo "MinIO Credentials:"
    @echo "  Username: minioadmin"
    @echo "  Password: minioadmin123"

docker-down:
    @echo "Stopping Docker services..."
    docker compose down

docker-logs:
    docker compose logs -f

docker-status:
    @echo "Docker services status:"
    docker compose ps

docker-clean:
    @echo "Removing Docker services and volumes..."
    docker compose down -v
    @echo "Cleaned up Docker services"

# Development commands
init-env:
    @echo "Initializing environment files..."
    @if [ ! -f packages/backend/.env ]; then \
        cp packages/backend/.env.example packages/backend/.env; \
        echo "Created packages/backend/.env"; \
    fi
    @if [ ! -f packages/frontend/.env ]; then \
        cp packages/frontend/.env.example packages/frontend/.env; \
        echo "Created packages/frontend/.env"; \
    fi
    @echo "Environment files ready!"

dev:
    pnpm dev

build:
    pnpm build

lint:
    pnpm lint

typecheck:
    pnpm typecheck

format:
    pnpm format

# Cleanup
clean:
    @echo "Cleaning build artifacts..."
    rm -rf packages/*/dist
    rm -rf packages/*/node_modules
    rm -rf node_modules
    @echo "Cleanup complete!"

# Combined setup
setup: init-env docker-up
    @echo "Setup complete! Backend and MinIO are ready."
    @echo "Run 'make dev' to start development servers."
