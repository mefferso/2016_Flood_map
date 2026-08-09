#!/usr/bin/env python3
"""Count FEMA USA Structures inside the local USGS Comite/Amite inundation scenarios.

The count uses the FEMA structure latitude/longitude as a representative point and tests
that point against each official USGS modeled inundation polygon. This avoids counting a
building that only barely touches a modeled boundary.

Important: FEMA USA Structures is a modern inventory. These counts describe present-day
structure exposure to the modeled footprints, NOT an official count of homes flooded in 2016.
"""

from __future__ import annotations

import json
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import requests
from shapely.geometry import Point, shape
from shapely.ops import unary_union
from shapely.strtree import STRtree

REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = REPO_ROOT / "data" / "comite-fim"
OUTPUT = DATA_DIR / "exposure_counts.json"

FEMA_LAYER = (
    "https://services2.arcgis.com/FiaPA4ga0iQKduv3/ArcGIS/rest/services/"
    "USA_Structures_View/FeatureServer/0"
)
FIPS_NAMES = {
    "22033": "East Baton Rouge Parish",
    "22063": "Livingston Parish",
}
SCENARIOS = [27, 29, 31, 33, 35]
PAGE_SIZE = 2000


def request_json(url: str, params: dict, *, post: bool = False) -> dict:
    last_error = None
    for attempt in range(6):
        try:
            if post:
                response = requests.post(url, data=params, timeout=90)
            else:
                response = requests.get(url, params=params, timeout=90)
            response.raise_for_status()
            payload = response.json()
            if "error" in payload:
                raise RuntimeError(json.dumps(payload["error"], sort_keys=True))
            return payload
        except Exception as exc:  # network/API retries are intentional here
            last_error = exc
            if attempt == 5:
                break
            time.sleep(2 + attempt * 2)
    raise RuntimeError(f"ArcGIS request failed after retries: {last_error}")


def epoch_ms_to_iso(value):
    if value in (None, ""):
        return None
    try:
        return datetime.fromtimestamp(float(value) / 1000.0, tz=timezone.utc).isoformat()
    except Exception:
        return None


def load_scenario_geometry(stage: int):
    path = DATA_DIR / f"comite{stage}.geojson"
    payload = json.loads(path.read_text())
    geoms = [shape(feature["geometry"]) for feature in payload.get("features", []) if feature.get("geometry")]
    if not geoms:
        raise RuntimeError(f"No geometry found in {path}")
    geom = unary_union(geoms)
    if geom.is_empty:
        raise RuntimeError(f"Scenario geometry is empty: {path}")
    return geom


def load_fema_structures(bounds: tuple[float, float, float, float]) -> tuple[list[dict], dict]:
    metadata = request_json(FEMA_LAYER, {"f": "json"})
    where = "FIPS IN ('22033','22063')"
    minx, miny, maxx, maxy = bounds
    spatial_params = {
        "geometry": f"{minx},{miny},{maxx},{maxy}",
        "geometryType": "esriGeometryEnvelope",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
    }

    count_payload = request_json(
        f"{FEMA_LAYER}/query",
        {
            "f": "json",
            "where": where,
            "returnCountOnly": "true",
            **spatial_params,
        },
        post=True,
    )
    expected = int(count_payload.get("count", 0))
    print(
        "FEMA structures expected inside USGS-model bounding box "
        f"for EBR + Livingston: {expected:,}"
    )

    fields = "OBJECTID,FIPS,OCC_CLS,PRIM_OCC,OUTBLDG,LONGITUDE,LATITUDE"
    records: list[dict] = []
    offset = 0

    while True:
        payload = request_json(
            f"{FEMA_LAYER}/query",
            {
                "f": "json",
                "where": where,
                "outFields": fields,
                "returnGeometry": "false",
                "orderByFields": "OBJECTID",
                "resultOffset": str(offset),
                "resultRecordCount": str(PAGE_SIZE),
                **spatial_params,
            },
            post=True,
        )
        features = payload.get("features", [])
        if not features:
            break

        for feature in features:
            a = feature.get("attributes", {})
            try:
                lon = float(a.get("LONGITUDE"))
                lat = float(a.get("LATITUDE"))
            except (TypeError, ValueError):
                continue
            a["_lon"] = lon
            a["_lat"] = lat
            a["FIPS"] = str(a.get("FIPS") or "")
            records.append(a)

        offset += len(features)
        print(f"Fetched {offset:,} / {expected:,}")
        if len(features) < PAGE_SIZE or not payload.get("exceededTransferLimit", False):
            break

    if expected and len(records) < expected * 0.95:
        raise RuntimeError(
            f"Only retained {len(records):,} of {expected:,} expected FEMA structures; refusing to publish partial counts."
        )

    editing = metadata.get("editingInfo") or {}
    source_meta = {
        "service": FEMA_LAYER,
        "service_item_id": "0ec8512ad21e4bb987d7e848d14e7e24",
        "service_name": metadata.get("name"),
        "last_edit": epoch_ms_to_iso(editing.get("lastEditDate")),
        "record_count_in_model_bbox": len(records),
        "query_bounds_wgs84": [minx, miny, maxx, maxy],
    }
    return records, source_meta


def is_outbuilding(record: dict) -> bool:
    value = str(record.get("OUTBLDG") or "").strip().lower()
    return value in {"yes", "y", "true", "1", "outbuilding"}


def is_residential(record: dict) -> bool:
    occ = str(record.get("OCC_CLS") or "").strip().lower()
    prim = str(record.get("PRIM_OCC") or "").strip().lower()
    return "residential" in occ or "residential" in prim


def main() -> None:
    scenario_geometries = {stage: load_scenario_geometry(stage) for stage in SCENARIOS}
    model_union = unary_union(list(scenario_geometries.values()))
    records, fema_meta = load_fema_structures(model_union.bounds)

    occ_counts = Counter(str(r.get("OCC_CLS") or "(blank)") for r in records)
    prim_counts = Counter(str(r.get("PRIM_OCC") or "(blank)") for r in records)
    outbuilding_counts = Counter(str(r.get("OUTBLDG") or "(blank)") for r in records)
    print("OCC_CLS values:", dict(occ_counts.most_common()))
    print("Top PRIM_OCC values:", dict(prim_counts.most_common(25)))
    print("OUTBLDG values:", dict(outbuilding_counts.most_common()))

    points = [Point(r["_lon"], r["_lat"]) for r in records]
    tree = STRtree(points)

    result = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "method": (
            "FEMA USA Structures representative latitude/longitude point inside the official USGS paired-stage "
            "inundation polygon. Residential counts require OCC_CLS or PRIM_OCC to contain 'Residential' and "
            "exclude records marked as outbuildings."
        ),
        "important_caveat": (
            "FEMA USA Structures is a modern inventory, so these are present-day structure-exposure counts for "
            "the modeled footprints, not an official count of homes flooded in August 2016."
        ),
        "sources": {
            "fema_usa_structures": fema_meta,
            "usgs_fim": {
                "study": "USGS SIR 2019-5028",
                "data_release": "10.5066/P9PQKSYF",
            },
        },
        "classification_diagnostics": {
            "occ_cls": dict(occ_counts.most_common()),
            "outbuilding": dict(outbuilding_counts.most_common()),
        },
        "scenarios": {},
    }

    previous_residential_ids: set[int] | None = None
    previous_primary_ids: set[int] | None = None

    for stage in SCENARIOS:
        geom = scenario_geometries[stage]
        indices = tree.query(geom, predicate="intersects")
        matched = [records[int(i)] for i in indices]

        all_ids = {int(r["OBJECTID"]) for r in matched}
        primary = [r for r in matched if not is_outbuilding(r)]
        primary_ids = {int(r["OBJECTID"]) for r in primary}
        residential = [r for r in primary if is_residential(r)]
        residential_ids = {int(r["OBJECTID"]) for r in residential}

        by_parish = {}
        for fips, name in FIPS_NAMES.items():
            p_primary = [r for r in primary if r.get("FIPS") == fips]
            p_res = [r for r in residential if r.get("FIPS") == fips]
            by_parish[fips] = {
                "name": name,
                "primary_structures": len(p_primary),
                "residential_structures": len(p_res),
            }

        if previous_residential_ids is None:
            res_delta = None
            res_new = None
            res_dropped = None
            primary_delta = None
        else:
            res_delta = len(residential_ids) - len(previous_residential_ids)
            res_new = len(residential_ids - previous_residential_ids)
            res_dropped = len(previous_residential_ids - residential_ids)
            primary_delta = len(primary_ids) - len(previous_primary_ids or set())

        result["scenarios"][str(stage)] = {
            "comite_ft": stage,
            "all_structures": len(all_ids),
            "primary_structures": len(primary_ids),
            "residential_structures": len(residential_ids),
            "residential_delta_vs_previous": res_delta,
            "residential_new_vs_previous": res_new,
            "residential_dropped_vs_previous": res_dropped,
            "primary_delta_vs_previous": primary_delta,
            "by_parish": by_parish,
        }

        previous_residential_ids = residential_ids
        previous_primary_ids = primary_ids
        print(
            f"Comite {stage:>2} ft: {len(residential_ids):,} residential primary structures; "
            f"{len(primary_ids):,} all primary structures; {len(all_ids):,} including outbuildings"
        )

    OUTPUT.write_text(json.dumps(result, indent=2) + "\n")
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
