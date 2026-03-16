# AURA – top-level Makefile
# Builds, tests, and runs all layers of the AURA stack.
#
# Prerequisites:
#   • Node.js >= 22.5 (for node:sqlite)
#   • Docker + Docker Compose (for containerised deployment)
#   • PlatformIO CLI  (for firmware flashing)
#   • Python >= 3.9   (for mock_puck.py)

.PHONY: all install build test clean dev flash docker docker-down help

# ── Install ───────────────────────────────────────────────────────────────────
install: install-gateway install-dashboard install-tests

install-gateway:
	@echo "▶ Installing gateway dependencies…"
	cd gateway && npm install

install-dashboard:
	@echo "▶ Installing dashboard dependencies…"
	cd dashboard && npm install

install-tests:
	@echo "▶ Installing test dependencies…"
	cd tests && npm install

# ── Build ─────────────────────────────────────────────────────────────────────
build: build-dashboard

build-dashboard:
	@echo "▶ Building dashboard…"
	cd dashboard && npm run build

# ── Test ──────────────────────────────────────────────────────────────────────
test: test-gateway test-e2e

test-gateway:
	@echo "▶ Running gateway unit & API tests…"
	cd gateway && npm test

test-e2e:
	@echo "▶ Running E2E tests (requires gateway + dashboard)…"
	cd tests && npm run test:e2e

test-mock-puck:
	@echo "▶ Running mock Puck simulator (3 cycles against localhost:3000)…"
	python3 tests/hardware/mock_puck.py --cycles 3

# ── Development servers ───────────────────────────────────────────────────────
dev:
	@echo "▶ Starting gateway and dashboard dev servers in parallel…"
	@(cd gateway && npm run dev) & (cd dashboard && npm run dev) & wait

dev-gateway:
	cd gateway && npm run dev

dev-dashboard:
	cd dashboard && npm run dev

# ── Firmware ──────────────────────────────────────────────────────────────────
flash:
	@echo "▶ Building and flashing firmware via PlatformIO…"
	cd firmware && pio run --target upload

firmware-build:
	@echo "▶ Compiling firmware (no upload)…"
	cd firmware && pio run

# ── Docker ────────────────────────────────────────────────────────────────────
docker:
	@echo "▶ Building and starting all containers…"
	docker compose up --build -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

# ── Clean ─────────────────────────────────────────────────────────────────────
clean:
	rm -rf gateway/node_modules dashboard/node_modules tests/node_modules
	rm -rf dashboard/dist
	rm -rf data/

# ── Help ──────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  AURA Makefile targets:"
	@echo ""
	@echo "  install          Install all Node dependencies"
	@echo "  build            Build dashboard for production"
	@echo "  test             Run gateway + E2E tests"
	@echo "  test-gateway     Run gateway unit & API tests only"
	@echo "  test-mock-puck   Run the Python Puck simulator"
	@echo "  dev              Start gateway + dashboard in dev mode"
	@echo "  flash            Build and flash ESP32-S3 firmware"
	@echo "  docker           Build and start Docker containers"
	@echo "  docker-down      Stop Docker containers"
	@echo "  clean            Remove build artefacts and node_modules"
	@echo ""
