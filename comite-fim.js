/* global L, map, layers */

// USGS Flood Inundation Map library for the Amite/Comite Rivers at Central, LA.
// ScienceBase data release: https://doi.org/10.5066/P9PQKSYF
// Each published scenario combines an Amite River stage (first two digits)
// with a Comite River stage (last two digits). The five scenarios below were
// selected to give a clean progression around the Comite River near Comite
// (Joor Road) gage while preserving the paired-river nature of the USGS model.

const COMITE_FIM_WMS =
  "https://www.sciencebase.gov/catalogMaps/mapping/ows/5b28123ae4b0592076260622";

const COMITE_FIM_OPTIONS = {
  format: "image/png",
  transparent: true,
  version: "1.3.0",
  opacity: 0.58,
  attribution:
    "USGS Flood Inundation Mapping — Storm & Heal (2019), calibrated to March/August 2016 floods",
};

const COMITE_FIM_SCENARIOS = {
  comite27: {
    layer: "amcentLA_5027",
    comite: 27,
    amite: 50,
  },
  comite29: {
    layer: "amcentLA_5229",
    comite: 29,
    amite: 52,
  },
  comite31: {
    layer: "amcentLA_5531",
    comite: 31,
    amite: 55,
  },
  comite33: {
    layer: "amcentLA_5733",
    comite: 33,
    amite: 57,
  },
  comite35: {
    layer: "amcentLA_5935",
    comite: 35,
    amite: 59,
  },
};

for (const [key, scenario] of Object.entries(COMITE_FIM_SCENARIOS)) {
  layers[key] = L.tileLayer.wms(COMITE_FIM_WMS, {
    ...COMITE_FIM_OPTIONS,
    layers: scenario.layer,
  });

  layers[key].on("tileerror", () => {
    const status = document.getElementById("comiteFimStatus");
    if (status && !status.dataset.errorShown) {
      status.dataset.errorShown = "true";
      status.textContent =
        "A USGS scenario tile did not load. The source is a live ScienceBase WMS; try toggling the layer again or reloading the page.";
      status.className = "layer-status error";
    }
  });
}

const stageInputs = [...document.querySelectorAll('[data-comite-fim="true"]')];

for (const input of stageInputs) {
  input.addEventListener("change", () => {
    const status = document.getElementById("comiteFimStatus");
    if (!status) return;

    if (!input.checked) {
      if (!stageInputs.some((item) => item.checked)) {
        status.textContent = "Select a modeled stage to display the USGS inundation scenario.";
        status.className = "layer-status";
      }
      return;
    }

    const scenario = COMITE_FIM_SCENARIOS[input.dataset.layer];
    if (!scenario) return;

    status.textContent =
      `USGS modeled scenario: Comite ${scenario.comite} ft + Amite ${scenario.amite} ft. ` +
      "Because the rivers interact hydraulically, the official library models paired stages rather than Comite stage alone.";
    status.className = "layer-status success";

    // Bring the audience to the Central/Joor Road portion of the model.
    map.flyTo([30.535, -91.03], Math.max(map.getZoom(), 11), { duration: 0.65 });
  });
}
