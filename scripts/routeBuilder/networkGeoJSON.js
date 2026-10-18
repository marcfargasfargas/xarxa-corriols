// ============================================================
// ROUTE BUILDER
// NETWORK GEOJSON
// Xarxa de Corriols d'Alàs i Cerc
// ============================================================
//
// Responsabilitat:
//
// Convertir les segment edges del network-graph.json
// en un GeoJSON seleccionable.
//
// Cada Feature correspon a UNA edge de tipus "segment".
//
// Junctions i connections NO generen geometria.
//
// ============================================================

import fs from "fs";
import path from "path";

import {
  DATA_DIR,
  loadJSON,
  loadGPX,
} from "./data.js";

import {
  extractSegmentSlice,
} from "./geometry.js";


// ============================================================
// CONFIGURACIÓ
// ============================================================

const GRAPH_FILE =
  path.join(
    DATA_DIR,
    "network-graph.json"
  );

const OUTPUT_FILE =
  path.join(
    DATA_DIR,
    "network-gpx.geojson"
  );


// ============================================================
// CONVERTIR PUNTS GPX → COORDENADES GEOJSON
// ============================================================

function pointsToCoordinates(
  points
) {

  return points.map(
    (point) => [
      Number(point.lon),
      Number(point.lat),
    ]
  );

}


// ============================================================
// CONSTRUIR FEATURE
// ============================================================

function buildFeature(
  edge,
  points
) {

  return {

    type:
      "Feature",

    properties: {

      edgeId:
        edge.id,

      type:
        edge.type,

      segment:
        edge.segment,

      from:
        edge.from,

      to:
        edge.to,

      positionStart:
        edge.positionStart,

      positionEnd:
        edge.positionEnd,

      distance_km:
        edge.distance_km,

      ascent_m:
        edge.ascent_m,

      descent_m:
        edge.descent_m,

      direction:
        edge.direction,

      bidirectional:
        edge.bidirectional,

    },

    geometry: {

      type:
        "LineString",

      coordinates:
        pointsToCoordinates(
          points
        ),

    },

  };

}


// ============================================================
// GENERAR XARXA GPX
// ============================================================

function buildNetworkGeoJSON(
  graph
) {

  const features = [];

  let segmentEdgeCount =
    0;

  let skippedEdgeCount =
    0;


  for (
    const edge of
      graph.edges || []
  ) {

    // --------------------------------------------------------
    // Només segment edges
    // --------------------------------------------------------

    if (
      edge.type !==
      "segment"
    ) {

      skippedEdgeCount++;

      continue;

    }


    segmentEdgeCount++;


    // --------------------------------------------------------
    // Carregar GPX
    // --------------------------------------------------------

    const points =
      loadGPX(
        edge.segment
      );


    // --------------------------------------------------------
    // Extreure exactament el tros
    // definit per aquesta edge
    // --------------------------------------------------------

    const slice =
      extractSegmentSlice(
        points,
        edge.positionStart,
        edge.positionEnd
      );


    if (
      slice.length < 2
    ) {

      throw new Error(
        `Edge sense prou punts: ${edge.id}`
      );

    }


    // --------------------------------------------------------
    // Crear Feature
    // --------------------------------------------------------

    features.push(
      buildFeature(
        edge,
        slice
      )
    );

  }


  return {

    type:
      "FeatureCollection",

    properties: {

      source:
        "network-graph.json",

      graphVersion:
        graph.version,

      segmentEdgeCount,

      skippedEdgeCount,

      featureCount:
        features.length,

    },

    features,

  };

}


// ============================================================
// EXECUTAR
// ============================================================

function main() {

  console.log(
    "\n=========================================="
  );

  console.log(
    "🗺️ GENERADOR XARXA GPX"
  );

  console.log(
    "=========================================="
  );


  console.log(
    `📂 Graf: ${GRAPH_FILE}`
  );

  console.log(
    `📂 Sortida: ${OUTPUT_FILE}`
  );


  // ----------------------------------------------------------
  // Carregar graf
  // ----------------------------------------------------------

  const graph =
    loadJSON(
      GRAPH_FILE
    );


  console.log(
    `\n🔎 Graf: ${graph.version || "?"}`
  );

  console.log(
    `🛤 Segments: ${
      graph.segmentCount || "?"
    }`
  );

  console.log(
    `🔗 Arestes totals: ${
      graph.edgeCount || "?"
    }`
  );

  console.log(
    `🧭 Arestes segment: ${
      graph.segmentEdgeCount || "?"
    }`
  );


  // ----------------------------------------------------------
  // Generar
  // ----------------------------------------------------------

  const geojson =
    buildNetworkGeoJSON(
      graph
    );


  // ----------------------------------------------------------
  // Escriure fitxer
  // ----------------------------------------------------------

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(
      geojson,
      null,
      2
    ),
    "utf8"
  );


  console.log(
    "\n=========================================="
  );

  console.log(
    "📊 RESULTAT"
  );

  console.log(
    "=========================================="
  );

  console.log(
    `🛤 Arestes segment: ${
      geojson.properties.segmentEdgeCount
    }`
  );

  console.log(
    `⏭ Arestes ignorades: ${
      geojson.properties.skippedEdgeCount
    }`
  );

  console.log(
    `📍 Features generades: ${
      geojson.features.length
    }`
  );

  console.log(
    `💾 Fitxer: ${OUTPUT_FILE}`
  );

  console.log(
    "\n✅ XARXA GPX GENERADA"
  );

}


// ============================================================
// EXECUCIÓ
// ============================================================

main();