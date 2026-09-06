/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
Field Edition 0.6

Fitxer: App.jsx

Responsabilitats:
- Gestionar les xarxes carregades
- Gestionar els corriols seleccionats
- Gestionar el corriol actiu
- Gestionar l'estat dels corriols
- Gestionar la configuració del GIS
- Coordinar els components principals

----------------------------------------------------
*/

import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";

import { gpx } from "@mapbox/togeojson";
import * as turf from "@turf/turf";

import "./App.css";

import Toolbar from "./components/Toolbar";
import MapView from "./components/MapView";
import TrailStatusPanel from "./components/TrailStatusPanel";
import GISLayerPanel from "./components/GISLayerPanel";

import { parseSegment } from "./utils/segmentParser";
import {
  exportSelectedSegmentsToGPX,
  exportPredefinedRouteToGPX,
} from "./utils/gpxExporter";
import routes from "./data/routes";



function App() {

  // ==============================
  // Estat global
  // ==============================

  const [geojsonLayers, setGeojsonLayers] = useState([]);
  const [huntingAreasData, setHuntingAreasData] = useState(null);
  const [selectedSegments, setSelectedSegments] = useState([]);
  // ============================================================
// ROUTE BUILDER
// ============================================================

const [
  selectedRoute,
  setSelectedRoute,
] = useState([]);

const [routeStatus, setRouteStatus] = useState("building");

// ============================================================
// XARXA GPX — ROUTE BUILDER
// ============================================================

const [
  routeBuilderGeoJSON,
  setRouteBuilderGeoJSON,
] = useState(null);

// ============================================================
// RUTES PREDEFINIDES
// ============================================================

const [
  predefinedRouteGeoJSON,
  setPredefinedRouteGeoJSON,
] = useState(null);
const [
  predefinedRouteStats,
  setPredefinedRouteStats,
] = useState(null);

// ============================================================
// ROUTE BUILDER — CONTROLS
// ============================================================

function handleUndoLastRouteEdge() {

  setSelectedRoute(
    (previous) => {

      if (!previous.length) {
        return previous;
      }

      const removedEdge =
        previous[
          previous.length - 1
        ];

      console.log(
        "↩️ ÚLTIM TRAM ELIMINAT:",
        removedEdge.edgeId
      );

      return previous.slice(
        0,
        -1
      );

    }
  );

}

// ============================================================
// TORNAR A COMENÇAR
// ============================================================

function handleRestartRoute() {

  const confirmRestart =
    window.confirm(
      "Vols descartar aquesta ruta i començar-ne una de nova?"
    );

  if (!confirmRestart) {
    return;
  }

  console.log(
    "↩️ TORNANT A COMENÇAR — ruta descartada"
  );

  setSelectedRoute([]);

  setRouteStatus("building");

}

// ============================================================
// CONSTRUIR COORDENADES DEL TRACK
// ============================================================

function buildRouteCoordinates() {

  if (
    !selectedRoute?.length ||
    !routeBuilderGeoJSON?.features?.length
  ) {
    return [];
  }


  const coordinates = [];


  selectedRoute.forEach(
    (edge) => {

      const feature =
        routeBuilderGeoJSON.features.find(
          (item) =>
            item.properties?.edgeId ===
            edge.edgeId
        );


      if (!feature) {

        console.warn(
          "⚠️ Geometria no trobada per al GPX:",
          edge.edgeId
        );

        return;
      }


      const edgeCoordinates =
        feature.geometry?.coordinates;


      if (
        !edgeCoordinates?.length
      ) {
        return;
      }


      edgeCoordinates.forEach(
  (point) => {

    const lastPoint =
      coordinates[
        coordinates.length - 1
      ];

    if (
      !lastPoint ||
      lastPoint[0] !== point[0] ||
      lastPoint[1] !== point[1]
    ) {

      coordinates.push(
        point
      );

    }

  }
);

    }
  );

   

  return coordinates;

}

// ============================================================
// CONSTRUIR CONTINGUT GPX
// ============================================================

function buildGPXContent(
  coordinates,
  distance,
  ascent,
  descent
) {

  if (!coordinates?.length) {
    return "";
  }


  const trackPoints =
    coordinates
      .map(
        ([longitude, latitude]) =>
          `    <trkpt lat="${latitude}" lon="${longitude}"></trkpt>`
      )
      .join("\n");


  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx
  version="1.1"
  creator="Xarxa de Corriols d'Alàs i Cerc"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/1/1/gpx.xsd">

  <trk>
    <name>Track Xarxa de Corriols</name>
        <desc>
      ${distance.toFixed(2)} km |
      +${ascent.toFixed(0)} m |
      -${descent.toFixed(0)} m
    </desc>
    <trkseg>
${trackPoints}
    </trkseg>

  </trk>

</gpx>`;
}


// ============================================================
// INVERTIR RUTA COMPLETA
// ============================================================

function handleInvertRoute() {

  setSelectedRoute(
    (previous) => {

      if (
        !previous.length ||
        !routeBuilderGeoJSON
      ) {
        return previous;
      }


      console.log(
        "🔄 INVERTINT RUTA:",
        previous
      );


      // ======================================================
      // 1. INVERTIR L'ORDRE DELS TRAMS
      // ======================================================

      const reversedRoute =
        [
          ...previous
        ].reverse();


      // ======================================================
      // 2. CANVIAR FWD ↔ REV
      // ======================================================

      const invertedRoute =
        reversedRoute.map(
          (edge) => {

            let oppositeEdgeId;


            if (
              edge.edgeId.endsWith(
                "_REV"
              )
            ) {

              oppositeEdgeId =
                edge.edgeId.replace(
                  /_REV$/,
                  ""
                );

            } else {

              oppositeEdgeId =
                `${edge.edgeId}_REV`;

            }


            // ==================================================
            // BUSCAR L'EDGE CONTRÀRIA A LA XARXA
            // ==================================================

            const oppositeFeature =
              routeBuilderGeoJSON.features.find(
                (feature) =>
                  feature.properties?.edgeId ===
                  oppositeEdgeId
              );


            if (
              !oppositeFeature
            ) {

              console.warn(
                "⚠️ No s'ha trobat la direcció contrària:",
                {
                  edge:
                    edge.edgeId,

                  opposite:
                    oppositeEdgeId,
                }
              );

              return null;
            }


            return {
              ...oppositeFeature.properties,
            };

          }
        );


      // ======================================================
      // 3. COMPROVAR QUE TOTES LES EDGES
      //    TENEN LA SEVA CONTRÀRIA
      // ======================================================

      if (
        invertedRoute.some(
          (edge) =>
            !edge
        )
      ) {

        console.warn(
          "⚠️ No s'ha pogut invertir tota la ruta."
        );

        return previous;
      }


      console.log(
        "✅ RUTA INVERTIDA:",
        invertedRoute
      );


      return invertedRoute;

    }
  );

}

  const [activeTrail, setActiveTrail] = useState(null);

  // ==============================
// Mode de l'aplicació
// ==============================

const [appMode, setAppMode] = useState("user");

useEffect(() => {
  let mounted = true;

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (mounted) {
      setAppMode(session?.user ? "admin" : "user");
    }
  });

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setAppMode(session?.user ? "admin" : "user");
  });

  return () => {
    mounted = false;
    subscription.unsubscribe();
  };
}, []);

const [userTool, setUserTool] = useState("status");
const [statusFilter, setStatusFilter] = useState("all");
const [predefinedRouteDistance, setPredefinedRouteDistance] = useState(null);
const [selectedPredefinedRoute, setSelectedPredefinedRoute] = useState(null);
const [predefinedRouteInverted, setPredefinedRouteInverted] = useState(false);
const [expandedRouteDistance, setExpandedRouteDistance] = useState(null);
const [gpxImportPreview, setGpxImportPreview] = useState(null);
const [networkGraph, setNetworkGraph] = useState(null);
const [gpxImportResult, setGpxImportResult] = useState(null);
function getFeatureLines(geojson) {
  const lines = [];
  (geojson?.features ?? []).forEach((feature) => {
    const geometry = feature?.geometry;
    if (!geometry) return;
    if (geometry.type === "LineString" && geometry.coordinates?.length >= 2) lines.push(geometry.coordinates);
    if (geometry.type === "MultiLineString") geometry.coordinates?.forEach((line) => { if (line?.length >= 2) lines.push(line); });
  });
  return lines;
}

function getGPXEndpoints(geojson) {
  const lines = getFeatureLines(geojson);
  if (!lines.length) return null;
  return { start: lines[0][0], end: lines.at(-1).at(-1) };
}

// Calcula el desnivell directament de les cotes [lon, lat, ele]
// que @mapbox/togeojson conserva en la geometria del GPX.
function calculateGPXElevation(geojson) {
  let ascent = 0;
  let descent = 0;

  getFeatureLines(geojson).forEach((line) => {
    for (let i = 1; i < line.length; i += 1) {
      const previousEle = Number(line[i - 1]?.[2]);
      const currentEle = Number(line[i]?.[2]);
      if (!Number.isFinite(previousEle) || !Number.isFinite(currentEle)) continue;

      const delta = currentEle - previousEle;
      if (delta > 0) ascent += delta;
      if (delta < 0) descent += Math.abs(delta);
    }
  });

  return { ascent, descent };
}

function analyzeGPXImport(file, geojson) {
  const lines = getFeatureLines(geojson);
  const endpoints = getGPXEndpoints(geojson);
  if (!lines.length || !endpoints) {
    setGpxImportPreview({ error: "El GPX no conté cap traçat lineal vàlid.", fileName: file.name });
    return;
  }

  let distance = 0, ascent = 0, descent = 0;
  (geojson?.features ?? []).forEach((feature) => {
    const parsed = parseSegment(feature);
    distance += Number(parsed.distance) || 0;
    ascent += Number(parsed.ascent) || 0;
    descent += Number(parsed.descent) || 0;
  });

  // Els GPX nous poden no portar metadades de desnivell a properties.
  // En aquest cas, fem el càlcul sobre les cotes de la geometria.
  if (ascent === 0 && descent === 0) {
    const elevation = calculateGPXElevation(geojson);
    ascent = elevation.ascent;
    descent = elevation.descent;
  }

  if (distance === 0) {
    distance = lines.reduce(
      (sum, line) => sum + turf.length(turf.lineString(line), { units: "kilometers" }),
      0
    );
  }

  const network = geojsonLayers.find((layer) =>
    layer?.features?.some((feature) => feature?.properties?.type === "segment")
  ) ?? null;

  const nodeCandidates = new Map();
  const networkEdges = [];

  (network?.features ?? []).forEach((feature) => {
    const p = feature?.properties ?? {};
    const c = feature?.geometry?.coordinates;
    if (p.type !== "segment" || !Array.isArray(c) || c.length < 2) return;

    if (p.from && Array.isArray(c[0]) && !nodeCandidates.has(p.from)) {
      nodeCandidates.set(p.from, c[0]);
    }
    if (p.to && Array.isArray(c.at(-1)) && !nodeCandidates.has(p.to)) {
      nodeCandidates.set(p.to, c.at(-1));
    }

    // Per detectar connexions a l'interior només fem servir la direcció
    // forward i fragments de segments reals. Les arestes REV només són
    // la representació oposada de la mateixa geometria.
    if (p.direction !== "reverse" && p.edgeId && p.segment) {
      networkEdges.push({ feature, properties: p, coordinates: c });
    }
  });

  function nearestNodeStatus(coordinate) {
    let best = null;
    const point = turf.point(coordinate);

    nodeCandidates.forEach((nodeCoordinate, nodeId) => {
      const distanceM = turf.distance(
        point,
        turf.point(nodeCoordinate),
        { units: "kilometers" }
      ) * 1000;
      if (!best || distanceM < best.distanceM) {
        best = { nodeId, distanceM };
      }
    });

    if (best && best.distanceM <= 20) {
      return {
        kind: "node",
        label: `Node existent ${best.nodeId}`,
        nodeId: best.nodeId,
        distanceM: best.distanceM,
      };
    }

    // Si no hi ha node a menys de 20 m, comprovem si el punt cau sobre
    // l'interior d'una aresta existent. La tolerància de 20 m només és una
    // tolerància de detecció; la posició calculada és la projecció real.
    let bestEdge = null;
    networkEdges.forEach(({ properties, coordinates }) => {
      if (coordinates.length < 2) return;

      const line = turf.lineString(coordinates);
      const snapped = turf.nearestPointOnLine(line, point, { units: "kilometers" });
      const distanceM = turf.distance(
        point,
        snapped,
        { units: "kilometers" }
      ) * 1000;

      const lineLengthKm = turf.length(line, { units: "kilometers" });
      const locationKm = Number(snapped.properties?.location) || 0;
      const fraction = lineLengthKm > 0 ? Math.max(0, Math.min(1, locationKm / lineLengthKm)) : 0;
      const positionStart = Number(properties.positionStart);
      const positionEnd = Number(properties.positionEnd);
      const globalPosition = Number.isFinite(positionStart) && Number.isFinite(positionEnd)
        ? positionStart + (positionEnd - positionStart) * fraction
        : null;

      // No considerem una connexió interior si la projecció coincideix amb
      // l'extrem de l'aresta: aquest cas ja hauria de quedar resolt com a node.
      const isInterior = fraction > 0.02 && fraction < 0.98;
      if (distanceM <= 20 && isInterior && (!bestEdge || distanceM < bestEdge.distanceM)) {
        bestEdge = {
          kind: "interior",
          label: `Connexió interior amb ${properties.edgeId}`,
          nodeId: null,
          distanceM,
          edgeId: properties.edgeId,
          segment: properties.segment,
          position: globalPosition,
          fraction,
          snappedCoordinate: snapped.geometry.coordinates,
          from: properties.from,
          to: properties.to,
        };
      }
    });

    if (bestEdge) return bestEdge;

    return {
      kind: "terminal",
      label: "Terminal natural nou",
      nodeId: null,
      distanceM: best?.distanceM ?? null,
    };
  }

  const start = nearestNodeStatus(endpoints.start);
  const end = nearestNodeStatus(endpoints.end);

  const existingSegments = new Map();
  (network?.features ?? []).forEach((feature) => {
    const p = feature?.properties ?? {};
    if (p.type !== "segment" || !p.segment || p.direction === "reverse") return;
    if (!existingSegments.has(p.segment)) {
      existingSegments.set(p.segment, { distance: 0, start: null, end: null });
    }
    const item = existingSegments.get(p.segment);
    item.distance += Number(p.distance_km) || 0;
    if (Number(p.positionStart) === 0) item.start = feature.geometry.coordinates[0];
    if (Number(p.positionEnd) === 1) item.end = feature.geometry.coordinates.at(-1);
  });

  let duplicate = null;
  for (const [segmentName, item] of existingSegments) {
    const sameName = segmentName.toLowerCase() === file.name.toLowerCase();
    let endpointsClose = false;
    if (item.start && item.end) {
      const ds = turf.distance(
        turf.point(endpoints.start),
        turf.point(item.start),
        { units: "kilometers" }
      ) * 1000;
      const de = turf.distance(
        turf.point(endpoints.end),
        turf.point(item.end),
        { units: "kilometers" }
      ) * 1000;
      endpointsClose = ds <= 20 && de <= 20;
    }
    const lengthClose = distance > 0 &&
      Math.abs(item.distance - distance) <= Math.max(0.01, distance * 0.02);
    if (sameName || (lengthClose && endpointsClose)) {
      duplicate = {
        segmentName,
        reason: sameName ? "mateix nom de segment" : "traçat i longitud pràcticament coincidents"
      };
      break;
    }
  }

  const actions = ["+ 1 segment nou"];
  let canIncorporate = true;

  if (start.kind === "terminal") {
    actions.push("+ 1 terminal a l'inici");
  } else if (start.kind === "interior") {
    actions.push(`crear node nou a l'interior de ${start.edgeId}`);
    actions.push(`partir ${start.edgeId} en dues arestes direccionals`);
  } else {
    actions.push(`connectar inici amb ${start.nodeId}`);
  }

  if (end.kind === "terminal") {
    actions.push("+ 1 terminal al final");
  } else if (end.kind === "interior") {
    actions.push(`crear node nou a l'interior de ${end.edgeId}`);
    actions.push(`partir ${end.edgeId} en dues arestes direccionals`);
  } else {
    actions.push(`connectar final amb ${end.nodeId}`);
  }

  actions.push(start.kind === "interior" ? "+ 2 arestes direccionals del segment existent (després de partir-lo)" : "connectar inici amb una aresta nova");
  if (end.kind === "interior") actions.push("+ 2 arestes direccionals del segment existent (després de partir-lo)");
  actions.push("+ 2 arestes direccionals del segment GPX nou");
  canIncorporate = true;

  setGpxImportPreview({
    fileName: file.name,
    distance,
    ascent: Math.round(ascent),
    descent: Math.round(descent),
    start,
    end,
    duplicate,
    actions,
    geojson,
    canIncorporate,
  });
}

async function handleGPXImportPreview(file) {
  try {
    const text = await file.text();
    const xml = new DOMParser().parseFromString(text, "text/xml");
    analyzeGPXImport(file, gpx(xml));
  } catch (error) {
    console.error("Error analitzant GPX:", error);
    setGpxImportPreview({ error: "No s'ha pogut analitzar el GPX.", fileName: file.name });
  }
}

function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function incorporateGPXImport() {
  if (!gpxImportPreview || gpxImportPreview.error || gpxImportPreview.duplicate) return;
  if (!networkGraph || !routeBuilderGeoJSON) {
    setGpxImportPreview((previous) => ({ ...previous, importError: "La xarxa o el graf encara no estan carregats." }));
    return;
  }

  const segmentName = gpxImportPreview.fileName;
  const sourceLines = getFeatureLines(gpxImportPreview.geojson);
  const sourceCoords = sourceLines[0];
  if (!sourceCoords?.length) return;

  const updatedGeoJSON = JSON.parse(JSON.stringify(routeBuilderGeoJSON));
  const updatedGraph = JSON.parse(JSON.stringify(networkGraph));

  const safeIdPart = String(segmentName).replace(/[^A-Za-z0-9_-]/g, "_");
  const nodeIdFor = (endpoint, side) => {
    if (endpoint.kind === "node" && endpoint.nodeId) return endpoint.nodeId;
    if (endpoint.kind === "interior" && endpoint.position != null) {
      return `NODE_IMPORT_${safeIdPart}_${side}_${Math.round(endpoint.position * 1000000)}`;
    }
    return `TERMINAL_${segmentName}_${side}`;
  };

  const startNodeId = nodeIdFor(gpxImportPreview.start, "start");
  const endNodeId = nodeIdFor(gpxImportPreview.end, "end");

  const pointAt = (coordinate) => ({
    lat: coordinate[1],
    lon: coordinate[0],
    ...(Number.isFinite(coordinate[2]) ? { elevation: coordinate[2] } : {}),
  });

  const ensureNode = (nodeId, coordinate, type, terminalType = null, side = null) => {
    if (updatedGraph.nodes.some((node) => node.id === nodeId)) return;
    const node = { id: nodeId, type, point: pointAt(coordinate) };
    if (type === "terminal") {
      Object.assign(node, { terminalType, name: null, segment: segmentName, side });
    } else {
      node.source = "imported-gpx-interior-connection";
    }
    updatedGraph.nodes.push(node);
  };

  // Intersections with existing edges are snapped to the actual projected point
  // so the updated network has no 6–7 m geometric gap at the new junction.
  const networkEndpoint = (endpoint, rawCoordinate) =>
    endpoint.kind === "interior" && Array.isArray(endpoint.snappedCoordinate)
      ? endpoint.snappedCoordinate
      : rawCoordinate;

  const startCoordinate = networkEndpoint(gpxImportPreview.start, sourceCoords[0]);
  const endCoordinate = networkEndpoint(gpxImportPreview.end, sourceCoords.at(-1));

  if (gpxImportPreview.start.kind === "interior") {
    ensureNode(startNodeId, startCoordinate, "real-node");
  } else if (gpxImportPreview.start.kind === "terminal") {
    ensureNode(startNodeId, sourceCoords[0], "terminal", "natural", "start");
  }

  if (gpxImportPreview.end.kind === "interior") {
    ensureNode(endNodeId, endCoordinate, "real-node");
  } else if (gpxImportPreview.end.kind === "terminal") {
    ensureNode(endNodeId, sourceCoords.at(-1), "terminal", "natural", "end");
  }

  // ------------------------------------------------------------
  // Helpers per partir una aresta existent en un node interior.
  // ------------------------------------------------------------
  const splitLineAtFraction = (coordinates, fraction) => {
    if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
    const cleanFraction = Math.max(0, Math.min(1, Number(fraction) || 0));
    if (cleanFraction <= 0 || cleanFraction >= 1) return null;

    const totalKm = turf.length(turf.lineString(coordinates), { units: "kilometers" });
    const targetKm = totalKm * cleanFraction;
    let walkedKm = 0;
    const first = [coordinates[0]];
    const second = [];
    let splitCoordinate = coordinates[0];

    for (let i = 1; i < coordinates.length; i += 1) {
      const a = coordinates[i - 1];
      const b = coordinates[i];
      const legKm = turf.distance(turf.point(a), turf.point(b), { units: "kilometers" });

      if (walkedKm + legKm >= targetKm) {
        const legFraction = legKm > 0 ? (targetKm - walkedKm) / legKm : 0;
        const lon = a[0] + (b[0] - a[0]) * legFraction;
        const lat = a[1] + (b[1] - a[1]) * legFraction;
        const hasElevation = Number.isFinite(Number(a[2])) && Number.isFinite(Number(b[2]));
        const ele = hasElevation ? Number(a[2]) + (Number(b[2]) - Number(a[2])) * legFraction : undefined;
        splitCoordinate = hasElevation ? [lon, lat, ele] : [lon, lat];
        first.push(splitCoordinate);
        second.push(splitCoordinate, ...coordinates.slice(i));
        break;
      }

      walkedKm += legKm;
      first.push(b);
    }

    if (!second.length) return null;
    return { first, second, splitCoordinate };
  };

  const elevationStats = (coordinates) => {
    let ascent = 0;
    let descent = 0;
    for (let i = 1; i < coordinates.length; i += 1) {
      const a = Number(coordinates[i - 1]?.[2]);
      const b = Number(coordinates[i]?.[2]);
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      const d = b - a;
      if (d > 0) ascent += d;
      if (d < 0) descent += Math.abs(d);
    }
    return { ascent, descent };
  };

  const makeEdgeProperties = (base, edgeId, from, to, positionStart, positionEnd, coordinates, direction) => {
    const distanceKm = turf.length(turf.lineString(coordinates), { units: "kilometers" });
    const elev = elevationStats(coordinates);
    const forward = direction === "forward";
    return {
      ...base,
      edgeId,
      from,
      to,
      positionStart,
      positionEnd,
      distance_km: Number(distanceKm.toFixed(3)),
      ascent_m: Number((forward ? elev.ascent : elev.descent).toFixed(1)),
      descent_m: Number((forward ? elev.descent : elev.ascent).toFixed(1)),
      direction,
      bidirectional: true,
    };
  };

  const replaceAdjacencyEdge = (nodeId, oldIds, newEntries) => {
    const current = updatedGraph.adjacency[nodeId] || [];
    updatedGraph.adjacency[nodeId] = [
      ...current.filter((entry) => !oldIds.includes(entry.edgeId)),
      ...newEntries,
    ];
  };

  const splitExistingEdge = (endpoint, newNodeId) => {
    if (endpoint.kind !== "interior" || !endpoint.edgeId) return null;

    const oldEdgeId = endpoint.edgeId;
    const oldRevId = `${oldEdgeId}_REV`;
    const oldFeature = updatedGeoJSON.features.find((feature) => feature?.properties?.edgeId === oldEdgeId);
    const oldRevFeature = updatedGeoJSON.features.find((feature) => feature?.properties?.edgeId === oldRevId);
    if (!oldFeature || !oldRevFeature) {
      throw new Error(`No s'ha trobat la geometria de ${oldEdgeId} o la seva inversa.`);
    }

    const split = splitLineAtFraction(oldFeature.geometry.coordinates, endpoint.fraction);
    if (!split) throw new Error(`No s'ha pogut partir ${oldEdgeId}.`);

    const old = oldFeature.properties;
    const oldStart = Number(old.positionStart);
    const oldEnd = Number(old.positionEnd);
    const midPosition = Number(endpoint.position);
    const suffixA = `${oldEdgeId}_A`;
    const suffixB = `${oldEdgeId}_B`;

    const base = { ...old };
    delete base.edgeId;
    delete base.from;
    delete base.to;
    delete base.positionStart;
    delete base.positionEnd;
    delete base.distance_km;
    delete base.ascent_m;
    delete base.descent_m;
    delete base.direction;

    const forwardA = makeEdgeProperties(base, suffixA, old.from, newNodeId, oldStart, midPosition, split.first, "forward");
    const forwardB = makeEdgeProperties(base, suffixB, newNodeId, old.to, midPosition, oldEnd, split.second, "forward");
    const reverseA = makeEdgeProperties(base, `${suffixA}_REV`, newNodeId, old.from, midPosition, oldStart, [...split.first].reverse(), "reverse");
    const reverseB = makeEdgeProperties(base, `${suffixB}_REV`, old.to, newNodeId, oldEnd, midPosition, [...split.second].reverse(), "reverse");

    updatedGeoJSON.features = updatedGeoJSON.features.filter((feature) => {
      const id = feature?.properties?.edgeId;
      return id !== oldEdgeId && id !== oldRevId;
    });
    updatedGeoJSON.features.push(
      { type: "Feature", properties: forwardA, geometry: { type: "LineString", coordinates: split.first } },
      { type: "Feature", properties: forwardB, geometry: { type: "LineString", coordinates: split.second } },
      { type: "Feature", properties: reverseA, geometry: { type: "LineString", coordinates: [...split.first].reverse() } },
      { type: "Feature", properties: reverseB, geometry: { type: "LineString", coordinates: [...split.second].reverse() } },
    );

    updatedGraph.edges = updatedGraph.edges.filter((edge) => edge.id !== oldEdgeId && edge.id !== oldRevId);
    updatedGraph.edges.push(
      { ...forwardA, id: suffixA },
      { ...forwardB, id: suffixB },
      { ...reverseA, id: `${suffixA}_REV` },
      { ...reverseB, id: `${suffixB}_REV` },
    );

    replaceAdjacencyEdge(old.from, [oldEdgeId], [{
      edgeId: suffixA, to: newNodeId, type: "segment", direction: "forward", segment: old.segment,
      distance_km: forwardA.distance_km, ascent_m: forwardA.ascent_m, descent_m: forwardA.descent_m,
    }]);
    replaceAdjacencyEdge(old.to, [oldRevId], [{
      edgeId: `${suffixB}_REV`, to: newNodeId, type: "segment", direction: "reverse", segment: old.segment,
      distance_km: reverseB.distance_km, ascent_m: reverseB.ascent_m, descent_m: reverseB.descent_m,
    }]);
    replaceAdjacencyEdge(newNodeId, [], [
      { edgeId: `${suffixA}_REV`, to: old.from, type: "segment", direction: "reverse", segment: old.segment, distance_km: reverseA.distance_km, ascent_m: reverseA.ascent_m, descent_m: reverseA.descent_m },
      { edgeId: suffixB, to: old.to, type: "segment", direction: "forward", segment: old.segment, distance_km: forwardB.distance_km, ascent_m: forwardB.ascent_m, descent_m: forwardB.descent_m },
    ]);

    return {
      oldEdgeId,
      newEdgeIds: [suffixA, suffixB, `${suffixA}_REV`, `${suffixB}_REV`],
      oldFrom: old.from,
      oldTo: old.to,
      oldStart,
      oldEnd,
      midPosition,
      splitCoordinate: split.splitCoordinate,
    };
  };

  const splitResults = [];
  if (gpxImportPreview.start.kind === "interior") {
    splitResults.push(splitExistingEdge(gpxImportPreview.start, startNodeId));
  }
  if (gpxImportPreview.end.kind === "interior") {
    splitResults.push(splitExistingEdge(gpxImportPreview.end, endNodeId));
  }

  // El nou segment entra a la xarxa amb els extrems ajustats als nodes de
  // connexió interior. El GPX original continua intacte com a fitxer d'origen.
  const newCoords = sourceCoords.map((coordinate, index) => {
    if (index === 0) return startCoordinate;
    if (index === sourceCoords.length - 1) return endCoordinate;
    return coordinate;
  });

  const baseEdgeId = `EDGE_${segmentName}_1`;
  const forwardFeature = {
    type: "Feature",
    properties: {
      edgeId: baseEdgeId,
      type: "segment",
      segment: segmentName,
      from: startNodeId,
      to: endNodeId,
      positionStart: 0,
      positionEnd: 1,
      distance_km: Number(gpxImportPreview.distance.toFixed(3)),
      ascent_m: Number(gpxImportPreview.ascent),
      descent_m: Number(gpxImportPreview.descent),
      direction: "forward",
      bidirectional: true,
    },
    geometry: { type: "LineString", coordinates: newCoords },
  };
  const reverseFeature = {
    type: "Feature",
    properties: {
      ...forwardFeature.properties,
      edgeId: `${baseEdgeId}_REV`,
      from: endNodeId,
      to: startNodeId,
      positionStart: 1,
      positionEnd: 0,
      ascent_m: Number(gpxImportPreview.descent),
      descent_m: Number(gpxImportPreview.ascent),
      direction: "reverse",
    },
    geometry: { type: "LineString", coordinates: [...newCoords].reverse() },
  };
  updatedGeoJSON.features.push(forwardFeature, reverseFeature);

  const segmentRecord = updatedGraph.segments.find((segment) => segment.id === segmentName);
  if (segmentRecord) throw new Error(`El segment ${segmentName} ja existeix al graf.`);
  updatedGraph.segments.push({
    id: segmentName,
    distance_km: Number(gpxImportPreview.distance.toFixed(3)),
    ascent_m: Number(gpxImportPreview.ascent),
    descent_m: Number(gpxImportPreview.descent),
    start: pointAt(startCoordinate),
    end: pointAt(endCoordinate),
    nodePath: [
      { nodeId: startNodeId, position: 0 },
      { nodeId: endNodeId, position: 1 },
    ],
    occurrenceCount: 2,
    edgeCount: 1,
    junctionCount: 0,
    bidirectional: true,
  });
  updatedGraph.edges.push(
    { ...forwardFeature.properties, id: baseEdgeId },
    { ...reverseFeature.properties, id: `${baseEdgeId}_REV` },
  );
  updatedGraph.adjacency[startNodeId] = [...(updatedGraph.adjacency[startNodeId] || []), {
    edgeId: baseEdgeId, to: endNodeId, type: "segment", direction: "forward", segment: segmentName,
    distance_km: forwardFeature.properties.distance_km, ascent_m: forwardFeature.properties.ascent_m, descent_m: forwardFeature.properties.descent_m,
  }];
  updatedGraph.adjacency[endNodeId] = [...(updatedGraph.adjacency[endNodeId] || []), {
    edgeId: `${baseEdgeId}_REV`, to: startNodeId, type: "segment", direction: "reverse", segment: segmentName,
    distance_km: reverseFeature.properties.distance_km, ascent_m: reverseFeature.properties.ascent_m, descent_m: reverseFeature.properties.descent_m,
  }];

  // Actualitzem el nodePath del segment existent quan hi hem inserit nodes.
  const importedPositions = splitResults.filter(Boolean).map((result) => ({
    nodeId: result.oldEdgeId === gpxImportPreview.start.edgeId ? startNodeId : endNodeId,
    position: result.midPosition,
  }));
  const existingSegment = updatedGraph.segments.find((segment) => segment.id === gpxImportPreview.start.segment || segment.id === gpxImportPreview.end.segment);
  if (existingSegment && importedPositions.length) {
    existingSegment.nodePath = [...existingSegment.nodePath, ...importedPositions]
      .sort((a, b) => Number(a.position) - Number(b.position));
    existingSegment.occurrenceCount = existingSegment.nodePath.length;
    existingSegment.edgeCount += importedPositions.length;
  }

  updatedGraph.segmentCount += 1;
  updatedGraph.nodeCount = updatedGraph.nodes.length;
  updatedGraph.edgeCount = updatedGraph.edges.length;
  updatedGraph.segmentEdgeCount = updatedGraph.edges.filter((edge) => edge.type === "segment").length;
  updatedGraph.junctionEdgeCount = updatedGraph.edges.filter((edge) => edge.type === "junction").length;
  updatedGraph.realNodeCount = updatedGraph.nodes.filter((node) => node.type === "real-node").length;
  updatedGraph.terminalCount = updatedGraph.nodes.filter((node) => node.type === "terminal").length;
  updatedGraph.terminalIds = updatedGraph.nodes.filter((node) => node.type === "terminal").map((node) => node.id);
  updatedGraph.generatedAt = new Date().toISOString();

  setRouteBuilderGeoJSON(updatedGeoJSON);
  setGeojsonLayers([updatedGeoJSON]);
  setNetworkGraph(updatedGraph);
  setMapVersion((previous) => previous + 1);
  setGpxImportResult({ segmentName, baseEdgeId, startNodeId, endNodeId, geojson: updatedGeoJSON, graph: updatedGraph });
  setGpxImportPreview((previous) => ({ ...previous, incorporated: true, canIncorporate: true }));
  saveNetworkState(updatedGeoJSON, updatedGraph);
}

async function saveNetworkState(network_gpx, network_graph) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error(
        "No hi ha una sessió d'administrador activa."
      );
    }

    const response = await fetch(
      "/.netlify/functions/save-network",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          network_gpx,
          network_graph,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error ||
          `Error guardant la xarxa: ${response.status}`
      );
    }

    console.log(
      "✅ Xarxa guardada correctament a Supabase:",
      result
    );

    return true;
  } catch (error) {
    console.error(
      "❌ Error guardant automàticament la xarxa:",
      error
    );

    alert(
      "⚠️ La xarxa s'ha actualitzat en pantalla però no s'ha pogut guardar al servidor."
    );

    return false;
  }
}

function changeStatusFilter(filter) {
  setStatusFilter(filter);
  setSelectedSegments([]);
  setActiveTrail(null);
}
function changeUserTool(tool) {
  setUserTool(tool);
  setSelectedSegments([]);
  setActiveTrail(null);

  
  if (tool === "route") {
    setStatusFilter("all");
  }
}

function calculatePredefinedRouteStats(geojson) {
  let ascent = 0;
  let descent = 0;

  function processCoordinates(coordinates) {
    for (let i = 1; i < coordinates.length; i++) {
      const previousElevation = coordinates[i - 1][2];
      const currentElevation = coordinates[i][2];

      if (
        typeof previousElevation !== "number" ||
        typeof currentElevation !== "number"
      ) {
        continue;
      }

      const difference =
        currentElevation - previousElevation;

      if (difference > 0) {
        ascent += difference;
      }

      if (difference < 0) {
        descent += Math.abs(difference);
      }
    }
  }

  geojson.features?.forEach((feature) => {
    const geometry = feature.geometry;

    if (!geometry) {
      return;
    }

    if (geometry.type === "LineString") {
      processCoordinates(
        geometry.coordinates
      );
    }

    if (geometry.type === "MultiLineString") {
      geometry.coordinates.forEach(
        (line) => {
          processCoordinates(line);
        }
      );
    }
  });

  return {
    ascent: Math.round(ascent),
    descent: Math.round(descent),
  };
}

function invertPredefinedRouteGeoJSON(geojson) {
  if (!geojson) {
    return null;
  }

  const inverted = {
    ...geojson,
    features: geojson.features.map((feature) => {
      const geometry = feature.geometry;

      if (!geometry) {
        return feature;
      }

      if (geometry.type === "LineString") {
        return {
          ...feature,
          geometry: {
            ...geometry,
            coordinates: [
              ...geometry.coordinates,
            ].reverse(),
          },
        };
      }

      if (geometry.type === "MultiLineString") {
        return {
          ...feature,
          geometry: {
            ...geometry,
            coordinates: geometry.coordinates.map(
              (line) => [...line].reverse()
            ),
          },
        };
      }

      return feature;
    }),
  };

  return inverted;
}

function handleInvertPredefinedRoute() {
  if (!predefinedRouteGeoJSON) {
    return;
  }

  const inverted =
    invertPredefinedRouteGeoJSON(
      predefinedRouteGeoJSON
    );

  if (!inverted) {
    return;
  }

  const stats =
    calculatePredefinedRouteStats(
      inverted
    );

  setPredefinedRouteGeoJSON(
    inverted
  );

  setPredefinedRouteStats(
    stats
  );

  setPredefinedRouteInverted(
    (previous) => !previous
  );
}

async function handlePredefinedRouteSelect(route) {
  try {
    setSelectedPredefinedRoute(route);
    setPredefinedRouteInverted(false);
    setPredefinedRouteDistance(
      route.distance
    );

    setPredefinedRouteStats(null);

    const response = await fetch(route.gpx);

    if (!response.ok) {
      throw new Error(
        `No s'ha pogut carregar la ruta: ${response.status}`
      );
    }

    const text = await response.text();

    const parser =
      new DOMParser();

    const xml =
      parser.parseFromString(
        text,
        "text/xml"
      );

    const geojson =
      gpx(xml);

      const stats =
  calculatePredefinedRouteStats(
    geojson
  );

    setPredefinedRouteStats(stats);

    setPredefinedRouteGeoJSON(
      geojson
    );

  } catch (error) {

    console.error(
      "Error carregant ruta predefinida:",
      error
    );

    setPredefinedRouteGeoJSON(
      null
    );

    alert(
      "No s'ha pogut carregar la ruta predefinida."
    );
  }
}

function clearSelectedSegments() {
  setSelectedSegments([]);
  setActiveTrail(null);
}
  const [trailStatus, setTrailStatus] = useState(() => {
    const saved = localStorage.getItem("trailStatus");
    return saved ? JSON.parse(saved) : {};
  });

  // ==============================
  // Guardar automàticament els estats
  // ==============================

  useEffect(() => {
    localStorage.setItem(
      "trailStatus",
      JSON.stringify(trailStatus)
    );
  }, [trailStatus]);

// ==============================
// Versió del mapa
// ==============================

 const [mapVersion, setMapVersion] = useState(0);

  // ==============================
  // Configuració del GIS
  // ==============================

  const [gisLayers, setGisLayers] = useState({

    baseMap: "esri",

    trails: true,

    trailStatus: true,

    cadastre: false,

    huntingAreas: false,

    ortofoto: false,

    topografic: false,

  });
  useEffect(() => {
  async function loadHuntingAreas() {
    try {
      const response = await fetch(
  "/data/areesCinegetiquesAltUrgell.geojson"
);

if (!response.ok) {
  throw new Error(
    `No s'ha pogut carregar les àrees cinegètiques: ${response.status}`
  );
}

const geojson = await response.json();

      setHuntingAreasData(geojson);

      

      console.log(
        "Àrees cinegètiques carregades:",
        geojson.features.length
      );
    } catch (error) {
      console.error(
        "Error carregant les àrees cinegètiques:",
        error
      );
    }
  }

  loadHuntingAreas();
}, []);

// ============================================================
// CARREGAR XARXA GPX — ROUTE BUILDER
// ============================================================

// ============================================================
// CARREGAR XARXA GPX — ROUTE BUILDER
// ============================================================

useEffect(() => {
  async function loadNetworkGeoJSON() {
    try {
      const { data, error } = await supabase
        .from("network_state")
        .select("network_gpx")
        .eq("id", "current")
        .single();

      if (error) {
        throw error;
      }

      if (!data?.network_gpx) {
        throw new Error("Supabase no ha retornat el GeoJSON de la xarxa.");
      }

      console.log(
        "✅ Xarxa GPX carregada des de Supabase:",
        data.network_gpx
      );

      console.log(
        "🛤 Features Xarxa GPX:",
        data.network_gpx.features?.length ?? 0
      );

      setRouteBuilderGeoJSON(data.network_gpx);
    } catch (error) {
      console.error(
        "⚠️ Error carregant Xarxa GPX des de Supabase. Utilitzem el fitxer local:",
        error
      );

      try {
        const response = await fetch(
          "/data/xarxa_v0.7/network-gpx.geojson"
        );

        if (!response.ok) {
          throw new Error(
            `Error carregant Xarxa GPX local: ${response.status}`
          );
        }

        const data = await response.json();

        console.log(
          "✅ Xarxa GPX local carregada com a fallback:",
          data
        );

        setRouteBuilderGeoJSON(data);
      } catch (fallbackError) {
        console.error(
          "❌ Error carregant també la Xarxa GPX local:",
          fallbackError
        );
      }
    }
  }

  loadNetworkGeoJSON();
}, []);

  // ============================================================
// CARREGAR GRAF DE LA XARXA
// ============================================================

useEffect(() => {
  async function loadNetworkGraph() {
    try {
      const { data, error } = await supabase
        .from("network_state")
        .select("network_graph")
        .eq("id", "current")
        .single();

      if (error) {
        throw error;
      }

      if (!data?.network_graph) {
        throw new Error(
          "Supabase no ha retornat el graf de la xarxa."
        );
      }

      console.log(
        "✅ Graf de xarxa carregat des de Supabase:",
        data.network_graph
      );

      console.log(
        "🔗 Nodes del graf:",
        Object.keys(data.network_graph.nodes ?? {}).length
      );

      console.log(
        "🛤️ Edges del graf:",
        Object.keys(data.network_graph.edges ?? {}).length
      );

      setNetworkGraph(data.network_graph);
    } catch (error) {
      console.error(
        "⚠️ Error carregant el graf des de Supabase. Utilitzem el fitxer local:",
        error
      );

      try {
        const response = await fetch(
          "/data/xarxa_v0.7/network-graph.json"
        );

        if (!response.ok) {
          throw new Error(
            `Error carregant graf local: ${response.status}`
          );
        }

        const data = await response.json();

        console.log(
          "✅ Graf de xarxa local carregat com a fallback:",
          data
        );

        setNetworkGraph(data);
      } catch (fallbackError) {
        console.error(
          "❌ Error carregant també el graf local:",
          fallbackError
        );
      }
    }
  }

  loadNetworkGraph();
}, []);

  // ==============================
  // Carrega de xarxes
  // ==============================

  function handleLoaded(newGeojson) {

  // Netejar el context anterior
  setGeojsonLayers([newGeojson]);
  setSelectedSegments([]);
  setActiveTrail(null);

  // Sortir del mode Route Builder
  setUserTool("status");
  setSelectedRoute([]);
  setRouteStatus("building");

  setMapVersion((previous) => previous + 1);

}

  function handleMunicipalLoaded(newGeojson) {

  console.log(
    "Carregant Xarxa Municipal:",
    newGeojson.features.length
  );

  // Substituir qualsevol xarxa anterior
  setGeojsonLayers([newGeojson]);

  // Netejar seleccions
  setSelectedSegments([]);
  setActiveTrail(null);

  // Sortir del Route Builder
  setUserTool("status");
  setSelectedRoute([]);
  setRouteStatus("building");

  setMapVersion((previous) => previous + 1);

}

  function updateTrailStatus(trailName, status) {

  setTrailStatus((previous) => ({

    ...previous,

    [trailName]: {
      status: status,
      updatedAt: new Date().toISOString(),
    },

  }));

}

  // ==============================
// Esborrar tots els estats
// ==============================

function clearTrailStatus() {

  const confirmDelete = window.confirm(
    "Vols esborrar tots els estats dels corriols?"
  );

  if (!confirmDelete) return;

  localStorage.removeItem("trailStatus");

  setTrailStatus({});

  setActiveTrail(null);

}
  // ==============================
  // Configuració del GIS
  // ==============================

  function updateGISLayer(name, value) {

    setGisLayers((previous) => ({

      ...previous,

      [name]: value,

    }));

  }

  // ==============================
// Selecció d'un corriol
// ==============================

function handleSegmentClick(feature) {
  console.log("🔎 FEATURE CLICAT:", feature);
  console.log("🔎 PROPERTIES:", feature.properties);
  console.log("🔎 EDGE ID:", feature.properties?.edgeId);

  const segment = parseSegment(feature);

  console.log("🔎 SEGMENT PARSEJAT:", segment);

  setActiveTrail(segment);

  if (userTool === "status") {
    return;
  }

  setSelectedSegments((previous) => {
    const exists = previous.some(
      (item) => item.name === segment.name
    );

    if (exists) {
      return previous.filter(
        (item) => item.name !== segment.name
      );
    }

    return [...previous, segment];
  });
}

  // ==============================
  // Estadístiques
  // ==============================

  const totalDistance = selectedSegments.reduce(
    (sum, segment) => sum + segment.distance,
    0
  );

  const totalAscent = selectedSegments.reduce(
    (sum, segment) => sum + segment.ascent,
    0
  );

  const totalDescent = selectedSegments.reduce(
    (sum, segment) => sum + segment.descent,
    0
  );

  // ============================================================
// ESTADÍSTIQUES DEL ROUTE BUILDER
// ============================================================

const routeDistance =
  selectedRoute.reduce(
    (sum, edge) =>
      sum + (edge.distance_km || 0),
    0
  );

const routeAscent =
  selectedRoute.reduce(
    (sum, edge) =>
      sum + (edge.ascent_m || 0),
    0
  );

const routeDescent =
  selectedRoute.reduce(
    (sum, edge) =>
      sum + (edge.descent_m || 0),
    0
  );

  // ==============================
  // Interfície
  // ==============================
const uniqueSegments = new Set();

geojsonLayers.forEach((layer) => {
  layer.features.forEach((feature) => {
    const segment =
      feature.properties?.segment ??
      feature.properties?.name;

    if (segment) {
      uniqueSegments.add(segment);
    }
  });
});

const statusCounts = {
  all: uniqueSegments.size,
  unreviewed: 0,
  clean: 0,
  pending: 0,
  closed: 0,
  maintenance: 0,
};

uniqueSegments.forEach((segment) => {
  const trailData =
    trailStatus[segment];

  const status =
    typeof trailData === "string"
      ? trailData
      : trailData?.status ?? "unreviewed";

  statusCounts[status]++;
});


  async function changeAppMode() {
  if (appMode === "admin") {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error(
        "❌ Error tancant sessió d'administrador:",
        error
      );
      alert("No s'ha pogut tancar la sessió.");
    }

    return;
  }

  const email = window.prompt(
    "📧 Correu de l'administrador:"
  );

  if (email === null) return;

  const password = window.prompt(
    "🔐 Contrasenya de l'administrador:"
  );

  if (password === null) return;

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    console.error(
      "❌ Error iniciant sessió d'administrador:",
      error
    );
    alert("Correu o contrasenya incorrectes.");
  }
}

  return (

    <div className="app">

      <header className="header">
        <h1>🌿 Xarxa de Corriols d'Alàs i Cerc</h1>
      </header>
      <button
  onClick={changeAppMode}
   
  style={{
    background: "#ffcc80",
    padding: "8px 14px",
    border: "1px solid #e0a050",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
  }}
>
  Mode: {appMode === "admin" ? "Administrador" : "Usuari"}
</button>

  

{appMode === "user" && userTool === "status" && (
  <div>
    {[
      ["all", `🌈 Tots (${statusCounts.all})`],
      ["unreviewed", `⚪ Sense revisar (${statusCounts.unreviewed})`],
      ["clean", `🟢 Nets (${statusCounts.clean})`],
      ["pending", `🟡 Pendents (${statusCounts.pending})`],
      ["maintenance", `🔵 En manteniment (${statusCounts.maintenance})`],
      ["closed", `🔴 Tancats (${statusCounts.closed})`],
    ].map(([filter, label]) => (
      <button
        key={filter}
        onClick={() => changeStatusFilter(filter)}
        style={{
          padding: "10px 14px",
          fontWeight: statusFilter === filter ? "bold" : "normal",
          border:
            statusFilter === filter
              ? "3px solid #1b5e20"
              : "1px solid #cccccc",
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    ))}
  </div>
)}
      <Toolbar
  onLoaded={handleLoaded}
  onMunicipalLoaded={handleMunicipalLoaded}
  appMode={appMode}
  userTool={userTool}
  setUserTool={changeUserTool}
  onGPXImportPreview={handleGPXImportPreview}
/>

      <main className="layout">

        <section className="map">

          <MapView
  geojsonLayers={geojsonLayers}
  huntingAreasData={huntingAreasData}
  onSegmentClick={handleSegmentClick}
  selectedSegments={selectedSegments}
  activeTrail={activeTrail}
  trailStatus={trailStatus}
  gisLayers={gisLayers}
  updateGISLayer={updateGISLayer}
  mapVersion={mapVersion}
  statusFilter={statusFilter}
  userTool={userTool}
  selectedRoute={selectedRoute}
  setSelectedRoute={setSelectedRoute}
  routeBuilderGeoJSON={routeBuilderGeoJSON}
  routeStatus={routeStatus}
  predefinedRouteGeoJSON={predefinedRouteGeoJSON}
/>

        </section>

        <aside className="sidebar">

      {appMode === "admin" && gpxImportPreview && (
        <div style={{ marginBottom: "16px", padding: "12px", border: "1px solid #ccc", borderRadius: "8px", background: "#fafafa" }}>
          <h3 style={{ margin: "0 0 10px", color: "#1b5e20" }}>🔎 Previsualització GPX</h3>
          <p style={{ margin: "5px 0", fontWeight: "bold", wordBreak: "break-word" }}>{gpxImportPreview.fileName}</p>
          {gpxImportPreview.error ? <p style={{ color: "#c62828" }}>⚠️ {gpxImportPreview.error}</p> : <>
            <p style={{ margin: "5px 0" }}>📏 {gpxImportPreview.distance.toFixed(3)} km</p>
            <p style={{ margin: "5px 0" }}>⬆️ +{gpxImportPreview.ascent} m</p>
            <p style={{ margin: "5px 0" }}>⬇️ -{gpxImportPreview.descent} m</p>
            <hr style={{ border: 0, borderTop: "1px solid #ddd", margin: "10px 0" }} />
            <p style={{ margin: "5px 0" }}><strong>Inici:</strong> {gpxImportPreview.start.label}{gpxImportPreview.start.distanceM != null ? ` (${gpxImportPreview.start.distanceM.toFixed(1)} m)` : ""}</p>
            {gpxImportPreview.start.kind === "interior" && (
              <p style={{ margin: "3px 0 5px 18px", color: "#6d4c41" }}>↳ Posició aproximada: {gpxImportPreview.start.position != null ? gpxImportPreview.start.position.toFixed(4) : "—"} del segment</p>
            )}
            <p style={{ margin: "5px 0" }}><strong>Final:</strong> {gpxImportPreview.end.label}{gpxImportPreview.end.distanceM != null ? ` (${gpxImportPreview.end.distanceM.toFixed(1)} m)` : ""}</p>
            {gpxImportPreview.end.kind === "interior" && (
              <p style={{ margin: "3px 0 5px 18px", color: "#6d4c41" }}>↳ Posició aproximada: {gpxImportPreview.end.position != null ? gpxImportPreview.end.position.toFixed(4) : "—"} del segment</p>
            )}
            <div style={{ marginTop: "10px", padding: "9px", borderRadius: "6px", background: gpxImportPreview.duplicate ? "#ffebee" : "#e8f5e9", color: gpxImportPreview.duplicate ? "#b71c1c" : "#1b5e20" }}>
              <strong>{gpxImportPreview.duplicate ? "⚠️ Possible segment duplicat" : "✅ No s'ha detectat cap duplicat"}</strong>
              {gpxImportPreview.duplicate && <p style={{ margin: "5px 0 0" }}>Ja existeix <strong>{gpxImportPreview.duplicate.segmentName}</strong> ({gpxImportPreview.duplicate.reason}).</p>}
            </div>
            <p style={{ margin: "10px 0 5px", fontWeight: "bold" }}>Accions previstes:</p>
            <ul style={{ margin: "4px 0 10px", paddingLeft: "20px" }}>{gpxImportPreview.actions.map((action, index) => <li key={`${index}-${action}`}>{action}</li>)}</ul>
            {gpxImportPreview.importError && (
              <p style={{ margin: "6px 0", color: "#c62828" }}>⚠️ {gpxImportPreview.importError}</p>
            )}
            <button
              disabled={Boolean(gpxImportPreview.duplicate) || Boolean(gpxImportPreview.incorporated) || gpxImportPreview.canIncorporate === false}
              onClick={() => {
                try {
                  incorporateGPXImport();
                } catch (error) {
                  console.error("Error incorporant GPX:", error);
                  setGpxImportPreview((previous) => ({
                    ...previous,
                    importError: error?.message || "No s'ha pogut incorporar el GPX.",
                  }));
                }
              }}
              style={{ width: "100%", padding: "9px", border: "none", borderRadius: "6px", background: gpxImportPreview.duplicate ? "#bdbdbd" : "#2e7d32", color: "white", cursor: gpxImportPreview.duplicate || gpxImportPreview.incorporated || gpxImportPreview.canIncorporate === false ? "not-allowed" : "pointer", fontWeight: "bold" }}
            >{gpxImportPreview.incorporated ? "✅ Incorporat a la xarxa" : "Incorporar a la xarxa"}</button>
            {gpxImportPreview.incorporated && gpxImportResult && (
              <div style={{ marginTop: "8px" }}>
                <button onClick={() => downloadJSON("network-gpx_actualitzada.geojson", gpxImportResult.geojson)} style={{ width: "100%", padding: "8px", border: "1px solid #2e7d32", borderRadius: "6px", background: "white", color: "#1b5e20", cursor: "pointer" }}>Descarregar GeoJSON actualitzat</button>
                <button onClick={() => downloadJSON("network-graph_actualitzat.json", gpxImportResult.graph)} style={{ width: "100%", padding: "8px", marginTop: "6px", border: "1px solid #2e7d32", borderRadius: "6px", background: "white", color: "#1b5e20", cursor: "pointer" }}>Descarregar graf actualitzat</button>
              </div>
            )}
            <button onClick={() => setGpxImportPreview(null)} style={{ width: "100%", padding: "8px", marginTop: "6px", border: "1px solid #bbb", borderRadius: "6px", background: "white", cursor: "pointer" }}>Cancel·lar</button>
          </>}
        </div>
      )}
      {userTool === "predefined" && (
  <>
    <h2
      style={{
        margin: "0 0 16px 0",
        fontSize: "20px",
        color: "#1b5e20",
      }}
    >
      🛣️ Voltes predefinides
    </h2>

    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      {["6km", "10km", "20km"].map((distance) => (
        <div key={distance}>

          <button
            onClick={() =>
              setExpandedRouteDistance(
                expandedRouteDistance === distance
                  ? null
                  : distance
              )
            }
            style={{
              width: "100%",
              padding: "10px 12px",
              textAlign: "left",
              border: "1px solid #ccc",
              borderRadius: "6px",
              background:
                expandedRouteDistance === distance
                  ? "#e8f5e9"
                  : "#ffffff",
              color: "#1b5e20",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "bold",
            }}
          >
            {expandedRouteDistance === distance
              ? "▼"
              : "▶"}{" "}
            {distance === "6km"
              ? "6 km"
              : distance === "10km"
              ? "10 km"
              : "20 km"}
          </button>

          {expandedRouteDistance === distance && (
            <div
              style={{
                marginTop: "5px",
                paddingLeft: "10px",
              }}
            >
              {routes[distance].map((route) => (
                <button
                  key={route.id}
                  onClick={() =>
                    handlePredefinedRouteSelect(route)
                    }
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    marginBottom: "4px",
                    textAlign: "left",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                    background:
                      selectedPredefinedRoute?.id === route.id
                        ? "#ffe0b2"
                        : "#ffffff",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  {route.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  </>
)}    

{userTool === "predefined" &&
  selectedPredefinedRoute &&
  predefinedRouteStats && (

    <div
      style={{
        marginTop: "18px",
        padding: "14px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        background: "#ffffff",
      }}
    >
      <h3
        style={{
          margin: "0 0 12px 0",
          color: "#1b5e20",
          fontSize: "17px",
        }}
      >
        Informació de la volta
      </h3>

      <div
        style={{
          fontSize: "18px",
          fontWeight: "bold",
          marginBottom: "8px",
        }}
      >
        🏁 {selectedPredefinedRoute.name}
      </div>

      <div
        style={{
          fontSize: "16px",
          marginBottom: "12px",
        }}
      >
        {selectedPredefinedRoute.distance}
      </div>

      <button
  onClick={handleInvertPredefinedRoute}
  style={{
    width: "100%",
    padding: "10px 12px",
    marginBottom: "12px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    background: "#f5f5f5",
    color: "#1b5e20",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "bold",
  }}
>
  ↔{" "}
  {predefinedRouteInverted
    ? "Tornar a direcció original"
    : "Invertir volta"}
</button>

      <div
        style={{
          borderTop: "1px solid #ddd",
          paddingTop: "10px",
        }}
      >

<button
  onClick={() =>
    exportPredefinedRouteToGPX(
      predefinedRouteGeoJSON,
      selectedPredefinedRoute.name,
      selectedPredefinedRoute.distance,
      predefinedRouteStats.ascent,
      predefinedRouteStats.descent,
      predefinedRouteInverted
    )
  }
  style={{
    width: "100%",
    padding: "10px 12px",
    marginBottom: "12px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    background: "#f5f5f5",
    color: "#1b5e20",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "bold",
  }}
>
  ⬇️ Descarregar GPX
</button>

        <p
          style={{
            margin: "8px 0",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <strong>⬆️ Desnivell positiu</strong>
          <strong style={{ color: "#2e7d32" }}>
            +{predefinedRouteStats.ascent} m
          </strong>
        </p>

        <p
          style={{
            margin: "8px 0",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <strong>⬇️ Desnivell negatiu</strong>
          <strong style={{ color: "#c62828" }}>
            -{predefinedRouteStats.descent} m
          </strong>
        </p>
      </div>

      <div
        style={{
          marginTop: "14px",
          padding: "10px",
          background: "#e3f2fd",
          borderRadius: "6px",
          fontSize: "13px",
          color: "#1565c0",
        }}
      >
        ℹ️ Les dades poden variar lleugerament
        segons l'origen del track.
      </div>
    </div>
)}

  {userTool === "route" && (
    <>
      <h2
        style={{
          margin: "0 0 12px 0",
          fontSize: "20px",
          color: "#1b5e20",
        }}
      >
        📍 Recorregut
      </h2>

      

      <div
        className="stats"
        style={{
          marginBottom: "20px",
          lineHeight: "1.4",
        }}
      >
        <p>
          <strong>📏 Distància</strong><br />
          {routeDistance.toFixed(2)} km
        </p>

        <p>
          <strong>⬆️ Desnivell positiu</strong><br />
          {routeAscent.toFixed(0)} m
        </p>

                <p>
          <strong>⬇️ Desnivell negatiu</strong><br />
          {routeDescent.toFixed(0)} m
        </p>

        <div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "12px",
    marginBottom: "14px",
  }}
>

  <button
    onClick={handleInvertRoute}
    disabled={!selectedRoute?.length}
  >
    🔄 Invertir ruta
  </button>


  {routeStatus === "building" && (
    <>

      <button
        onClick={handleUndoLastRouteEdge}
        disabled={!selectedRoute?.length}
      >
        ↩️ Esborrar últim tram
      </button>


      <button
        onClick={() => {

          if (!selectedRoute?.length) {
            return;
          }

          setRouteStatus("finished");

        }}
        disabled={!selectedRoute?.length}
      >
        🏁 Finalitzar track
      </button>

    </>
  )}


  {routeStatus === "finished" && (

  <>

    <button
      onClick={handleRestartRoute}
    >
      ↩️ Tornar a començar
    </button>
    

    <button
    onClick={() => {

  const coordinates =
    buildRouteCoordinates();

  const gpx =
  buildGPXContent(
    coordinates,
    routeDistance,
    routeAscent,
    routeDescent
  );

  if (!gpx) {
    return;
  }

  const blob =
    new Blob(
      [gpx],
      {
        type: "application/gpx+xml",
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href = url;

  link.download =
  `track-xarxa-corriols-${routeDistance.toFixed(2)}km.gpx`;

  document.body.appendChild(
    link
  );

  link.click();

  document.body.removeChild(
    link
  );

  URL.revokeObjectURL(
    url
  );

}}  
    >
      ⬇️ Descarregar track GPX
    </button>

    </>

  )}

</div>


      </div>   {/* ← AQUEST ÉS EL QUE FALTAVA */}

      <p
        style={{
          marginTop: "8px",
          fontWeight: "bold",
        }}
      >
        🧭 {selectedRoute.length} trams
      </p>

    </>
  )}

  {userTool !== "route" && userTool !== "predefined" && (
  <TrailStatusPanel
    activeTrail={activeTrail}
    trailStatus={trailStatus}
    updateTrailStatus={updateTrailStatus}
    clearTrailStatus={clearTrailStatus}
    appMode={appMode}
    userTool={userTool}
  />
)}

          

        {userTool !== "route" && userTool !== "predefined" && (
  
       <>

          <h3
            style={{
            marginTop: "18px",
            marginBottom: "8px",
            color: "#1b5e20",
           }}
          >
             🌿 Xarxa carregada
          </h3>

          {geojsonLayers.length === 0 ? (

            <p>Cap xarxa carregada.</p>

          ) : (

            <>
              <p>
                <strong>{geojsonLayers.length}</strong>{" "}
                fitxers carregats
              </p>

              <p>
                <strong>
                  {geojsonLayers.reduce(
                     (sum, layer) => sum + layer.features.length,
                   0
                  )}
                </strong>{" "}
                segments totals
              </p>

            </>

          )}

           </>
)} 

          {appMode === "user" && userTool === "route" && selectedSegments.length > 0 && (
  <button
    onClick={clearSelectedSegments}
    style={{
      width: "100%",
      padding: "10px",
      marginTop: "15px",
      marginBottom: "10px",
      background: "#c62828",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: "bold",
    }}
  >
    🗑 Esborrar selecció
  </button>
)}
{appMode === "user" && userTool === "route" && selectedSegments.length > 0 && (
  <button
    onClick={() => exportSelectedSegmentsToGPX(selectedSegments)}
    style={{
      width: "100%",
      padding: "10px",
      marginBottom: "10px",
      background: "#2e7d32",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: "bold",
    }}
  >
    ⬇️ Descarregar GPX
  </button>
)}

          {userTool === "route" && (
  <>
    <h3
      style={{
        marginTop: "18px",
        marginBottom: "8px",
        color: "#1b5e20",
      }}
    >
      🧭 Trams de la ruta
    </h3>

    {selectedRoute.length === 0 ? (

      <p>
        Encara no hi ha cap tram seleccionat.
      </p>

    ) : (

      <ol
        style={{
          paddingLeft: "22px",
          lineHeight: "1.5",
        }}
      >

        {selectedRoute.map(
          (edge, index) => (

            <li
              key={
                `${edge.edgeId}-${index}`
              }
              style={{
                marginBottom: "8px",
              }}
            >

              <strong>
                {edge.segment}
              </strong>

              <br />

              <small>

                {edge.direction === "reverse"
                  ? "← REV"
                  : "→ FWD"}

                {" · "}

                {(
                  edge.distance_km || 0
                ).toFixed(3)}

                {" km"}

              </small>

            </li>

          )
        )}

      </ol>

    )}

  </>

)}

        </aside>

      </main>

    </div>

  );

}

export default App;