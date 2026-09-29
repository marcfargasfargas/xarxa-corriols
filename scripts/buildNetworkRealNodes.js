/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
v0.7

Fitxer: buildNetworkRealNodes.js

Objectiu:
- Construir els nodes reals de la xarxa
- Incorporar connexions extrem ↔ extrem
- Incorporar connexions extrem ↔ interior
- Partir dels nodes candidats existents
- Crear nodes nous quan una connexió no encaixa
- No perdre cap detecció topològica
- Detectar terminals naturals
- Incorporar PLAÇA com a terminal especial
- Crear network-nodes.json com a resultat derivat

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


const TOPOLOGY_FILE =
  path.join(
    DATA_DIR,
    "network-topology-candidates.json"
  );


const CANDIDATES_FILE =
  path.join(
    DATA_DIR,
    "network-nodes-candidates.json"
  );


const OUTPUT_FILE =
  path.join(
    DATA_DIR,
    "network-nodes.json"
  );


// Tolerància general de la xarxa.
// NO modificar per al cas de la plaça.

const NODE_TOLERANCE_M = 20;


// Segment especial que representa
// l'accés des de la plaça Major.

const PLAZA_SEGMENT =
  "plaça.gpx";


// Extrem del segment que representa
// el punt de sortida/arribada.

const PLAZA_SIDE =
  "start";


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
          ? Number(
              elevationMatch[1]
            )
          : null,

    });

  }


  return points;

}


// ============================================================
// CARREGAR GPX
// ============================================================

function loadGPXData() {

  if (
    !fs.existsSync(
      GPX_DIR
    )
  ) {

    throw new Error(
      `No existeix la carpeta GPX: ${GPX_DIR}`
    );

  }


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
      )
      .sort();


  const data = {};


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
      points.length < 2
    ) {

      console.warn(
        `⚠️ GPX ignorat per manca de punts: ${file}`
      );

      continue;

    }


    data[file] = {

      points,

      start:
        points[0],

      end:
        points[
          points.length - 1
        ],

    };

  }


  return data;

}


// ============================================================
// DISTÀNCIA GEOGRÀFICA
// ============================================================

function distanceMeters(
  a,
  b
) {

  const R =
    6371000;


  const lat1 =
    a.lat *
    Math.PI /
    180;


  const lat2 =
    b.lat *
    Math.PI /
    180;


  const dLat =
    (
      b.lat -
      a.lat
    ) *
    Math.PI /
    180;


  const dLon =
    (
      b.lon -
      a.lon
    ) *
    Math.PI /
    180;


  const value =
    Math.sin(
      dLat / 2
    ) ** 2 +

    Math.cos(lat1) *
    Math.cos(lat2) *
    Math.sin(
      dLon / 2
    ) ** 2;


  return (
    R *
    2 *
    Math.atan2(
      Math.sqrt(value),
      Math.sqrt(
        1 - value
      )
    )
  );

}


// ============================================================
// PUNT MIG
// ============================================================

function midpoint(
  a,
  b
) {

  return {

    lat:
      (
        a.lat +
        b.lat
      ) / 2,

    lon:
      (
        a.lon +
        b.lon
      ) / 2,

  };

}


// ============================================================
// CLAU D'EXTREM
// ============================================================

function endpointKey(
  segment,
  side
) {

  return (
    `${segment}:${side}`
  );

}


// ============================================================
// COORDENADA D'UN EXTREM
// ============================================================

function getEndpointPoint(
  gpxData,
  segment,
  side
) {

  const data =
    gpxData[
      segment
    ];


  if (!data) {

    return null;

  }


  if (
    side === "start"
  ) {

    return data.start;

  }


  if (
    side === "end"
  ) {

    return data.end;

  }


  return null;

}


// ============================================================
// CREAR NODE BASE
// ============================================================

function createNode(
  id,
  point,
  source
) {

  return {

    id,

    type:
      "real-node",

    source,

    point: {

      lat:
        point.lat,

      lon:
        point.lon,

    },

    endpointConnections: [],

    interiorConnections: [],

  };

}


// ============================================================
// BUSCAR NODE PROPER
// ============================================================

function findNearestNode(
  nodes,
  point
) {

  let nearest =
    null;


  let nearestDistance =
    Infinity;


  for (
    const node
    of nodes
  ) {

    const distance =
      distanceMeters(
        point,
        node.point
      );


    if (
      distance <
      nearestDistance
    ) {

      nearest =
        node;

      nearestDistance =
        distance;

    }

  }


  if (
    nearest &&
    nearestDistance <=
      NODE_TOLERANCE_M
  ) {

    return {

      node:
        nearest,

      distance_m:
        nearestDistance,

    };

  }


  return null;

}


// ============================================================
// CONSTRUIR NODES
// ============================================================

function buildNodes(
  candidates,
  topology,
  gpxData
) {

  const nodes = [];


  let nextNodeNumber =
    1;


  // ----------------------------------------------------------
  // 1. Incorporar els nodes candidats existents
  // ----------------------------------------------------------

  for (
    const candidate
    of candidates.nodes
  ) {

    nodes.push({

      id:
        candidate.id,

      type:
        "real-node",

      source:
        "candidate",

      point: {

        lat:
          candidate.point.lat,

        lon:
          candidate.point.lon,

      },

      candidateConnections:
        candidate.connections ?? [],

      endpointConnections: [],

      interiorConnections: [],

    });


    const number =
      Number(
        candidate.id.replace(
          "NODE_",
          ""
        )
      );


    if (
      Number.isFinite(
        number
      ) &&
      number >=
        nextNodeNumber
    ) {

      nextNodeNumber =
        number + 1;

    }

  }


  // ----------------------------------------------------------
  // 2. Obtenir o crear node
  // ----------------------------------------------------------

  function getOrCreateNode(
    point,
    source
  ) {

    const nearest =
      findNearestNode(
        nodes,
        point
      );


    if (nearest) {

      return {

        node:
          nearest.node,

        created:
          false,

        distance_m:
          nearest.distance_m,

      };

    }


    const id =
      `NODE_${
        String(
          nextNodeNumber
        ).padStart(
          3,
          "0"
        )
      }`;


    nextNodeNumber++;


    const node =
      createNode(
        id,
        point,
        source
      );


    nodes.push(
      node
    );


    return {

      node,

      created:
        true,

      distance_m:
        0,

    };

  }


  // ----------------------------------------------------------
  // Estadístiques
  // ----------------------------------------------------------

  let endpointAssigned =
    0;

  let endpointCreated =
    0;

  let interiorAssigned =
    0;

  let interiorCreated =
    0;


  // ----------------------------------------------------------
  // 3. EXTREM ↔ EXTREM
  // ----------------------------------------------------------

  for (
    const connection
    of topology.endpointConnections
  ) {

    const pointA =
      getEndpointPoint(
        gpxData,
        connection.segmentA,
        connection.sideA
      );


    const pointB =
      getEndpointPoint(
        gpxData,
        connection.segmentB,
        connection.sideB
      );


    if (
      !pointA ||
      !pointB
    ) {

      console.warn(
        `⚠️ No s'han trobat coordenades per: ` +
        `${connection.segmentA} ${connection.sideA} ↔ ` +
        `${connection.segmentB} ${connection.sideB}`
      );

      continue;

    }


    const point =
      midpoint(
        pointA,
        pointB
      );


    const result =
      getOrCreateNode(
        point,
        "endpoint-endpoint"
      );


    if (
      result.created
    ) {

      endpointCreated++;

    } else {

      endpointAssigned++;

    }


    result.node.endpointConnections.push({

      type:
        "endpoint-endpoint",

      segmentA:
        connection.segmentA,

      sideA:
        connection.sideA,

      segmentB:
        connection.segmentB,

      sideB:
        connection.sideB,

      distance_m:
        connection.distance_m,

      endpointDistance_m:
        distanceMeters(
          pointA,
          pointB
        ),

    });

  }


  // ----------------------------------------------------------
  // 4. EXTREM ↔ INTERIOR
  // ----------------------------------------------------------

  for (
    const connection
    of topology.endpointToInterior
  ) {

    const point =
      connection.connectionPoint;


    if (!point) {

      console.warn(
        `⚠️ Connexió interior sense punt: ` +
        `${connection.segmentA} → ` +
        `${connection.segmentB}`
      );

      continue;

    }


    const result =
      getOrCreateNode(
        point,
        "endpoint-interior"
      );


    if (
      result.created
    ) {

      interiorCreated++;

    } else {

      interiorAssigned++;

    }


    result.node.interiorConnections.push({

      type:
        "endpoint-interior",

      segmentA:
        connection.segmentA,

      sideA:
        connection.sideA,

      segmentB:
        connection.segmentB,

      segmentPointIndex:
        connection.segmentPointIndex,

      positionOnSegment:
        connection.positionOnSegment,

      positionAlongSegment:
        connection.positionAlongSegment,

      connectionPoint:
        connection.connectionPoint,

      distance_m:
        connection.distance_m,

    });

  }


  return {

    nodes,

    stats: {

      endpointAssigned,

      endpointCreated,

      interiorAssigned,

      interiorCreated,

    },

  };

}


// ============================================================
// ELIMINAR DUPLICACIONS EXACTES
// ============================================================

function deduplicateNodes(
  nodes
) {

  for (
    const node
    of nodes
  ) {

    // --------------------------------------------------------
    // Extrem ↔ extrem
    // --------------------------------------------------------

    const endpointMap =
      new Map();


    for (
      const connection
      of node.endpointConnections
    ) {

      const key = [

        connection.segmentA,

        connection.sideA,

        connection.segmentB,

        connection.sideB,

        connection.distance_m,

      ].join("|");


      endpointMap.set(
        key,
        connection
      );

    }


    node.endpointConnections =
      Array.from(
        endpointMap.values()
      );


    // --------------------------------------------------------
    // Extrem ↔ interior
    // --------------------------------------------------------

    const interiorMap =
      new Map();


    for (
      const connection
      of node.interiorConnections
    ) {

      const key = [

        connection.segmentA,

        connection.sideA,

        connection.segmentB,

        connection.segmentPointIndex,

        connection.positionAlongSegment,

        connection.distance_m,

      ].join("|");


      interiorMap.set(
        key,
        connection
      );

    }


    node.interiorConnections =
      Array.from(
        interiorMap.values()
      );

  }


  return nodes;

}


// ============================================================
// DETECTAR TERMINALS
// ============================================================

function detectTerminals(
  topology,
  gpxData
) {

  const connectedEndpoints =
    new Set();


  // ----------------------------------------------------------
  // Extrem ↔ extrem
  // ----------------------------------------------------------

  for (
    const connection
    of topology.endpointConnections
  ) {

    connectedEndpoints.add(
      endpointKey(
        connection.segmentA,
        connection.sideA
      )
    );


    connectedEndpoints.add(
      endpointKey(
        connection.segmentB,
        connection.sideB
      )
    );

  }


  // ----------------------------------------------------------
  // Extrem ↔ interior
  // ----------------------------------------------------------

  for (
    const connection
    of topology.endpointToInterior
  ) {

    connectedEndpoints.add(
      endpointKey(
        connection.segmentA,
        connection.sideA
      )
    );

  }


  const terminals = [];


  // ----------------------------------------------------------
  // Terminals naturals
  //
  // IMPORTANT:
  // la plaça NO es tracta aquí com un terminal natural.
  // La incorporarem explícitament més avall.
  // ----------------------------------------------------------

  for (
    const [segment, data]
    of Object.entries(
      gpxData
    )
  ) {

    // La plaça té una regla especial.

    if (
      segment ===
      PLAZA_SEGMENT
    ) {

      continue;

    }


    const startKey =
      endpointKey(
        segment,
        "start"
      );


    const endKey =
      endpointKey(
        segment,
        "end"
      );


    if (
      !connectedEndpoints.has(
        startKey
      )
    ) {

      terminals.push({

        id:
          `TERMINAL_${segment}_start`,

        type:
          "natural",

        segment,

        side:
          "start",

        point: {

          lat:
            data.start.lat,

          lon:
            data.start.lon,

          elevation:
            data.start.elevation,

        },

      });

    }


    if (
      !connectedEndpoints.has(
        endKey
      )
    ) {

      terminals.push({

        id:
          `TERMINAL_${segment}_end`,

        type:
          "natural",

        segment,

        side:
          "end",

        point: {

          lat:
            data.end.lat,

          lon:
            data.end.lon,

          elevation:
            data.end.elevation,

        },

      });

    }

  }


  // ----------------------------------------------------------
  // TERMINAL ESPECIAL DE LA PLAÇA
  // ----------------------------------------------------------

  const plazaData =
    gpxData[
      PLAZA_SEGMENT
    ];


  if (
    plazaData
  ) {

    const plazaPoint =
      plazaData[
        PLAZA_SIDE
      ];


    terminals.push({

      id:
        "TERMINAL_PLAÇA",

      type:
        "place",

      name:
        "Plaça Major d'Alàs",

      segment:
        PLAZA_SEGMENT,

      side:
        PLAZA_SIDE,

      point: {

        lat:
          plazaPoint.lat,

        lon:
          plazaPoint.lon,

        elevation:
          plazaPoint.elevation,

      },

    });

  } else {

    console.warn(
      `⚠️ No s'ha trobat ${PLAZA_SEGMENT}; ` +
      `no es crearà TERMINAL_PLAÇA.`
    );

  }


  // ----------------------------------------------------------
  // Ordenació estable
  // ----------------------------------------------------------

  terminals.sort(
    (a, b) =>
      a.id.localeCompare(
        b.id
      )
  );


  return terminals;

}


// ============================================================
// CONSTRUCCIÓ PRINCIPAL
// ============================================================

function build() {

  console.log(
    "🌿 Construint nodes reals de la xarxa v0.7..."
  );


  // ----------------------------------------------------------
  // GPX
  // ----------------------------------------------------------

  const gpxData =
    loadGPXData();


  console.log(
    `📂 GPX carregats: ${
      Object.keys(
        gpxData
      ).length
    }`
  );


  // ----------------------------------------------------------
  // Candidats
  // ----------------------------------------------------------

  if (
    !fs.existsSync(
      CANDIDATES_FILE
    )
  ) {

    throw new Error(
      `No existeix: ${CANDIDATES_FILE}`
    );

  }


  const candidates =
    JSON.parse(
      fs.readFileSync(
        CANDIDATES_FILE,
        "utf8"
      )
    );


  // ----------------------------------------------------------
  // Topologia
  // ----------------------------------------------------------

  if (
    !fs.existsSync(
      TOPOLOGY_FILE
    )
  ) {

    throw new Error(
      `No existeix: ${TOPOLOGY_FILE}`
    );

  }


  const topology =
    JSON.parse(
      fs.readFileSync(
        TOPOLOGY_FILE,
        "utf8"
      )
    );


  console.log(
    `📍 Nodes candidats: ${
      candidates.nodeCount
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
    `📏 Tolerància: ${
      NODE_TOLERANCE_M
    } m`
  );


  // ----------------------------------------------------------
  // Construir nodes
  // ----------------------------------------------------------

  const result =
    buildNodes(
      candidates,
      topology,
      gpxData
    );


  let nodes =
    deduplicateNodes(
      result.nodes
    );


  // ----------------------------------------------------------
  // Detectar terminals
  // ----------------------------------------------------------

  const terminals =
    detectTerminals(
      topology,
      gpxData
    );


  // ----------------------------------------------------------
  // Comptatge final
  // ----------------------------------------------------------

  const assignedEndpoint =
    nodes.reduce(
      (
        total,
        node
      ) =>
        total +
        node.endpointConnections.length,
      0
    );


  const assignedInterior =
    nodes.reduce(
      (
        total,
        node
      ) =>
        total +
        node.interiorConnections.length,
      0
    );


  const expectedEndpoint =
    topology.endpointConnections.length;


  const expectedInterior =
    topology.endpointToInterior.length;


  // ----------------------------------------------------------
  // VALIDACIÓ
  // ----------------------------------------------------------

  const complete =
    assignedEndpoint ===
      expectedEndpoint &&
    assignedInterior ===
      expectedInterior;


  // ----------------------------------------------------------
  // SORTIDA
  // ----------------------------------------------------------

  const output = {

    version:
      "0.7",

    generatedAt:
      new Date().toISOString(),

    tolerance_m:
      NODE_TOLERANCE_M,

    candidateNodeCount:
      candidates.nodeCount,

    nodeCount:
      nodes.length,

    terminalCount:
      terminals.length,

    topologyCounts: {

      endpointConnections:
        expectedEndpoint,

      endpointToInterior:
        expectedInterior,

    },

    assignmentCounts: {

      endpointConnections:
        assignedEndpoint,

      endpointToInterior:
        assignedInterior,

    },

    creationStats:
      result.stats,

    coverage: {

      endpointConnections:
        assignedEndpoint ===
        expectedEndpoint,

      endpointToInterior:
        assignedInterior ===
        expectedInterior,

      complete,

    },

    terminals,

    nodes,

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
  // RESULTAT
  // ----------------------------------------------------------

  console.log("");

  console.log(
    "✅ Nodes reals creats."
  );


  console.log(
    `📍 Nodes: ${
      nodes.length
    }`
  );


  console.log("");

  console.log(
    "📊 Cobertura:"
  );


  console.log(
    `🔗 Extrem ↔ extrem: ${
      assignedEndpoint
    } / ${
      expectedEndpoint
    }`
  );


  console.log(
    `📍 Extrem ↔ interior: ${
      assignedInterior
    } / ${
      expectedInterior
    }`
  );


  console.log("");

  console.log(
    "🆕 Nodes creats a partir d'extrem ↔ extrem:",
    result.stats.endpointCreated
  );


  console.log(
    "🆕 Nodes creats a partir d'extrem ↔ interior:",
    result.stats.interiorCreated
  );


  console.log("");

  console.log(
    `🔚 Terminals detectats: ${
      terminals.length
    }`
  );


  terminals.forEach(
    terminal => {

      console.log(
        `   ${terminal.id} → ` +
        `${terminal.segment} ${terminal.side} @ ` +
        `${terminal.point.lat}, ` +
        `${terminal.point.lon}`
      );

    }
  );


  console.log("");

  console.log(
    `📄 Fitxer: ${OUTPUT_FILE}`
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
    "❌ Error construint els nodes reals:"
  );

  console.error(
    error.stack ||
    error.message
  );

  process.exit(1);

}