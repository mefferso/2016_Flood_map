/* global L, map, layers */

// USGS Flood Inundation Map library for the Amite/Comite Rivers at Central, LA.
// Source: USGS SIR 2019-5028 / ScienceBase data release 10.5066/P9PQKSYF.
//
// IMPORTANT: ScienceBase still advertises an old WMS URL for this release, but
// that endpoint currently returns 404. To make the presentation map reliable,
// these five scenarios are served locally as GeoJSON generated directly from
// the official USGS shapefiles in the data release.
//
// Scenario filenames encode Amite stage first and Comite stage second.

const COMITE_FIM_SCENARIOS = {
  comite27: { comite: 27, amite: 50, sourceName: "amcentLA_5027", file: "data/comite-fim/comite27.geojson" },
  comite29: { comite: 29, amite: 52, sourceName: "amcentLA_5229", file: "data/comite-fim/comite29.geojson" },
  comite31: { comite: 31, amite: 55, sourceName: "amcentLA_5531", file: "data/comite-fim/comite31.geojson" },
  comite33: { comite: 33, amite: 57, sourceName: "amcentLA_5733", file: "data/comite-fim/comite33.geojson" },
  comite35: { comite: 35, amite: 59, sourceName: "amcentLA_5935", file: "data/comite-fim/comite35.geojson" },
};

const COMITE_FIM_COLORS = {
  comite27: "#60a5fa",
  comite29: "#2585d8",
  comite31: "#1261a0",
  comite33: "#6d4bc3",
  comite35: "#b42375",
};

let comiteFimOpacity = 0.58;
const comiteLoadState = {};

function scenarioStyle(key) {
  const color = COMITE_FIM_COLORS[key] || "#1261a0";
  return {
    color,
    weight: 1.8,
    opacity: Math.min(1, comiteFimOpacity + 0.32),
    fillColor: color,
    fillOpacity: comiteFimOpacity,
  };
}

for (const key of Object.keys(COMITE_FIM_SCENARIOS)) {
  comiteLoadState[key] = "idle";
  layers[key] = L.geoJSON(null, {
    style: () => scenarioStyle(key),
    interactive: false,
  });
}

function setComiteStatus(message, kind = "") {
  const status = document.getElementById("comiteFimStatus");
  if (!status) return;
  status.textContent = message;
  status.className = `layer-status ${kind}`.trim();
}

function activeScenarioKeys() {
  return [...document.querySelectorAll('[data-comite-fim="true"]:checked')]
    .map((input) => input.dataset.layer)
    .filter((key) => COMITE_FIM_SCENARIOS[key]);
}

function updateComiteStatus() {
  const active = activeScenarioKeys();
  if (!active.length) {
    setComiteStatus("Select a modeled stage to display the USGS inundation scenario.");
    return;
  }

  const labels = active.map((key) => {
    const s = COMITE_FIM_SCENARIOS[key];
    return `Comite ${s.comite} ft + Amite ${s.amite} ft`;
  });

  setComiteStatus(
    `Showing USGS paired-stage scenario${labels.length > 1 ? "s" : ""}: ${labels.join("; ")}.`,
    "success",
  );
}

async function ensureComiteScenario(key) {
  const scenario = COMITE_FIM_SCENARIOS[key];
  if (!scenario) return;
  if (comiteLoadState[key] === "loaded") return;

  if (comiteLoadState[key] === "loading") {
    await new Promise((resolve, reject) => {
      const started = Date.now();
      const timer = window.setInterval(() => {
        if (comiteLoadState[key] === "loaded") {
          window.clearInterval(timer);
          resolve();
        } else if (comiteLoadState[key] === "error" || Date.now() - started > 20000) {
          window.clearInterval(timer);
          reject(new Error("Scenario did not finish loading."));
        }
      }, 100);
    });
    return;
  }

  comiteLoadState[key] = "loading";
  setComiteStatus(
    `Loading official USGS scenario: Comite ${scenario.comite} ft + Amite ${scenario.amite} ft…`,
    "loading",
  );

  try {
    const response = await fetch(scenario.file, { cache: "force-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const geojson = await response.json();
    layers[key].clearLayers();
    layers[key].addData(geojson);
    layers[key].setStyle(() => scenarioStyle(key));
    comiteLoadState[key] = "loaded";
  } catch (error) {
    comiteLoadState[key] = "error";
    throw new Error(
      `Could not load local USGS scenario ${scenario.sourceName}: ${error.message}`,
    );
  }
}

const stageInputs = [...document.querySelectorAll('[data-comite-fim="true"]')];

for (const input of stageInputs) {
  input.addEventListener("change", async () => {
    const key = input.dataset.layer;
    const scenario = COMITE_FIM_SCENARIOS[key];
    if (!scenario) return;

    if (!input.checked) {
      updateComiteStatus();
      return;
    }

    input.disabled = true;
    try {
      await ensureComiteScenario(key);
      // app.js normally adds the layer first; this also covers a direct call or race.
      if (!map.hasLayer(layers[key])) layers[key].addTo(map);
      updateComiteStatus();
      map.flyTo([30.535, -91.03], Math.max(map.getZoom(), 11), { duration: 0.65 });
    } catch (error) {
      input.checked = false;
      if (map.hasLayer(layers[key])) map.removeLayer(layers[key]);
      setComiteStatus(error.message, "error");
    } finally {
      input.disabled = false;
    }
  });
}

const opacityControl = document.getElementById("comiteFimOpacity");
if (opacityControl) {
  opacityControl.addEventListener("input", (event) => {
    comiteFimOpacity = Number(event.target.value);
    for (const key of Object.keys(COMITE_FIM_SCENARIOS)) {
      layers[key].setStyle(() => scenarioStyle(key));
    }
  });
}

function formatExposureCount(value) {
  return Number(value).toLocaleString("en-US");
}

function ensureExposureCountElements() {
  for (const input of stageInputs) {
    const copy = input.closest(".layer-row")?.querySelector(".layer-copy");
    if (!copy || copy.querySelector(".exposure-count")) continue;
    const count = document.createElement("span");
    count.className = "layer-source exposure-count";
    count.dataset.exposureKey = input.dataset.layer;
    count.textContent = "Residential exposure count loading…";
    copy.appendChild(count);
  }

  const panel = stageInputs[0]?.closest(".panel");
  if (panel && !panel.querySelector(".exposure-caveat")) {
    const caveat = document.createElement("p");
    caveat.className = "note exposure-caveat";
    caveat.innerHTML =
      "<strong>Structure-count note:</strong> Counts use FEMA USA Structures as a modern inventory and a representative point for each structure. They show <strong>present-day residential exposure</strong> inside each modeled footprint—not an official count of homes flooded in August 2016.";
    panel.appendChild(caveat);
  }
}

async function loadStructureExposureCounts() {
  ensureExposureCountElements();

  try {
    const response = await fetch("data/comite-fim/exposure_counts.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();

    for (const [key, scenario] of Object.entries(COMITE_FIM_SCENARIOS)) {
      const item = payload?.scenarios?.[String(scenario.comite)];
      const target = document.querySelector(`[data-exposure-key="${key}"]`);
      if (!item || !target) continue;

      const residential = formatExposureCount(item.residential_structures);
      const delta = item.residential_delta_vs_previous;
      const deltaText =
        delta === null || delta === undefined
          ? "baseline stage"
          : `${delta >= 0 ? "+" : ""}${formatExposureCount(delta)} vs prior stage`;

      target.innerHTML =
        `<strong>${residential}</strong> present-day residential structures in footprint · ${deltaText}`;

      const ebr = item.by_parish?.["22033"]?.residential_structures ?? 0;
      const liv = item.by_parish?.["22063"]?.residential_structures ?? 0;
      target.title =
        `Residential exposure — East Baton Rouge: ${formatExposureCount(ebr)}; ` +
        `Livingston: ${formatExposureCount(liv)}. All primary structures: ` +
        `${formatExposureCount(item.primary_structures)}.`;
    }
  } catch (error) {
    for (const el of document.querySelectorAll(".exposure-count")) {
      el.textContent = "Residential exposure count unavailable";
    }
    console.warn("Could not load Comite structure exposure counts:", error);
  }
}

loadStructureExposureCounts();
