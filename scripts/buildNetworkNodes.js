/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
v0.7

Fitxer: buildNetworkNodes.js

Responsabilitats:
- Llegir els candidats topològics
- Recuperar les coordenades dels GPX
- Agrupar connexions que representen una mateixa zona
- Crear nodes candidats
- NO modificar els GPX originals

Aquesta és una primera fase d'anàlisi.
Els nodes encara NO són definitius.

----------------------------------------------------
*/

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


// ==============================
// Configuració
// ==============================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(
  __dirname,
  "..",
  "public",
  "data",
  "xarxa_v0.7"
);

const GPX_DIR = path.join(
  DATA_DIR,
  "gpx"
);

const INPUT_FILE = path.join(
  DATA_DIR,
  "network-topology-candidates.json"
);

const OUTPUT_FILE = path.join(
  DATA_DIR,
  "network-nodes-candidates.json"
);


// Distància màxima per agrupar
// candidats en una mateixa zona.
const NODE_TOLERANCE_METERS = 20;


// ==============================
// Distància geogràfica
// ==============================

function distanceMeters(a, b) {

  const R = 6371000;

  const lat1 =
    a.lat * Math.PI / 180;

  const lat2 =
    b.lat * Math.PI / 180;

  const dLat =
    (b.lat - a.lat) *
    Math.PI / 180;

  const dLon =
    (b.lon - a.lon) *
    Math.PI / 180;

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

    points.push({

      lat: Number(match[1]),

      lon: Number(match[2]),

    });

  }

  return points;
}


// ==============================
// Carregar totes les geometries
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
      );

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
// Punt interpolat sobre GPX
// ==============================

function interpolatePoint(
  points,
  index,
  ratio
) {

  const a =
    points[index];

  const b =
    points[index + 1];

  return {

    lat:
      a.lat +
      (
        b.lat -
        a.lat
      ) *
      ratio,

    lon:
      a.lon +
      (
        b.lon -
        a.lon
      ) *
      ratio,

  };

}


// ==============================
// Coordenada d'una connexió
// ==============================

function getConnectionPoint(
  candidate,
  geometries
) {

  const segment =
    geometries[
      candidate.segmentB
    ];

  if (
    !segment
  ) {

    return null;

  }


  const index =
    candidate.segmentPointIndex;

  if (
    index < 0 ||
    index >= segment.length - 1
  ) {

    return null;

  }


  return interpolatePoint(
    segment,
    index,
    candidate.positionOnSegment
  );

}


// ==============================
// Coordenada de l'extrem
// ==============================

function getEndpointPoint(
  candidate,
  geometries
) {

  const segment =
    geometries[
      candidate.segmentA
    ];

  if (
    !segment
  ) {

    return null;

  }


  if (
    candidate.sideA === "start"
  ) {

    return segment[0];

  }

  return segment[
    segment.length - 1
  ];

}


// ==============================
// Punt representatiu
// ==============================

function getRepresentativePoint(candidate, geometries) {

  // Ara disposem de la coordenada real
  // calculada pel detector topològic.
  if (candidate.connectionPoint) {

    return {

      lat:
        candidate.connectionPoint.lat,

      lon:
        candidate.connectionPoint.lon,

    };

  }


  // Compatibilitat amb candidats antics
  // que encara no tinguessin connectionPoint.

  const endpoint =
    getEndpointPoint(
      candidate,
      geometries
    );

  const target =
    getConnectionPoint(
      candidate,
      geometries
    );


  if (
    !endpoint &&
    !target
  ) {

    return null;

  }


  if (!endpoint) {

    return target;

  }


  if (!target) {

    return endpoint;

  }


  return {

    lat:
      (
        endpoint.lat +
        target.lat
      ) / 2,

    lon:
      (
        endpoint.lon +
        target.lon
      ) / 2,

  };

}


// ==============================
// Agrupar nodes
// ==============================

function buildNodes(
  candidates,
  geometries
) {

  const nodes = [];


  for (
    const candidate
    of candidates
  ) {

    const point =
      getRepresentativePoint(
        candidate,
        geometries
      );


    if (!point) {

      continue;

    }


    let node = null;


    for (
      const existing
      of nodes
    ) {

      const distance =
        distanceMeters(
          point,
          existing.point
        );


      if (
        distance <=
        NODE_TOLERANCE_METERS
      ) {

        node = existing;

        break;

      }

    }


    if (!node) {

      node = {

        id:
          `NODE_${String(
            nodes.length + 1
          ).padStart(3, "0")}`,

        point: {

          lat:
            Number(
              point.lat.toFixed(7)
            ),

          lon:
            Number(
              point.lon.toFixed(7)
            ),

        },

        connections: [],

      };

      nodes.push(node);

    }


    node.connections.push({

      type:
        candidate.type,

      segmentA:
        candidate.segmentA,

      sideA:
        candidate.sideA,

      segmentB:
        candidate.segmentB,

      positionOnSegment:
        candidate.positionOnSegment,

      positionAlongSegment:
        candidate.positionAlongSegment,

      connectionPoint:
        candidate.connectionPoint
          ? {

              lat:
                candidate.connectionPoint.lat,

              lon:
                candidate.connectionPoint.lon,

            }
          : null,

      distance_m:
        candidate.distance_m,

    });

  }


  return nodes;

}


// ==============================
// Eliminar duplicats dins dels nodes
// ==============================

function cleanNodes(
  nodes
) {

  return nodes.map(
    node => {

      const unique = [];

      const keys =
        new Set();


      for (
        const connection
        of node.connections
      ) {

        const key =
          [
            connection.segmentA,
            connection.sideA,
            connection.segmentB,
            connection.positionOnSegment,
          ].join("|");


        if (
          !keys.has(key)
        ) {

          keys.add(key);

          unique.push(
            connection
          );

        }

      }


      return {

        ...node,

        connections:
          unique,

      };

    }
  );

}


// ==============================
// Construcció
// ==============================

function build() {

  console.log(
    "🌿 Construint nodes candidats v0.7..."
  );


  const topology =
    JSON.parse(
      fs.readFileSync(
        INPUT_FILE,
        "utf8"
      )
    );


  const geometries =
    loadGeometries();


  console.log(
    `📂 Geometries carregades: ${
      Object.keys(
        geometries
      ).length
    }`
  );


  const candidates =
    topology.endpointToInterior
      .filter(
        candidate =>
          candidate.positionOnSegment > 0.1 &&
          candidate.positionOnSegment < 0.9
      );


  console.log(
    `📍 Candidats interiors: ${
      candidates.length
    }`
  );


  const nodes =
    buildNodes(
      candidates,
      geometries
    );


  const clean =
    cleanNodes(
      nodes
    );


  const output = {

    version:
      "0.7",

    generatedAt:
      new Date().toISOString(),

    tolerance_m:
      NODE_TOLERANCE_METERS,

    source:
      "network-topology-candidates.json",

    candidateCount:
      candidates.length,

    nodeCount:
      clean.length,

    nodes:
      clean,

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
    "✅ Nodes candidats creats."
  );

  console.log(
    `📍 Nodes: ${clean.length}`
  );

  console.log(
    `🔗 Connexions analitzades: ${
      candidates.length
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
    "❌ Error construint nodes:"
  );

  console.error(
    error.message
  );

  process.exit(1);

}