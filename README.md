# August 2016 Baton Rouge–Livingston Flood Map

A presentation-focused interactive map comparing the August 2016 flood footprint and modeled inundation across East Baton Rouge and Livingston Parishes with the FEMA 1-percent annual-chance floodplains that were legally effective during the event.

## Live site

**https://mefferso.github.io/2016_Flood_map/**

## Toggleable layers

- **East Baton Rouge estimated August 2016 inundation** — response-compiled East Baton Rouge GIS polygon.
- **Modeled August 2016 inundation extent** — a single-color rendering of the Amite River Basin modeled flood-depth raster; this supplies regional coverage including Livingston Parish.
- **August 2016 modeled flood depth** — the published depth raster with a dynamic legend fetched from the ArcGIS service when available.
- **USGS surveyed high-water marks** — event evidence loaded on demand from the USGS Short-Term Network / Flood Event Viewer API.
- **East Baton Rouge event-era 1% annual-chance floodplain** — FIRM effective June 19, 2012.
- **Livingston event-era 1% annual-chance floodplain** — FIRM effective April 3, 2012.
- **Current FEMA 1% annual-chance floodplain** — current effective National Flood Hazard Layer, included separately for reference.
- Light, street, and aerial-imagery basemaps.

## Important interpretation notes

- East Baton Rouge and Livingston did not publish identical 2016 inundation products. The East Baton Rouge layer is a response-compiled estimated polygon, while Livingston is represented by the basin-wide modeled inundation/depth raster that covers the Amite River Basin.
- The modeled inundation-extent layer is derived from the published depth tiles by rendering every non-transparent modeled flooded cell as a single blue color. It does not alter the underlying footprint.
- The event-era comparison uses each parish's DFIRM that was effective in August 2016. The current FEMA NFHL layer is optional and deliberately separate.
- USGS high-water marks are lazy-loaded from the public event API only when the layer is enabled. The app filters the statewide event data to the regional map bounds.

## Data and service sources

- East Baton Rouge GIS estimated inundation service: `https://services.arcgis.com/KYvXadMcgf0K1EzK/ArcGIS/rest/services/Estimated_Flood_Inundation_Area/FeatureServer/0`
- East Baton Rouge event-era DFIRM flood-hazard area: `https://services.maps.lsuagcenter.com/arcgis/rest/services/Floodmaps/EBR_EFF_DFIRM_20251127/MapServer/4`
- Livingston Parish event-era DFIRM flood-hazard area: `https://services.maps.lsuagcenter.com/arcgis/rest/services/Floodmaps/Livingston_EFF_DFIRM_20251019/MapServer/4`
- FEMA current NFHL flood-hazard zones: `https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28`
- August 2016 modeled inundation/depth tiles: `https://tiles.arcgis.com/tiles/u5yHfzprqJwnv49V/arcgis/rest/services/August_2016_Flood_Depth_Feet/MapServer`
- USGS Short-Term Network services: `https://stn.wim.usgs.gov/STNServices/`
- Event context and validation: USGS Scientific Investigations Report 2017-5005 and the Amite River Basin Commission Flood Inundation Map Viewer.

## Local preview

Any basic static web server works. For example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deployment

GitHub Pages publishes the repository root from the `main` branch. Changes pushed to `main` are deployed automatically.
