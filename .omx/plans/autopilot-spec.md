# SijangYeojido Server Feature Spec

## Scope

Implement a NestJS REST API MVP for market discovery, store management, products, seller/admin operations, reports, internal maps, price history, and API logging.

## Requirements Mapping

- MK-001..003: list/search/detail markets.
- MK-004..009: expose internal map metadata, zones, store pins, and viewport-synchronized store lists.
- ST-001..010: list/search/detail stores and expose location, category, hours, holidays, payment methods, and photos.
- PR-001..006: list/detail products, current price/status, same-item price comparison, and price history.
- SE-001..007: merchant store registration/update/photo management and product/price management.
- AD-001..006: admin market CRUD, store approval/update/delete.
- RE-001..004: create typed reports for store info, price, location, and fake stores.
- SY-001..003: persist map/coordinate data, price history, and API/action logs.

## Notes

- Client-side map gestures are supported by server data contracts rather than implemented in the backend.
- Existing JWT role guards are reused for merchant/admin-only endpoints.
- TypeORM `synchronize` is already enabled in this development project, so new entities become schema-managed automatically.
