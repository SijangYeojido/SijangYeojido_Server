# SijangYeojido Server Implementation Plan

1. Add entities and DTOs for markets, map zones, stores, store photos, products, product prices, reports, and action logs.
2. Implement service methods for read APIs, seller APIs, admin APIs, report creation, price history, comparison, and viewport map queries.
3. Wire controllers with public, merchant, and admin routes using existing guards.
4. Update modules so TypeORM repositories are available.
5. Update focused unit tests with repository mocks and run build/tests.
