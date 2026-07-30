# August 2016 Baton Rouge Flood Map

A presentation-focused interactive map comparing the estimated August 2016 flood inundation footprint in East Baton Rouge Parish with the FEMA 1-percent annual-chance floodplain that was effective during the event.

## Live site

**https://mefferso.github.io/2016_Flood_map/**

## Toggleable layers

- **Estimated August 2016 inundation** — East Baton Rouge GIS hosted feature layer
- **Event-era FEMA 1% annual-chance floodplain** — East Baton Rouge FIRM effective June 19, 2012, and therefore effective during August 2016
- **Current FEMA 1% annual-chance floodplain** — current effective National Flood Hazard Layer, included separately for reference
- **August 2016 modeled flood depth** — cached ArcGIS raster tiles
- **Sentinel-2 false-color imagery** — August 14, 2016 satellite scene
- Light, street, and aerial-imagery basemaps

## Important interpretation notes

- The inundation polygon is an **estimate**, compiled by East Baton Rouge GIS from emergency-response calls, rescue points, public-service requests, damage assessments, debris routes, road closures, imagery, FEMA flood-hazard data, and public feedback.
- The main comparison uses the East Baton Rouge DFIRM effective June 19, 2012, which was the effective FIRM during the August 2016 event.
- The current FEMA NFHL layer is a separate optional overlay and should not be confused with the event-era floodplain.

## Data and service sources

- East Baton Rouge GIS estimated inundation service: `https://services.arcgis.com/KYvXadMcgf0K1EzK/ArcGIS/rest/services/Estimated_Flood_Inundation_Area/FeatureServer/0`
- East Baton Rouge event-era DFIRM flood-hazard area: `https://services.maps.lsuagcenter.com/arcgis/rest/services/Floodmaps/EBR_EFF_DFIRM_20251127/MapServer/4`
- FEMA current NFHL flood-hazard zones: `https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28`
- August 2016 flood-depth tiles: `https://tiles.arcgis.com/tiles/u5yHfzprqJwnv49V/arcgis/rest/services/August_2016_Flood_Depth_Feet/MapServer`
- Sentinel-2 flood imagery tiles: `https://tiles.arcgis.com/tiles/njxlOVQKvDzk10uN/arcgis/rest/services/2016_Louisiana_Flood_Sentinel/MapServer`
- Event context: USGS Scientific Investigations Report 2017-5005 and associated data release

## Local preview

Any basic static web server works. For example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deployment

GitHub Pages publishes the repository root from the `main` branch. Changes pushed to `main` are deployed automatically.
