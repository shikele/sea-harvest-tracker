# Sea Harvest Tracker

A web application to track the best dates/times for shellfish harvesting near Redmond, WA (within 100 miles). Combines biotoxin closure data from WA DOH with tide predictions from NOAA.

## Features

- **Real-time biotoxin status** from WA Department of Health
- **Tide predictions** from NOAA for 8 local stations
- **Harvest opportunity scoring** combining status + tide conditions
- **7-day calendar view** showing best upcoming harvest times
- **25 curated beaches** within 100 miles of Redmond

## Quick Start

### Backend

```bash
cd backend
npm install
npm start
```

The API runs on http://localhost:3001

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs on http://localhost:5173

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/beaches` | List all beaches with status |
| `GET /api/beaches/:id` | Single beach details |
| `GET /api/beaches/summary` | Status summary statistics |
| `POST /api/beaches/refresh` | Refresh biotoxin data |
| `GET /api/tides/stations` | List tide stations |
| `GET /api/tides/:stationId` | Tide predictions |
| `GET /api/harvest-windows` | Beaches sorted by opportunity |
| `GET /api/harvest-windows/calendar` | 7-day calendar |
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
