# August 2016 Baton Rouge Flood Map

A presentation-focused interactive map comparing the estimated August 2016 flood inundation footprint in East Baton Rouge Parish with FEMA's current effective 1-percent annual-chance floodplain.

## Live site

After GitHub Pages deploys, the site will be available at:

**https://mefferso.github.io/2016_Flood_map/**

## Toggleable layers

- **Estimated August 2016 inundation** — East Baton Rouge GIS hosted feature layer
- **FEMA 1% annual-chance floodplain** — current effective National Flood Hazard Layer, filtered to Special Flood Hazard Areas
- **August 2016 modeled flood depth** — cached ArcGIS raster tiles
- **Sentinel-2 false-color imagery** — August 14, 2016 satellite scene
- **NWS two-day best-estimate rainfall** — georeferenced reference graphic
- **NWS rainfall annual-exceedance probability** — georeferenced reference graphic
- Light, street, and aerial-imagery basemaps

## Important interpretation notes

- The inundation polygon is an **estimate**, compiled by East Baton Rouge GIS from emergency-response calls, rescue points, public-service requests, damage assessments, debris routes, road closures, imagery, FEMA flood-hazard data, and public feedback.
- The FEMA layer is the **current effective NFHL**, not a frozen copy of the FIRM that was effective during August 2016.
- The NWS rainfall overlays are georeferenced presentation graphics. They are useful for regional context but should not be treated as analysis-ready raster data.

## Data and service sources

- East Baton Rouge GIS estimated inundation service: `https://services.arcgis.com/KYvXadMcgf0K1EzK/ArcGIS/rest/services/Estimated_Flood_Inundation_Area/FeatureServer/0`
- FEMA NFHL flood-hazard zones: `https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28`
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

The workflow in `.github/workflows/pages.yml` deploys the repository root to GitHub Pages whenever `main` changes. It also supports manual runs from the Actions tab.
