# CHANGELOG – Staging Enablement (Windows 11)

This document summarizes new files, how to start/stop, and known limitations.

## New Files
- docker-compose.staging.yml
- .env.staging
- frontend/.env.staging
- docs/staging/README.md
- docs/perf/load-plan.md
- docs/perf/baseline-20250905.md
- docker-compose.monitoring.yml
- monitoring/promtail-config.yml
- grafana/provisioning/datasources/loki.yml
- grafana/provisioning/dashboards/dashboards.yml
- grafana/provisioning/dashboards/basic-staging-logs.json
- docs/monitoring/README.md
- docs/epics/ui-ux-enhancements.md
- docs/epics/security-hardening.md
- tests/load/artillery/health-readiness.yaml
- tests/load/artillery/graphql-discovery.yaml
- tests/load/artillery/socketio-messaging.yaml

## Start/Stop
```
# Staging
docker compose -f docker-compose.staging.yml up -d
docker compose -f docker-compose.staging.yml down

# Monitoring
docker compose -f docker-compose.monitoring.yml up -d
docker compose -f docker-compose.monitoring.yml down
```

## Known Limitations
- Artillery configs are baselines; adjust GraphQL query/event names to match schema/events.
- Default credentials (admin/admin for Grafana, minio/minio123) are for local use; change locally if desired.
- Promtail expects Docker Desktop with WSL2 backend; classic Hyper-V is not supported by this config.

