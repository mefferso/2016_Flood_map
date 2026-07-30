/* global L */

const BATON_ROUGE_VIEW = {
  center: [30.48, -91.02],
  zoom: 10,
};

const RAINFALL_BOUNDS = L.latLngBounds(
  [28.6, -94.55],
  [33.45, -88.0],
);

const map = L.map("map", {
  center: BATON_ROUGE_VIEW.center,
  zoom: BATON_ROUGE_VIEW.zoom,
  zoomControl: false,
  preferCanvas: true,
});

map.createPane("meteorologyPane");
map.getPane("meteorologyPane").style.zIndex = 350;
map.getPane("meteorologyPane").style.pointerEvents = "none";

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
      '<div class="popup-title">Estimated August 2016 inundation</div>' +
        "<div>Compiled by East Baton Rouge GIS from emergency-response, damage-assessment, imagery, road-closure, FEMA, and public-report data.</div>",
    );
  },
}).addTo(map);

layers.firm2012 = L.esri.featureLayer({
  url: "https://services.maps.lsuagcenter.com/arcgis/rest/services/Floodmaps/EBR_EFF_DFIRM_20251127/MapServer/4",
  where: "SFHA_TF = 'T'",
  simplifyFactor: 0.45,
  precision: 5,
  style: {
    color: "#d72d2d",
    weight: 1.8,
    opacity: 0.98,
    fillColor: "#ef4444",
    fillOpacity: 0.48,
  },
  onEachFeature(feature, layer) {
    const p = feature.properties || {};
    const bfe = Number.isFinite(Number(p.STATIC_BFE))
      ? `${Number(p.STATIC_BFE).toFixed(1)} ft`
      : "Not listed";
    layer.bindPopup(`
      <div class="popup-title">Event-era 1% annual-chance floodplain</div>
      <table class="popup-table">
        <tr><td>Effective date</td><td>June 19, 2012</td></tr>
        <tr><td>Flood zone</td><td>${escapeHtml(p.FLD_ZONE || "Unknown")}</td></tr>
        <tr><td>Subtype</td><td>${escapeHtml(p.ZONE_SUBTY || "—")}</td></tr>
        <tr><td>Static BFE</td><td>${escapeHtml(bfe)}</td></tr>
      </table>
      <div style="margin-top:.35rem;color:#667784;font-size:.68rem;">This was the effective East Baton Rouge FIRM during the August 2016 flood.</div>
    `);
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
    fillOpacity: 0.28,
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
      <div style="margin-top:.35rem;color:#667784;font-size:.68rem;">Current effective FEMA NFHL, shown in purple for reference.</div>
    `);
  },
});

layers.depth = L.tileLayer(
  "https://tiles.arcgis.com/tiles/u5yHfzprqJwnv49V/arcgis/rest/services/August_2016_Flood_Depth_Feet/MapServer/tile/{z}/{y}/{x}",
  {
    minZoom: 11,
    maxZoom: 16,
    opacity: 0.66,
    attribution: "August 2016 modeled flood-depth raster via ArcGIS Online",
  },
);

layers.sentinel = L.tileLayer(
  "https://tiles.arcgis.com/tiles/njxlOVQKvDzk10uN/arcgis/rest/services/2016_Louisiana_Flood_Sentinel/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 15,
    opacity: 0.78,
    attribution: "Sentinel-2A imagery via USGS EarthExplorer / ArcGIS Online",
  },
);

layers.rainfall = L.imageOverlay(
  "https://www.weather.gov/images/lix/082016flood/__thumbs/RFC_Rainfall_2016_08_13_2day.jpg/RFC_Rainfall_2016_08_13_2day__800x600.jpg",
  RAINFALL_BOUNDS,
  {
    pane: "meteorologyPane",
    opacity: 0.7,
    interactive: false,
    alt: "NWS Lower Mississippi RFC two-day best-estimate rainfall ending August 13, 2016",
    attribution: "NWS Lower Mississippi River Forecast Center",
  },
);

layers.aep = L.imageOverlay(
  "https://www.weather.gov/images/lix/082016flood/__thumbs/RFC_Rainfall_AEP_2016_08_13_2day.jpg/RFC_Rainfall_AEP_2016_08_13_2day__800x600.jpg",
  RAINFALL_BOUNDS,
  {
    pane: "meteorologyPane",
    opacity: 0.72,
    interactive: false,
    alt: "NWS Lower Mississippi RFC annual exceedance probability for the two-day rainfall ending August 13, 2016",
    attribution: "NWS Lower Mississippi River Forecast Center",
  },
);

for (const layer of [layers.inundation, layers.firm2012]) {
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
      window.setTimeout(finish, 7000);
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

function setLayerVisibility(layerName, visible) {
  const layer = layers[layerName];
  if (!layer) return;

  if (visible && !map.hasLayer(layer)) {
    layer.addTo(map);
    if (layerName === "depth" && map.getZoom() < 11) {
      map.setZoom(11);
    }
  } else if (!visible && map.hasLayer(layer)) {
    map.removeLayer(layer);
  }
}

function setLayerOpacity(layerName, opacity) {
  const layer = layers[layerName];
  if (!layer) return;

  if (typeof layer.setOpacity === "function") {
    layer.setOpacity(opacity);
    return;
  }

  if (typeof layer.setStyle === "function") {
    const edgeBoost = layerName === "fema" ? 0.6 : layerName === "firm2012" ? 0.46 : 0.38;
    layer.setStyle({
      fillOpacity: opacity,
      opacity: Math.min(1, opacity + edgeBoost),
    });
  }
}

document.querySelectorAll("[data-layer]").forEach((checkbox) => {
  checkbox.addEventListener("change", (event) => {
    setLayerVisibility(event.target.dataset.layer, event.target.checked);
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
  map.flyTo(BATON_ROUGE_VIEW.center, BATON_ROUGE_VIEW.zoom, { duration: 0.7 });
});

document.getElementById("comparisonButton").addEventListener("click", () => {
  const primaryLayers = ["inundation", "firm2012"];
  const secondaryLayers = ["fema", "depth", "sentinel", "rainfall", "aep"];

  primaryLayers.forEach((name) => {
    setLayerVisibility(name, true);
    const checkbox = document.querySelector(`[data-layer="${name}"]`);
    if (checkbox) checkbox.checked = true;
  });

  secondaryLayers.forEach((name) => {
    setLayerVisibility(name, false);
    const checkbox = document.querySelector(`[data-layer="${name}"]`);
    if (checkbox) checkbox.checked = false;
  });

  map.flyTo(BATON_ROUGE_VIEW.center, BATON_ROUGE_VIEW.zoom, { duration: 0.7 });
});

document.getElementById("rainfallViewButton").addEventListener("click", () => {
  map.fitBounds(RAINFALL_BOUNDS, { padding: [20, 20], animate: true });
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

window.addEventListener("resize", () => map.invalidateSize());
