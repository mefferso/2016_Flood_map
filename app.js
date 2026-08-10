/* global L */

const REGIONAL_VIEW = {
  center: [30.52, -90.86],
  zoom: 9,
};

const REGIONAL_BOUNDS = L.latLngBounds(
  [30.05, -91.38],
  [31.08, -90.35],
);

const DEPTH_SERVICE_URL =
  "https://tiles.arcgis.com/tiles/u5yHfzprqJwnv49V/arcgis/rest/services/August_2016_Flood_Depth_Feet/MapServer";
const DEPTH_TILE_URL = `${DEPTH_SERVICE_URL}/tile/{z}/{y}/{x}`;
const STN_SERVICE_ROOT = "https://stn.wim.usgs.gov/STNServices";
const CENSUS_ZCTA_URL =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/7";

const map = L.map("map", {
  center: REGIONAL_VIEW.center,
  zoom: REGIONAL_VIEW.zoom,
  zoomControl: false,
  preferCanvas: true,
});

L.control.zoom({ position: "topright" }).addTo(map);
L.control.scale({ position: "bottomleft", imperial: true, metric: false }).addTo(map);

const basemaps = {
  light: L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      maxZoom: 20,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  ),
  streets: L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      attribution: "Tiles &copy; Esri",
    },
  ),
  imagery: L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      attribution:
        "Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    },
  ),
};

let activeBasemap = basemaps.light.addTo(map);

const layers = {};
const loadPromises = [];
const layerLoadState = {
  highWaterMarks: "idle",
  depthLegend: "idle",
};
const highWaterMarkRenderer = L.canvas({ padding: 0.5 });

function floodplainPopup(parish, effectiveDate, properties) {
  const p = properties || {};
  const bfe = Number.isFinite(Number(p.STATIC_BFE))
    ? `${Number(p.STATIC_BFE).toFixed(1)} ft`
    : "Not listed";

  return `
    <div class="popup-title">${escapeHtml(parish)} event-era 1% annual-chance floodplain</div>
    <table class="popup-table">
      <tr><td>Effective date</td><td>${escapeHtml(effectiveDate)}</td></tr>
      <tr><td>Flood zone</td><td>${escapeHtml(p.FLD_ZONE || "Unknown")}</td></tr>
      <tr><td>Subtype</td><td>${escapeHtml(p.ZONE_SUBTY || "—")}</td></tr>
      <tr><td>Static BFE</td><td>${escapeHtml(bfe)}</td></tr>
    </table>
    <div class="popup-footnote">This DFIRM was effective during the August 2016 flood.</div>
  `;
}

layers.inundation = L.esri.featureLayer({
  url: "https://services.arcgis.com/KYvXadMcgf0K1EzK/ArcGIS/rest/services/Estimated_Flood_Inundation_Area/FeatureServer/0",
  simplifyFactor: 0.35,
  precision: 5,
  style: {
    color: "#006ca7",
    weight: 1.6,
    opacity: 0.95,
    fillColor: "#12a3dc",
    fillOpacity: 0.52,
  },
  onEachFeature(feature, layer) {
    layer.bindPopup(
      '<div class="popup-title">East Baton Rouge estimated August 2016 inundation</div>' +
        "<div>Compiled by East Baton Rouge GIS from emergency-response, damage-assessment, imagery, road-closure, FEMA, and public-report data.</div>",
    );
  },
}).addTo(map);

const depthTileOptions = {
  minZoom: 0,
  maxZoom: 19,
  minNativeZoom: 11,
  maxNativeZoom: 16,
  bounds: REGIONAL_BOUNDS,
  attribution: "August 2016 modeled inundation and flood depth via ArcGIS Online",
};

layers.modeledExtent = L.tileLayer(DEPTH_TILE_URL, {
  ...depthTileOptions,
  opacity: 0.42,
  className: "modeled-extent-tiles",
}).addTo(map);

layers.depth = L.tileLayer(DEPTH_TILE_URL, {
  ...depthTileOptions,
  opacity: 0.72,
});

layers.firm2012 = L.esri.featureLayer({
  url: "https://services.maps.lsuagcenter.com/arcgis/rest/services/Floodmaps/EBR_EFF_DFIRM_20251127/MapServer/4",
  where: "SFHA_TF = 'T'",
  simplifyFactor: 0.45,
  precision: 5,
  style: {
    color: "#cf2f2f",
    weight: 1.8,
    opacity: 0.98,
    fillColor: "#ef4444",
    fillOpacity: 0.38,
  },
  onEachFeature(feature, layer) {
    layer.bindPopup(floodplainPopup("East Baton Rouge Parish", "June 19, 2012", feature.properties));
  },
}).addTo(map);

layers.livingstonFirm2012 = L.esri.featureLayer({
  url: "https://services.maps.lsuagcenter.com/arcgis/rest/services/Floodmaps/Livingston_EFF_DFIRM_20251019/MapServer/4",
  where: "SFHA_TF = 'T'",
  simplifyFactor: 0.45,
  precision: 5,
  style: {
    color: "#d76a16",
    dashArray: "7 4",
    weight: 1.9,
    opacity: 0.98,
    fillColor: "#f59e0b",
    fillOpacity: 0.38,
  },
  onEachFeature(feature, layer) {
    layer.bindPopup(floodplainPopup("Livingston Parish", "April 3, 2012", feature.properties));
  },
}).addTo(map);

layers.fema = L.esri.featureLayer({
  url: "https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28",
  where: "SFHA_TF = 'T'",
  simplifyFactor: 0.45,
  precision: 5,
  style: {
    color: "#6d28d9",
    dashArray: "7 5",
    weight: 1.7,
    opacity: 0.95,
    fillColor: "#8b5cf6",
    fillOpacity: 0.24,
  },
  onEachFeature(feature, layer) {
    const p = feature.properties || {};
    const bfe = Number.isFinite(Number(p.STATIC_BFE))
      ? `${Number(p.STATIC_BFE).toFixed(1)} ft`
      : "Not listed";
    layer.bindPopup(`
      <div class="popup-title">Current FEMA 1% annual-chance floodplain</div>
      <table class="popup-table">
        <tr><td>Flood zone</td><td>${escapeHtml(p.FLD_ZONE || "Unknown")}</td></tr>
        <tr><td>Subtype</td><td>${escapeHtml(p.ZONE_SUBTY || "—")}</td></tr>
        <tr><td>Static BFE</td><td>${escapeHtml(bfe)}</td></tr>
      </table>
      <div class="popup-footnote">Current effective FEMA NFHL, shown in purple for reference.</div>
    `);
  },
});

const communityBoundaryLabels = L.layerGroup();
layers.communityBoundaries = L.esri.featureLayer({
  url: CENSUS_ZCTA_URL,
  where: "ZCTA5 IN ('70818','70739')",
  simplifyFactor: 0.35,
  precision: 5,
  style: {
    color: "#111827",
    dashArray: "9 5",
    weight: 3,
    opacity: 0.95,
    fillColor: "#ffffff",
    fillOpacity: 0.03,
  },
  onEachFeature(feature, layer) {
    const zip = String(feature?.properties?.ZCTA5 || feature?.properties?.BASENAME || "");
    const name = zip === "70818" ? "Central" : zip === "70739" ? "Greenwell Springs" : "Community";
    layer.bindPopup(`
      <div class="popup-title">${escapeHtml(name)}</div>
      <div>2020 Census ZIP Code Tabulation Area boundary.</div>
      <div class="popup-footnote">Source: U.S. Census Bureau TIGERweb.</div>
    `);
    layer.once("add", () => {
      const center = layer.getBounds().getCenter();
      L.marker(center, {
        interactive: false,
        icon: L.divIcon({
          className: "community-boundary-label",
          html: `<span>${escapeHtml(name)}</span>`,
          iconSize: null,
        }),
      }).addTo(communityBoundaryLabels);
    });
  },
});
layers.communityBoundaries.on("add", () => communityBoundaryLabels.addTo(map));
layers.communityBoundaries.on("remove", () => {
  map.removeLayer(communityBoundaryLabels);
  communityBoundaryLabels.clearLayers();
});

layers.highWaterMarks = L.layerGroup();

for (const layer of [layers.inundation, layers.firm2012, layers.livingstonFirm2012]) {
  loadPromises.push(
    new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      layer.once("load", finish);
      layer.once("requesterror", finish);
      window.setTimeout(finish, 8000);
    }),
  );
}

Promise.all(loadPromises).then(() => {
  document.getElementById("loadingBadge").classList.add("hidden");
});

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function firstValue(object, keys) {
  for (const key of keys) {
    const value = object?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function asList(payload, preferredKeys = []) {
  if (Array.isArray(payload)) return payload;
  for (const key of [...preferredKeys, "features", "events", "results", "items", "data", "value"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function setHwmStatus(message, kind = "") {
  const status = document.getElementById("hwmStatus");
  status.textContent = message;
  status.className = `layer-status ${kind}`.trim();
}

function highWaterMarkPopup(properties) {
  const p = properties || {};
  const rows = [];
  const addRow = (label, keys, suffix = "") => {
    const value = firstValue(p, keys);
    if (value !== null) rows.push(`<tr><td>${label}</td><td>${escapeHtml(value)}${suffix}</td></tr>`);
  };

  addRow("HWM ID", ["hwm_id", "hwmId", "HWM_ID", "id"]);
  addRow("County / parish", ["county", "county_name", "County"]);
  addRow("Nearest town", ["city", "municipality", "nearest_town", "site_name"]);
  addRow("Mark type", ["hwm_type", "hwmType", "HWM_TYPE"]);
  addRow("Quality", ["hwm_quality", "quality", "hwmQuality"]);
  addRow("Height above ground", ["height_above_gnd", "height_above_ground", "hwm_height"], " ft");
  addRow("Surveyed elevation", ["elev_ft", "elevation", "surveyed_elevation"], " ft");
  addRow("Survey date", ["survey_date", "surveyDate", "date_collected"]);

  return `
    <div class="popup-title">USGS August 2016 high-water mark</div>
    ${rows.length ? `<table class="popup-table">${rows.join("")}</table>` : "<div>Surveyed physical evidence of the flood peak.</div>"}
    <div class="popup-footnote">Source: USGS Short-Term Network / Flood Event Viewer.</div>
  `;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}

async function findAugust2016LouisianaEvent() {
  const payload = await fetchJson(`${STN_SERVICE_ROOT}/Events.json`);
  const events = asList(payload, ["events"]);

  const scored = events
    .map((event) => {
      const name = String(firstValue(event, ["event_name", "eventName", "name", "title"]) || "");
      const normalized = name.toLowerCase();
      let score = 0;
      const isLouisiana = normalized.includes("louisiana") || /\bla\b/.test(normalized);
      const isAugust = normalized.includes("august") || /\baug\b/.test(normalized);
      if (isLouisiana) score += 4;
      if (normalized.includes("2016")) score += 3;
      if (isAugust) score += 3;
      if (normalized.includes("flood")) score += 1;
      return { event, name, score };
    })
    .sort((a, b) => b.score - a.score);

  const match = scored.find((item) => item.score >= 10);
  if (!match) throw new Error("The August 2016 Louisiana event was not found in the USGS event catalog.");

  const eventId = firstValue(match.event, ["event_id", "eventId", "id"]);
  if (eventId === null) throw new Error("USGS returned the event without an event ID.");
  return { eventId, eventName: match.name };
}

async function ensureHighWaterMarks() {
  if (layerLoadState.highWaterMarks === "loaded") return;
  if (layerLoadState.highWaterMarks === "loading") {
    await new Promise((resolve, reject) => {
      const started = Date.now();
      const timer = window.setInterval(() => {
        if (layerLoadState.highWaterMarks === "loaded") {
          window.clearInterval(timer);
          resolve();
        } else if (layerLoadState.highWaterMarks === "error" || Date.now() - started > 15000) {
          window.clearInterval(timer);
          reject(new Error("High-water marks did not finish loading."));
        }
      }, 150);
    });
    return;
  }

  layerLoadState.highWaterMarks = "loading";
  setHwmStatus("Loading USGS high-water marks…", "loading");

  try {
    const { eventId, eventName } = await findAugust2016LouisianaEvent();
    const payload = await fetchJson(
      `${STN_SERVICE_ROOT}/Events/${encodeURIComponent(eventId)}/stateHWMs.geojson?State=LA`,
    );
    const features = asList(payload, ["features"]).filter((feature) => {
      const coordinates = feature?.geometry?.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length < 2) return false;
      const [longitude, latitude] = coordinates;
      return REGIONAL_BOUNDS.contains([latitude, longitude]);
    });

    if (!features.length) throw new Error("USGS returned no high-water marks inside the map region.");

    const geoJson = L.geoJSON(
      { type: "FeatureCollection", features },
      {
        pointToLayer(feature, latlng) {
          return L.circleMarker(latlng, {
            renderer: highWaterMarkRenderer,
            radius: 4.5,
            color: "#5b2b00",
            weight: 1.2,
            opacity: 0.95,
            fillColor: "#ffb000",
            fillOpacity: 0.88,
          });
        },
        onEachFeature(feature, layer) {
          layer.bindPopup(highWaterMarkPopup(feature.properties));
        },
      },
    );

    layers.highWaterMarks.clearLayers();
    layers.highWaterMarks.addLayer(geoJson);
    layerLoadState.highWaterMarks = "loaded";
    setHwmStatus(`${features.length} surveyed marks loaded from ${eventName}.`, "success");
  } catch (error) {
    layerLoadState.highWaterMarks = "error";
    setHwmStatus(`Could not load USGS marks: ${error.message}`, "error");
    throw error;
  }
}

async function loadDepthLegend() {
  if (layerLoadState.depthLegend === "loaded" || layerLoadState.depthLegend === "loading") return;
  layerLoadState.depthLegend = "loading";

  try {
    const payload = await fetchJson(`${DEPTH_SERVICE_URL}/legend?f=pjson`);
    const entries = payload?.layers?.flatMap((layer) => layer.legend || []) || [];
    const usable = entries.filter((entry) => entry.imageData);

    if (usable.length) {
      document.getElementById("depthLegendContent").innerHTML = `
        <div class="legend-items">
          ${usable
            .map(
              (entry) => `
                <div class="legend-item">
                  <img src="data:${escapeHtml(entry.contentType || "image/png")};base64,${entry.imageData}" alt="" />
                  <span>${escapeHtml(entry.label || "Depth class")}</span>
                </div>`,
            )
            .join("")}
        </div>
        <div class="legend-note">Feet above ground • published service symbology</div>
      `;
    }
    layerLoadState.depthLegend = "loaded";
  } catch (error) {
    layerLoadState.depthLegend = "error";
    // The embedded continuous ramp remains as a readable fallback.
  }
}

function syncDepthLegend() {
  const legend = document.getElementById("depthLegend");
  const visible = map.hasLayer(layers.depth);
  legend.classList.toggle("hidden", !visible);
  if (visible) loadDepthLegend();
}

async function setLayerVisibility(layerName, visible) {
  const layer = layers[layerName];
  if (!layer) return;

  if (visible && layerName === "highWaterMarks") {
    await ensureHighWaterMarks();
  }

  if (visible && !map.hasLayer(layer)) {
    layer.addTo(map);
  } else if (!visible && map.hasLayer(layer)) {
    map.removeLayer(layer);
  }

  syncDepthLegend();
}

function setLayerOpacity(layerName, opacity) {
  const layer = layers[layerName];
  if (!layer) return;

  if (typeof layer.setOpacity === "function") {
    layer.setOpacity(opacity);
    return;
  }

  if (typeof layer.setStyle === "function") {
    const edgeBoost =
      layerName === "fema" ? 0.6 :
      layerName === "firm2012" || layerName === "livingstonFirm2012" ? 0.5 :
      layerName === "communityBoundaries" ? 0.8 :
      0.38;
    layer.setStyle({
      fillOpacity: opacity,
      opacity: Math.min(1, opacity + edgeBoost),
    });
  }
}

document.querySelectorAll("[data-layer]").forEach((checkbox) => {
  checkbox.addEventListener("change", async (event) => {
    const target = event.target;
    target.disabled = true;
    try {
      await setLayerVisibility(target.dataset.layer, target.checked);
    } catch (error) {
      target.checked = false;
      await setLayerVisibility(target.dataset.layer, false);
    } finally {
      target.disabled = false;
    }
  });
});

document.querySelectorAll("[data-opacity]").forEach((slider) => {
  slider.addEventListener("input", (event) => {
    setLayerOpacity(event.target.dataset.opacity, Number(event.target.value));
  });
});

document.querySelectorAll("[data-basemap]").forEach((button) => {
  button.addEventListener("click", () => {
    const nextBasemap = basemaps[button.dataset.basemap];
    if (!nextBasemap || nextBasemap === activeBasemap) return;

    map.removeLayer(activeBasemap);
    activeBasemap = nextBasemap;
    activeBasemap.addTo(map);
    activeBasemap.bringToBack();

    document.querySelectorAll("[data-basemap]").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
  });
});

document.getElementById("resetButton").addEventListener("click", () => {
  map.flyTo(REGIONAL_VIEW.center, REGIONAL_VIEW.zoom, { duration: 0.7 });
});

document.getElementById("comparisonButton").addEventListener("click", async () => {
  const primaryLayers = ["inundation", "modeledExtent", "firm2012", "livingstonFirm2012"];
  const secondaryLayers = ["fema", "depth", "highWaterMarks", "communityBoundaries"];

  for (const name of primaryLayers) {
    await setLayerVisibility(name, true);
    const checkbox = document.querySelector(`[data-layer="${name}"]`);
    if (checkbox) checkbox.checked = true;
  }

  for (const name of secondaryLayers) {
    await setLayerVisibility(name, false);
    const checkbox = document.querySelector(`[data-layer="${name}"]`);
    if (checkbox) checkbox.checked = false;
  }

  map.flyTo(REGIONAL_VIEW.center, REGIONAL_VIEW.zoom, { duration: 0.7 });
});

const sidebar = document.getElementById("sidebar");
document.getElementById("sidebarToggle").addEventListener("click", () => {
  sidebar.classList.toggle("open");
  window.setTimeout(() => map.invalidateSize(), 240);
});

map.on("click", () => {
  if (window.matchMedia("(max-width: 820px)").matches) {
    sidebar.classList.remove("open");
  }
});

map.on("layeradd layerremove", syncDepthLegend);
window.addEventListener("resize", () => map.invalidateSize());