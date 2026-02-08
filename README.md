# Sea Harvest Tracker

A web application to track the best dates/times for shellfish harvesting across Washington State. Combines biotoxin closure data from WA DOH with tide predictions from NOAA, and includes community harvest reports with photo uploads.

## Features

- **Real-time biotoxin status** from WA Department of Health
- **Tide predictions** from NOAA across 13 tide stations
- **197 beaches** across Washington State with harvest opportunity scoring
- **7-day harvest calendar** showing best upcoming harvest windows
- **Interactive map** with Leaflet showing beach locations and status
- **Community comments** with photo uploads and species tracking
- **Daily auto-refresh** of biotoxin data (6 AM PT) and monthly tide refresh

## Deployment

Deployed on [Render](https://render.com) (Starter plan) with a 1 GB persistent disk for database, uploads, and cache.

```bash
# Render auto-detects render.yaml and deploys
# Set ADMIN_SECRET env var in Render dashboard for admin comment deletion
```

## Local Development

```bash
# Run both frontend and backend
npm run dev

# Or separately:
cd backend && npm run dev    # API on http://localhost:3001
cd frontend && npm run dev   # App on http://localhost:5173
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/beaches` | List all beaches with status |
| `GET /api/beaches/:id` | Single beach details |
| `GET /api/beaches/summary` | Status summary statistics |
| `POST /api/beaches/refresh` | Refresh biotoxin data |
| `GET /api/tides/stations` | List tide stations |
| `GET /api/tides/:stationId` | Tide predictions |
| `GET /api/tides/:stationId/low-tides` | Low tide windows |
| `POST /api/tides/refresh` | Refresh tide data |
| `GET /api/harvest-windows` | Beaches sorted by opportunity |
| `GET /api/harvest-windows/calendar` | 7-day harvest calendar |
| `GET /api/comments` | All comments across beaches |
| `GET /api/comments/:beachId` | Comments for a beach |
| `POST /api/comments/:beachId` | Post comment (1/IP/day, photos supported) |
| `DELETE /api/comments/:beachId/:commentId` | Delete comment (author or admin) |
| `POST /api/refresh` | Refresh all data |

## Data Sources

- **WA DOH Biotoxin API**: https://fortress.wa.gov/doh/arcgis/arcgis/rest/services/Biotoxin/Biotoxin_v2/MapServer
- **NOAA Tides API**: https://api.tidesandcurrents.noaa.gov/api/prod/datagetter

## Status Colors

- **Green**: Open + good low tide upcoming
- **Yellow**: Open but no ideal tide soon
- **Red**: Closed (biotoxin or seasonal)
- **Gray**: Unknown status

## Tide Quality

- **Excellent**: Below 0 ft (best for harvesting)
- **Good**: 0-1 ft
- **Fair**: 1-2 ft
- **Poor**: Above 2 ft
