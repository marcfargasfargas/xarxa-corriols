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
- NO detectar terminals
- NO modificar els GPX originals

Els terminals es determinen posteriorment
a buildNetworkRealNodes.js.

----------------------------------------------------
*/

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


// ============================================================
// CONFIGURACIÓ
// ============================================================

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


const INPUT_FILE =
  path.join(
    DATA_DIR,
    "network-topology-candidates.json"
  );


const OUTPUT_FILE =
  path.join(
    DATA_DIR,
    "network-nodes-candidates.json"
  );


// Distància màxima per agrupar
// candidats en una mateixa zona.

const NODE_TOLERANCE_METERS = 20;


// ============================================================
// DISTÀNCIA GEOGRÀFICA
// ============================================================

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


// ============================================================
// PARSEJAR GPX
// ============================================================

function parseGPX(content) {

  const points = [];


  const regex =
    /<trkpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;


  let match;


  while (
    (match =
      regex.exec(content)) !== null
  ) {

    points.push({

      lat:
        Number(match[1]),

      lon:
        Number(match[2]),

    });

  }


  return points;

}


// ============================================================
// CARREGAR TOTES LES GEOMETRIES
// ============================================================

function loadGeometries() {

  const files =
    fs
      .readdirSync(
        GPX_DIR
      )
      .filter(
        file =>
          file
            .toLowerCase()
            .endsWith(".gpx")
      );


  const geometries = {};


  for (
    const file
    of files
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
      parseGPX(
        content
      );


    if (
      points.length >= 2
    ) {

      geometries[file] =
        points;

    }

  }


  return geometries;

}


// ============================================================
// PUNT INTERPOLAT SOBRE GPX
// ============================================================

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


// ============================================================
// COORDENADA D'UNA CONNEXIÓ
// ============================================================

function getConnectionPoint(
  candidate,
  geometries
) {

  const segment =
    geometries[
      candidate.segmentB
    ];


  if (!segment) {

    return null;

  }


  const index =
    candidate.segmentPointIndex;


  if (
    index < 0 ||
    index >=
      segment.length - 1
  ) {

    return null;

  }


  return interpolatePoint(
    segment,
    index,
    candidate.positionOnSegment
  );

}


// ============================================================
// COORDENADA DE L'EXTREM
// ============================================================

function getEndpointPoint(
  candidate,
  geometries
) {

  const segment =
    geometries[
      candidate.segmentA
    ];


  if (!segment) {

    return null;

  }


  if (
    candidate.sideA ===
    "start"
  ) {

    return segment[0];

  }


  return segment[
    segment.length - 1
  ];

}


// ============================================================
// PUNT REPRESENTATIU
// ============================================================

function getRepresentativePoint(
  candidate,
  geometries
) {

  // ----------------------------------------------------------
  // La topologia nova ja proporciona
  // la coordenada real de connexió.
  // ----------------------------------------------------------

  if (
    candidate.connectionPoint
  ) {

    return {

      lat:
        candidate.connectionPoint.lat,

      lon:
        candidate.connectionPoint.lon,

    };

  }


  // ----------------------------------------------------------
  // Compatibilitat amb candidats antics
  // ----------------------------------------------------------

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
      ) /
      2,

    lon:
      (
        endpoint.lon +
        target.lon
      ) /
      2,

  };

}


// ============================================================
// AGRUPAR NODES
// ============================================================

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


    // --------------------------------------------------------
    // Buscar un node existent dins de la tolerància
    // --------------------------------------------------------

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

        node =
          existing;

        break;

      }

    }


    // --------------------------------------------------------
    // Crear node nou
    // --------------------------------------------------------

    if (!node) {

      node = {

        id:
          `NODE_${String(
            nodes.length + 1
          ).padStart(
            3,
            "0"
          )}`,

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


      nodes.push(
        node
      );

    }


    // --------------------------------------------------------
    // Afegir connexió
    // --------------------------------------------------------

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


// ============================================================
// ELIMINAR DUPLICATS DINS DELS NODES
// ============================================================

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

          keys.add(
            key
          );

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


// ============================================================
// CONSTRUCCIÓ
// ============================================================

function build() {

  console.log(
    "🌿 Construint nodes candidats v0.7..."
  );


  // ----------------------------------------------------------
  // Comprovar fitxer d'entrada
  // ----------------------------------------------------------

  if (
    !fs.existsSync(
      INPUT_FILE
    )
  ) {

    throw new Error(
      `No existeix el fitxer de topologia: ${INPUT_FILE}`
    );

  }


  // ----------------------------------------------------------
  // Carregar topologia
  // ----------------------------------------------------------

  const topology =
    JSON.parse(
      fs.readFileSync(
        INPUT_FILE,
        "utf8"
      )
    );


  // ----------------------------------------------------------
  // Carregar geometries
  // ----------------------------------------------------------

  const geometries =
    loadGeometries();


  console.log(
    `📂 Geometries carregades: ${
      Object.keys(
        geometries
      ).length
    }`
  );


  // ----------------------------------------------------------
  // Candidats interiors
  //
  // IMPORTANT:
  // només fem servir connexions EI on
  // el punt està realment a l'interior
  // del segment.
  // ----------------------------------------------------------

  const candidates =
    topology.endpointToInterior
      .filter(
        candidate =>
          Number(
            candidate.positionOnSegment
          ) > 0.1 &&
          Number(
            candidate.positionOnSegment
          ) < 0.9
      );


  console.log(
    `📍 Candidats interiors: ${
      candidates.length
    }`
  );


  // ----------------------------------------------------------
  // Construir nodes
  // ----------------------------------------------------------

  const nodes =
    buildNodes(
      candidates,
      geometries
    );


  // ----------------------------------------------------------
  // Netejar duplicats
  // ----------------------------------------------------------

  const clean =
    cleanNodes(
      nodes
    );


  // ----------------------------------------------------------
  // Objecte de sortida
  // ----------------------------------------------------------

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


  // ----------------------------------------------------------
  // Guardar
  // ----------------------------------------------------------

  fs.writeFileSync(

    OUTPUT_FILE,

    JSON.stringify(
      output,
      null,
      2
    ),

    "utf8"

  );


  // ----------------------------------------------------------
  // Resultat
  // ----------------------------------------------------------

  console.log("");

  console.log(
    "✅ Nodes candidats creats."
  );

  console.log(
    `📍 Nodes: ${
      clean.length
    }`
  );

  console.log(
    `🔗 Connexions analitzades: ${
      candidates.length
    }`
  );

  console.log("");

  console.log(
    `📄 Fitxer: ${
      OUTPUT_FILE
    }`
  );

}


// ============================================================
// EXECUTAR
// ============================================================

try {

  build();

} catch (error) {

  console.error("");

  console.error(
    "❌ Error construint nodes:"
  );

  console.error(
    error.stack ||
    error.message
  );

  process.exit(1);

}