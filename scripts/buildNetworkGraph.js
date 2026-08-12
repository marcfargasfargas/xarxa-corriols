/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
v0.7

Fitxer: buildNetworkGraph.js

Objectiu:
- Construir una primera representació del graf de la xarxa
- Utilitzar els segments GPX
- Incorporar les connexions extrem ↔ extrem
- Incorporar les connexions extrem ↔ interior
- Preparar els segments com a BIDIRECCIONALS
- No modificar els GPX originals
- No modificar encara l'aplicació

Aquesta versió és un graf d'anàlisi.
La topologia definitiva vindrà després.

----------------------------------------------------
*/

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


// ==============================
// Configuració
// ==============================

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);


const DATA_DIR =
  path.join(
    __dirname,
    "..",
    "public",
    "data",
    "xarxa_v0.7"
  );


const GPX_DIR =
  path.join(
    DATA_DIR,
    "gpx"
  );


const INVENTORY_FILE =
  path.join(
    DATA_DIR,
    "network-inventory.json"
  );


const TOPOLOGY_FILE =
  path.join(
    DATA_DIR,
    "network-topology-candidates.json"
  );


const NODES_FILE =
  path.join(
    DATA_DIR,
    "network-nodes-candidates.json"
  );


const OUTPUT_FILE =
  path.join(
    DATA_DIR,
    "network-graph-candidates.json"
  );


// ==============================
// Parsejar GPX
// ==============================

function parseGPX(content) {

  const points = [];

  const regex =
    /<trkpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;

  let match;

  while (
    (match = regex.exec(content)) !== null
  ) {

    const elevationMatch =
      match[3].match(
        /<ele>([-+0-9.eE]+)<\/ele>/
      );


    points.push({

      lat:
        Number(match[1]),

      lon:
        Number(match[2]),

      elevation:
        elevationMatch
          ? Number(elevationMatch[1])
          : null,

    });

  }

  return points;
}


// ==============================
// Carregar geometries
// ==============================

function loadGeometries() {

  const files =
    fs
      .readdirSync(GPX_DIR)
      .filter(
        file =>
          file
            .toLowerCase()
            .endsWith(".gpx")
      )
      .sort();


  const geometries = {};


  for (
    const file of files
  ) {

    const content =
      fs.readFileSync(
        path.join(
          GPX_DIR,
          file
        ),
        "utf8"
      );


    const points =
      parseGPX(content);


    if (
      points.length >= 2
    ) {

      geometries[file] =
        points;

    }

  }


  return geometries;
}


// ==============================
// Distància
// ==============================

function distanceMeters(a, b) {

  const R = 6371000;

  const lat1 =
    a.lat *
    Math.PI /
    180;

  const lat2 =
    b.lat *
    Math.PI /
    180;

  const dLat =
    (b.lat - a.lat) *
    Math.PI /
    180;

  const dLon =
    (b.lon - a.lon) *
    Math.PI /
    180;


  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
    Math.cos(lat2) *
    Math.sin(dLon / 2) ** 2;


  return (
    R *
    2 *
    Math.atan2(
      Math.sqrt(value),
      Math.sqrt(1 - value)
    )
  );

}


// ==============================
// Informació de segments
// ==============================

function buildSegmentData(
  inventory,
  geometries
) {

  const segments = {};


  for (
    const item
    of inventory
  ) {

    const points =
      geometries[item.file];


    if (!points) {

      continue;

    }


    segments[item.file] = {

      file:
        item.file,

      points,

      distance_km:
        item.distance_km,

      ascent_m:
        item.ascent_m,

      descent_m:
        item.descent_m,

      start: {

        lat:
          points[0].lat,

        lon:
          points[0].lon,

        elevation:
          points[0].elevation,

      },

      end: {

        lat:
          points[
            points.length - 1
          ].lat,

        lon:
          points[
            points.length - 1
          ].lon,

        elevation:
          points[
            points.length - 1
          ].elevation,

      },

    };

  }


  return segments;
}


// ==============================
// Crear identificador d'extrem
// ==============================

function endpointKey(
  segment,
  side
) {

  return (
    `${segment}:${side}`
  );

}


// ==============================
// Construir graf
// ==============================

function buildGraph(
  inventory,
  topology,
  nodes,
  geometries
) {

  const segmentData =
    buildSegmentData(
      inventory,
      geometries
    );


  const graphNodes = {};

  const graphEdges = [];


  // --------------------------------
  // Crear nodes per cada extrem
  // --------------------------------

  for (
    const segment
    of Object.values(
      segmentData
    )
  ) {

    const startId =
      endpointKey(
        segment.file,
        "start"
      );

    const endId =
      endpointKey(
        segment.file,
        "end"
      );


    graphNodes[startId] = {

      id:
        startId,

      type:
        "endpoint",

      segment:
        segment.file,

      side:
        "start",

      point:
        segment.start,

    };


    graphNodes[endId] = {

      id:
        endId,

      type:
        "endpoint",

      segment:
        segment.file,

      side:
        "end",

      point:
        segment.end,

    };

  }


  // --------------------------------
  // Connexions extrem ↔ extrem
  // --------------------------------

  for (
    const connection
    of topology.endpointConnections
  ) {

    const from =
      endpointKey(
        connection.segmentA,
        connection.sideA
      );

    const to =
      endpointKey(
        connection.segmentB,
        connection.sideB
      );


    graphEdges.push({

      type:
        "connection",

      connectionType:
        "endpoint-endpoint",

      from,

      to,

      distance_m:
        connection.distance_m,

      bidirectional:
        true,

    });

  }


  // --------------------------------
  // Connexions extrem ↔ interior
  // --------------------------------

  for (
    const connection
    of topology.endpointToInterior
  ) {

    const from =
      endpointKey(
        connection.segmentA,
        connection.sideA
      );


    const interiorId =
      [
        connection.segmentB,
        connection.positionAlongSegment,
      ].join("@");


    if (
      !graphNodes[interiorId]
    ) {

      graphNodes[interiorId] = {

        id:
          interiorId,

        type:
          "interior",

        segment:
          connection.segmentB,

        positionAlongSegment:
          connection.positionAlongSegment,

        point:
          connection.connectionPoint,

      };

    }


    graphEdges.push({

      type:
        "connection",

      connectionType:
        "endpoint-interior",

      from,

      to:
        interiorId,

      distance_m:
        connection.distance_m,

      bidirectional:
        true,

    });

  }


  // --------------------------------
  // Informació dels segments
  // --------------------------------

  const graphSegments =
    Object.values(
      segmentData
    ).map(
      segment => ({

        id:
          segment.file,

        distance_km:
          segment.distance_km,

        forward: {

          from:
            endpointKey(
              segment.file,
              "start"
            ),

          to:
            endpointKey(
              segment.file,
              "end"
            ),

          ascent_m:
            segment.ascent_m,

          descent_m:
            segment.descent_m,

        },

        reverse: {

          from:
            endpointKey(
              segment.file,
              "end"
            ),

          to:
            endpointKey(
              segment.file,
              "start"
            ),

          ascent_m:
            segment.descent_m,

          descent_m:
            segment.ascent_m,

        },

        bidirectional:
          true,

      })
    );


  // --------------------------------
  // Arestes dels segments
  // --------------------------------

  for (
    const segment
    of Object.values(
      segmentData
    )
  ) {

    const startId =
      endpointKey(
        segment.file,
        "start"
      );


    const endId =
      endpointKey(
        segment.file,
        "end"
      );


    // Sentit original del GPX

    graphEdges.push({

      type:
        "segment",

      segment:
        segment.file,

      from:
        startId,

      to:
        endId,

      direction:
        "forward",

      distance_km:
        segment.distance_km,

      ascent_m:
        segment.ascent_m,

      descent_m:
        segment.descent_m,

      bidirectional:
        true,

    });


    // Sentit invers

    graphEdges.push({

      type:
        "segment",

      segment:
        segment.file,

      from:
        endId,

      to:
        startId,

      direction:
        "reverse",

      distance_km:
        segment.distance_km,

      ascent_m:
        segment.descent_m,

      descent_m:
        segment.ascent_m,

      bidirectional:
        true,

    });

  }


  // --------------------------------
  // Resultat del graf
  // --------------------------------

  return {

    nodes:
      Object.values(
        graphNodes
      ),

    edges:
      graphEdges,

    segments:
      graphSegments,

  };

}


// ==============================
// Construcció
// ==============================

function build() {

  console.log(
    "🌿 Construint graf candidat de la xarxa v0.7..."
  );


  const inventory =
    JSON.parse(
      fs.readFileSync(
        INVENTORY_FILE,
        "utf8"
      )
    );


  const topology =
    JSON.parse(
      fs.readFileSync(
        TOPOLOGY_FILE,
        "utf8"
      )
    );


  const nodeCandidates =
    JSON.parse(
      fs.readFileSync(
        NODES_FILE,
        "utf8"
      )
    );


  const geometries =
    loadGeometries();


  console.log(
    `📂 Segments: ${
      Object.keys(
        geometries
      ).length
    }`
  );


  console.log(
    `🔗 Extrem ↔ extrem: ${
      topology.endpointConnections.length
    }`
  );


  console.log(
    `📍 Extrem ↔ interior: ${
      topology.endpointToInterior.length
    }`
  );


  console.log(
    `🔵 Nodes candidats actuals: ${
      nodeCandidates.nodeCount
    }`
  );


  const graph =
    buildGraph(
      inventory.segments,
      topology,
      nodeCandidates,
      geometries
    );


  const output = {

    version:
      "0.7",

    generatedAt:
      new Date().toISOString(),

    segmentCount:
      graph.segments.length,

    nodeCount:
      graph.nodes.length,

    edgeCount:
      graph.edges.length,

    segments:
      graph.segments,

    nodes:
      graph.nodes,

    edges:
      graph.edges,

  };


  fs.writeFileSync(

    OUTPUT_FILE,

    JSON.stringify(
      output,
      null,
      2
    ),

    "utf8"

  );


  console.log("");

  console.log(
    "✅ Graf candidat creat."
  );

  console.log(
    `🛤 Segments: ${
      graph.segments.length
    }`
  );

  console.log(
    `🔵 Nodes: ${
      graph.nodes.length
    }`
  );

  console.log(
    `🔗 Connexions: ${
      graph.edges.length
    }`
  );

  console.log("");

  console.log(
    `📄 Fitxer: ${OUTPUT_FILE}`
  );

}


// ==============================
// Executar
// ==============================

try {

  build();

} catch (error) {

  console.error("");

  console.error(
    "❌ Error construint el graf:"
  );

  console.error(
    error.message
  );

  process.exit(1);

}