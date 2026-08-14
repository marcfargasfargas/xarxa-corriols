/**
 * ============================================================
 * TEST ROUTE BUILDER v0.5
 * Xarxa de Corriols d'Alàs i Cerc
 * ============================================================
 *
 * Objectiu:
 *
 * Reconstruir la geometria REAL de la ruta seleccionada
 * automàticament a partir de:
 *
 *   - test-route.json
 *   - network-graph.json
 *   - network-nodes.json
 *   - GPX originals
 *
 * IMPORTANT:
 *
 * Aquesta versió NO requereix enganxar manualment els
 * segments ni les arestes dins d'aquest fitxer.
 *
 * El Route Finder ja ha guardat la ruta seleccionada a:
 *
 *   test-route.json
 *
 * El Builder la llegeix automàticament.
 *
 * PRINCIPI:
 *
 * Cada aresta segment del graf indica:
 *
 *   segment
 *   positionStart
 *   positionEnd
 *   from
 *   to
 *   direction
 *
 * Per tant reconstruïm el tros REAL del GPX.
 *
 * Les arestes de tipus junction NO creen geometria artificial.
 *
 * ============================================================
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
  path.resolve(
    __dirname,
    "../public/data/xarxa_v0.7"
  );


const GRAPH_FILE =
  path.join(
    DATA_DIR,
    "network-graph.json"
  );


const NODES_FILE =
  path.join(
    DATA_DIR,
    "network-nodes.json"
  );


const ROUTE_FILE =
  path.join(
    DATA_DIR,
    "test-route.json"
  );


const GPX_DIR =
  path.join(
    DATA_DIR,
    "gpx"
  );


const OUTPUT_FILE =
  path.join(
    DATA_DIR,
    "test-route-builder-v0.5.geojson"
  );


// ============================================================
// VALIDACIONS
// ============================================================

const NODE_TOLERANCE_METERS =
  30;


const MAX_JUMP_METERS =
  100;


const MIN_POINT_DISTANCE_METERS =
  0.01;


// ============================================================
// UTILITATS
// ============================================================

function safeNumber(
  value
) {

  const n =
    Number(value);

  return Number.isFinite(n)
    ? n
    : 0;

}


function round(
  value,
  decimals = 3
) {

  const factor =
    10 ** decimals;

  return (
    Math.round(
      value * factor
    ) / factor
  );

}


function clamp(
  value,
  min,
  max
) {

  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );

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
      Math.sqrt(1 - value)
    )
  );

}


// ============================================================
// PARSEJAR GPX
// ============================================================

function parseGPX(
  content
) {

  const points = [];


  const regex =
    /<trkpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;


  let match;


  while (
    (
      match =
        regex.exec(content)
    ) !== null
  ) {

    const elevationMatch =
      match[3].match(
        /<ele>([-+0-9.eE]+)<\/ele>/
      );


    points.push({

      lat:
        Number(
          match[1]
        ),

      lon:
        Number(
          match[2]
        ),

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

function loadGPX(
  file
) {

  const filePath =
    path.join(
      GPX_DIR,
      file
    );


  if (
    !fs.existsSync(
      filePath
    )
  ) {

    throw new Error(
      `No existeix el GPX: ${filePath}`
    );

  }


  const content =
    fs.readFileSync(
      filePath,
      "utf8"
    );


  const points =
    parseGPX(
      content
    );


  if (
    points.length < 2
  ) {

    throw new Error(
      `GPX sense prou punts: ${file}`
    );

  }


  return points;

}


// ============================================================
// CARREGAR JSON
// ============================================================

function loadJSON(
  file
) {

  if (
    !fs.existsSync(
      file
    )
  ) {

    throw new Error(
      `No existeix: ${file}`
    );

  }


  return JSON.parse(
    fs.readFileSync(
      file,
      "utf8"
    )
  );

}


// ============================================================
// INDEXAR NODES
// ============================================================

function terminalId(
  segment,
  side
) {

  return (
    `TERMINAL_${segment}_${side}`
  );

}


function buildNodeIndex(
  nodeData
) {

  const index =
    new Map();


  const nodes =
    nodeData.nodes || [];


  const terminals =
    nodeData.terminals || [];


  // ----------------------------------------------------------
  // Nodes reals
  // ----------------------------------------------------------

  for (
    const node of nodes
  ) {

    if (
      !node.id ||
      !node.point
    ) {

      continue;

    }


    index.set(
      node.id,
      {

        id:
          node.id,

        type:
          "real-node",

        point:
          node.point,

      }
    );

  }


  // ----------------------------------------------------------
  // Terminals
  // ----------------------------------------------------------

  for (
    const terminal of
      terminals
  ) {

    const id =
      terminalId(
        terminal.segment,
        terminal.side
      );


    index.set(
      id,
      {

        id,

        type:
          "terminal",

        point:
          terminal.point,

      }
    );

  }


  return index;

}


// ============================================================
// INDEXAR ARESTES
// ============================================================

function buildEdgeIndex(
  graph
) {

  const index =
    new Map();


  for (
    const edge of
      graph.edges || []
  ) {

    const id =
      edge.id ||
      edge.edgeId;


    if (!id) {
      continue;
    }


    index.set(
      id,
      edge
    );

  }


  return index;

}


// ============================================================
// VALIDAR RUTA
// ============================================================

function validateRoute(
  route,
  edgeIndex
) {

  if (
    !route ||
    !Array.isArray(
      route.edges
    )
  ) {

    throw new Error(
      "test-route.json no conté una llista 'edges' vàlida."
    );

  }


  if (
    route.edges.length === 0
  ) {

    throw new Error(
      "test-route.json no conté cap aresta."
    );

  }


  console.log(
    `\n🧭 Arestes de la ruta: ${route.edges.length}`
  );


  for (
    let i = 0;
    i < route.edges.length;
    i++
  ) {

    const edgeId =
      route.edges[i];


    const edge =
      edgeIndex.get(
        edgeId
      );


    if (!edge) {

      throw new Error(
        `Aresta ${i + 1} no trobada al graf: ${edgeId}`
      );

    }

  }


  if (
    Array.isArray(
      route.segments
    )
  ) {

    console.log(
      `🛤 Segments de la ruta: ${route.segments.length}`
    );

  }


  console.log(
    `🎯 Objectiu: ${route.targetKm || "?"} km`
  );

}


// ============================================================
// POSICIONS D'UNA ARESTA
// ============================================================

function getEdgePositions(
  edge
) {

  const start =
    Number(
      edge.positionStart
    );


  const end =
    Number(
      edge.positionEnd
    );


  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end)
  ) {

    throw new Error(
      `Aresta sense positionStart/positionEnd: ${
        edge.id ||
        edge.edgeId
      }`
    );

  }


  if (
    start < 0 ||
    start > 1 ||
    end < 0 ||
    end > 1
  ) {

    throw new Error(
      `Posició fora de rang: ${
        edge.id ||
        edge.edgeId
      } → ${start} → ${end}`
    );

  }


  return {
    start,
    end,
  };

}


// ============================================================
// INTERPOLAR PUNT
// ============================================================

function interpolatePoint(
  a,
  b,
  ratio
) {

  const r =
    clamp(
      ratio,
      0,
      1
    );


  let elevation =
    null;


  if (
    Number.isFinite(
      a.elevation
    ) &&
    Number.isFinite(
      b.elevation
    )
  ) {

    elevation =
      a.elevation +
      (
        b.elevation -
        a.elevation
      ) *
      r;

  }


  return {

    lat:
      a.lat +
      (
        b.lat -
        a.lat
      ) *
      r,

    lon:
      a.lon +
      (
        b.lon -
        a.lon
      ) *
      r,

    elevation,

  };

}


// ============================================================
// POSICIÓ NORMALITZADA → PUNT GPX
// ============================================================

function pointAtPosition(
  points,
  position
) {

  if (
    points.length < 2
  ) {

    throw new Error(
      "GPX amb menys de 2 punts."
    );

  }


  const p =
    clamp(
      Number(position),
      0,
      1
    );


  const indexFloat =
    p *
    (
      points.length - 1
    );


  const index =
    Math.floor(
      indexFloat
    );


  if (
    index >=
    points.length - 1
  ) {

    return {

      ...points[
        points.length - 1
      ],

      _position:
        1,

    };

  }


  const ratio =
    indexFloat -
    index;


  return {

    ...interpolatePoint(
      points[index],
      points[index + 1],
      ratio
    ),

    _position:
      p,

  };

}


// ============================================================
// EXTREURE SUBTRAM GPX
// ============================================================

function extractSegmentSlice(
  points,
  positionStart,
  positionEnd
) {

  const reversed =
    positionEnd <
    positionStart;


  const low =
    Math.min(
      positionStart,
      positionEnd
    );


  const high =
    Math.max(
      positionStart,
      positionEnd
    );


  const startPoint =
    pointAtPosition(
      points,
      low
    );


  const endPoint =
    pointAtPosition(
      points,
      high
    );


  const result = [];


  // ----------------------------------------------------------
  // Punt inicial
  // ----------------------------------------------------------

  result.push(
    startPoint
  );


  // ----------------------------------------------------------
  // Punts interiors
  // ----------------------------------------------------------

  const startIndex =
    Math.ceil(
      low *
      (
        points.length - 1
      )
    );


  const endIndex =
    Math.floor(
      high *
      (
        points.length - 1
      )
    );


  for (
    let i =
      startIndex + 1;

    i <=
    endIndex;

    i++
  ) {

    const point =
      points[i];


    if (!point) {
      continue;
    }


    result.push({

      ...point,

      _position:
        i /
        (
          points.length - 1
        ),

    });

  }


  // ----------------------------------------------------------
  // Punt final
  // ----------------------------------------------------------

  if (
    distanceMeters(
      result[
        result.length - 1
      ],
      endPoint
    ) >
    MIN_POINT_DISTANCE_METERS
  ) {

    result.push(
      endPoint
    );

  }


  // ----------------------------------------------------------
  // Invertir
  // ----------------------------------------------------------

  if (
    reversed
  ) {

    result.reverse();

  }


  return result;

}


// ============================================================
// VALIDAR NODE ↔ GEOMETRIA
// ============================================================

function validateNodePoint(
  nodeIndex,
  nodeId,
  point,
  context
) {

  const node =
    nodeIndex.get(
      nodeId
    );


  if (!node) {

    throw new Error(
      `Node inexistent ${nodeId} (${context})`
    );

  }


  if (!node.point) {

    throw new Error(
      `Node sense coordenades ${nodeId} (${context})`
    );

  }


  const distance =
    distanceMeters(
      point,
      node.point
    );


  if (
    distance >
    NODE_TOLERANCE_METERS
  ) {

    throw new Error(

      [
        "❌ DESCONNEXIÓ GEOMÈTRICA",
        `Node: ${nodeId}`,
        `Context: ${context}`,
        `Distància: ${distance.toFixed(
          2
        )} m`,
        `Tolerància: ${NODE_TOLERANCE_METERS} m`,
      ].join(
        "\n"
      )

    );

  }


  return distance;

}


// ============================================================
// AFEGIR PUNTS
// ============================================================

function appendPoints(
  target,
  points
) {

  if (
    points.length === 0
  ) {

    return;

  }


  if (
    target.length === 0
  ) {

    target.push(
      ...points
    );

    return;

  }


  const last =
    target[
      target.length - 1
    ];


  const first =
    points[0];


  const distance =
    distanceMeters(
      last,
      first
    );


  if (
    distance <=
    MIN_POINT_DISTANCE_METERS
  ) {

    target.push(
      ...points.slice(1)
    );

  } else {

    target.push(
      ...points
    );

  }

}


// ============================================================
// RECONSTRUIR GEOMETRIA
// ============================================================

function reconstructRoute(
  route,
  edgeIndex,
  nodeIndex
) {

  const allPoints = [];

  const diagnostics = [];

  let segmentCount =
    0;

  let junctionCount =
    0;

  let connectionCount =
    0;


  console.log(
    "\n🔧 Reconstruint geometria..."
  );


  for (
    let i = 0;
    i < route.edges.length;
    i++
  ) {

    const edgeId =
      route.edges[i];


    const edge =
      edgeIndex.get(
        edgeId
      );


    if (!edge) {

      throw new Error(
        `Aresta no trobada: ${edgeId}`
      );

    }


    const type =
      edge.type ||
      "segment";


    // ========================================================
    // SEGMENT
    // ========================================================

    if (
      type ===
      "segment"
    ) {

      segmentCount++;


      const segment =
        edge.segment;


      if (!segment) {

        throw new Error(
          `Aresta sense segment: ${edgeId}`
        );

      }


      const points =
        loadGPX(
          segment
        );


      const positions =
        getEdgePositions(
          edge
        );


      const slice =
        extractSegmentSlice(
          points,
          positions.start,
          positions.end
        );


      if (
        slice.length <
        2
      ) {

        throw new Error(
          `Subtram sense prou punts: ${edgeId}`
        );

      }


      const startDistance =
        validateNodePoint(
          nodeIndex,
          edge.from,
          slice[0],
          `${edgeId} inici`
        );


      const endDistance =
        validateNodePoint(
          nodeIndex,
          edge.to,
          slice[
            slice.length - 1
          ],
          `${edgeId} final`
        );


      console.log(
        `  ${String(i + 1).padStart(
          2,
          " "
        )}. ${segment.padEnd(
          15
        )} ${
          edge.direction ===
          "reverse"
            ? "REV"
            : "FWD"
        }`
      );


      console.log(
        `     ${edge.from} → ${edge.to}`
      );


      console.log(
        `     Posició: ${positions.start.toFixed(
          6
        )} → ${positions.end.toFixed(
          6
        )}`
      );


      console.log(
        `     Punts: ${slice.length}`
      );


      console.log(
        `     Node inici: ${startDistance.toFixed(
          2
        )} m`
      );


      console.log(
        `     Node final: ${endDistance.toFixed(
          2
        )} m`
      );


      appendPoints(
        allPoints,
        slice
      );


      diagnostics.push({

        index:
          i + 1,

        edgeId,

        type:
          "segment",

        segment,

        direction:
          edge.direction,

        from:
          edge.from,

        to:
          edge.to,

        positionStart:
          positions.start,

        positionEnd:
          positions.end,

        pointCount:
          slice.length,

        nodeStartDistance_m:
          round(
            startDistance,
            2
          ),

        nodeEndDistance_m:
          round(
            endDistance,
            2
          ),

      });


      continue;

    }


    // ========================================================
    // JUNCTION
    // ========================================================

    if (
      type ===
      "junction"
    ) {

      junctionCount++;


      console.log(
        `  ${String(i + 1).padStart(
          2,
          " "
        )}. ${edge.segment || ""} JUNCTION`
      );


      console.log(
        `     ${edge.from} → ${edge.to}`
      );


      console.log(
        "     ℹ️ No s'afegeix geometria"
      );


      diagnostics.push({

        index:
          i + 1,

        edgeId,

        type:
          "junction",

        segment:
          edge.segment ||
          null,

        from:
          edge.from,

        to:
          edge.to,

        distance_m:
          0,

      });


      continue;

    }


    // ========================================================
    // CONNECTION
    // ========================================================

    if (
      type ===
      "connection"
    ) {

      connectionCount++;


      console.log(
        `  ${String(i + 1).padStart(
          2,
          " "
        )}. CONNECTION`
      );


      console.log(
        `     ${edge.from} → ${edge.to}`
      );


      console.log(
        "     ℹ️ No s'afegeix geometria"
      );


      diagnostics.push({

        index:
          i + 1,

        edgeId,

        type:
          "connection",

        from:
          edge.from,

        to:
          edge.to,

        distance_m:
          safeNumber(
            edge.distance_km
          ) * 1000,

      });


      continue;

    }


    throw new Error(
      `Tipus d'aresta desconegut: ${type} (${edgeId})`
    );

  }


  return {

    points:
      allPoints,

    diagnostics,

    segmentCount,

    junctionCount,

    connectionCount,

  };

}


// ============================================================
// VALIDAR CONTINUÏTAT
// ============================================================

function validateContinuity(
  points
) {

  let totalDistance =
    0;


  let maxJump =
    0;


  let maxJumpIndex =
    -1;


  const jumps = [];


  for (
    let i = 1;
    i < points.length;
    i++
  ) {

    const distance =
      distanceMeters(
        points[i - 1],
        points[i]
      );


    totalDistance +=
      distance;


    if (
      distance >
      maxJump
    ) {

      maxJump =
        distance;

      maxJumpIndex =
        i;

    }


    if (
      distance >
      MAX_JUMP_METERS
    ) {

      jumps.push({

        index:
          i,

        distance_m:
          distance,

        from:
          points[
            i - 1
          ],

        to:
          points[i],

      });

    }

  }


  console.log(
    `\n📍 Punts finals: ${points.length}`
  );


  console.log(
    `📏 Distància reconstruïda: ${(
      totalDistance / 1000
    ).toFixed(3)} km`
  );


  console.log(
    `📐 Salt màxim: ${maxJump.toFixed(
      2
    )} m`
  );


  console.log(
    `⚠️ Salts > ${MAX_JUMP_METERS} m: ${jumps.length}`
  );


  if (
    jumps.length > 0
  ) {

    console.log(
      "\n❌ SALTS DETECTATS"
    );


    for (
      const jump of jumps
    ) {

      console.log(
        `   Punt ${jump.index}: ${jump.distance_m.toFixed(
          2
        )} m`
      );

    }

  }


  return {

    totalDistance_m:
      totalDistance,

    maxJump_m:
      maxJump,

    maxJumpIndex,

    jumps,

    valid:
      jumps.length === 0,

  };

}


// ============================================================
// VALIDAR TANCAMENT
// ============================================================

function validateClosure(
  points
) {

  if (
    points.length < 2
  ) {

    return {

      distance_m:
        Infinity,

      valid:
        false,

    };

  }


  const first =
    points[0];


  const last =
    points[
      points.length - 1
    ];


  const distance =
    distanceMeters(
      first,
      last
    );


  console.log(
    `\n🏁 Tancament de la ruta: ${distance.toFixed(
      2
    )} m`
  );


  return {

    distance_m:
      distance,

    valid:
      distance <=
      NODE_TOLERANCE_METERS,

  };

}


// ============================================================
// GEOJSON
// ============================================================

function toGeoJSON(
  points,
  route,
  diagnostics,
  continuity,
  closure,
  geometry
) {

  const valid =
    continuity.valid &&
    closure.valid;


  return {

    type:
      "FeatureCollection",


    properties: {

      builder:
        "testRouteBuilder",

      version:
        "0.5",

      source:
        "test-route.json",

      target_km:
        safeNumber(
          route.targetKm
        ),

      distance_network_km:
        safeNumber(
          route.distance_network_km
        ),

      distance_total_km:
        safeNumber(
          route.distance_total_km
        ),

      ascent_m:
        safeNumber(
          route.ascent_m
        ),

      descent_m:
        safeNumber(
          route.descent_m
        ),

      segmentCount:
        geometry.segmentCount,

      junctionCount:
        geometry.junctionCount,

      pointCount:
        points.length,

      reconstructedDistance_km:
        round(
          continuity.totalDistance_m /
          1000,
          3
        ),

      maxJump_m:
        round(
          continuity.maxJump_m,
          2
        ),

      jumpsOverLimit:
        continuity.jumps.length,

      closureDistance_m:
        round(
          closure.distance_m,
          2
        ),

      valid,

    },


    features: [

      {

        type:
          "Feature",

        properties: {

          type:
            "route",

          target_km:
            safeNumber(
              route.targetKm
            ),

          distance_km:
            round(
              continuity.totalDistance_m /
              1000,
              3
            ),

          valid,

        },


        geometry: {

          type:
            "LineString",

          coordinates:
            points.map(
              point =>
                [
                  point.lon,
                  point.lat,
                  Number.isFinite(
                    point.elevation
                  )
                    ? point.elevation
                    : 0,
                ]
            ),

        },

      },

    ],


    diagnostics,

  };

}


// ============================================================
// RESUM
// ============================================================

function printSummary(
  route,
  geometry,
  continuity,
  closure
) {

  console.log(
    "\n=========================================="
  );


  console.log(
    "📊 RESULTAT ROUTE BUILDER v0.5"
  );


  console.log(
    "=========================================="
  );


  console.log(
    `🎯 Objectiu: ${safeNumber(
      route.targetKm
    )} km`
  );


  console.log(
    `📏 Distància graf: ${safeNumber(
      route.distance_network_km
    ).toFixed(3)} km`
  );


  console.log(
    `📏 Distància Finder total: ${safeNumber(
      route.distance_total_km
    ).toFixed(3)} km`
  );


  console.log(
    `📏 Distància geometria reconstruïda: ${(
      continuity.totalDistance_m /
      1000
    ).toFixed(3)} km`
  );


  console.log(
    `🛤 Segments: ${geometry.segmentCount}`
  );


  console.log(
    `🔗 Junctions: ${geometry.junctionCount}`
  );


  console.log(
    `📍 Punts finals: ${geometry.points.length}`
  );


  console.log(
    `📐 Salt màxim: ${continuity.maxJump_m.toFixed(
      2
    )} m`
  );


  console.log(
    `⚠️ Salts > ${MAX_JUMP_METERS} m: ${continuity.jumps.length}`
  );


  console.log(
    `🏁 Tancament: ${closure.distance_m.toFixed(
      2
    )} m`
  );


  console.log(
    ""
  );


  if (
    continuity.valid &&
    closure.valid
  ) {

    console.log(
      "✅ GEOMETRIA VÀLIDA"
    );


    console.log(
      "   No s'han detectat salts artificials."
    );

  } else {

    console.log(
      "❌ GEOMETRIA NO VÀLIDA"
    );


    if (
      !continuity.valid
    ) {

      console.log(
        `   Hi ha ${continuity.jumps.length} salts superiors a ${MAX_JUMP_METERS} m.`
      );

    }


    if (
      !closure.valid
    ) {

      console.log(
        `   La ruta no tanca dins la tolerància de ${NODE_TOLERANCE_METERS} m.`
      );

    }

  }

}


// ============================================================
// MAIN
// ============================================================

function main() {

  console.log(
    "🌿 TEST ROUTE BUILDER v0.5"
  );


  console.log(
    "=========================================="
  );


  // ----------------------------------------------------------
  // Fitxers
  // ----------------------------------------------------------

  console.log(
    `📂 Data: ${DATA_DIR}`
  );


  console.log(
    `📄 Ruta: ${ROUTE_FILE}`
  );


  console.log(
    `📄 Graf: ${GRAPH_FILE}`
  );


  console.log(
    `📄 Nodes: ${NODES_FILE}`
  );


  console.log(
    `📂 GPX: ${GPX_DIR}`
  );


  // ----------------------------------------------------------
  // Comprovar carpeta GPX
  // ----------------------------------------------------------

  if (
    !fs.existsSync(
      GPX_DIR
    )
  ) {

    throw new Error(
      `No existeix la carpeta GPX: ${GPX_DIR}`
    );

  }


  // ----------------------------------------------------------
  // Carregar
  // ----------------------------------------------------------

  console.log(
    "\n🔎 Carregant fitxers..."
  );


  const route =
    loadJSON(
      ROUTE_FILE
    );


  const graph =
    loadJSON(
      GRAPH_FILE
    );


  const nodeData =
    loadJSON(
      NODES_FILE
    );


  console.log(
    `   Ruta: ${route.version || "?"}`
  );


  console.log(
    `   Graf: ${graph.version || "?"}`
  );


  console.log(
    `   Nodes: ${
      (nodeData.nodes || []).length
    }`
  );


  // ----------------------------------------------------------
  // Indexs
  // ----------------------------------------------------------

  const edgeIndex =
    buildEdgeIndex(
      graph
    );


  const nodeIndex =
    buildNodeIndex(
      nodeData
    );


  console.log(
    `   Arestes indexades: ${edgeIndex.size}`
  );


  console.log(
    `   Nodes indexats: ${nodeIndex.size}`
  );


  // ----------------------------------------------------------
  // Validar ruta
  // ----------------------------------------------------------

  validateRoute(
    route,
    edgeIndex
  );


  // ----------------------------------------------------------
  // Mostrar arestes
  // ----------------------------------------------------------

  console.log(
    "\n🔗 ARESTES DE LA RUTA"
  );


  console.log(
    "------------------------------------------"
  );


  route.edges.forEach(
    (
      edgeId,
      index
    ) => {

      const edge =
        edgeIndex.get(
          edgeId
        );


      console.log(
        ` ${String(
          index + 1
        ).padStart(
          2,
          " "
        )}. ${edgeId}`
      );


      console.log(
        `     ${edge.from} → ${edge.to}`
      );


      console.log(
        `     ${edge.segment || "-"}`
      );


      console.log(
        `     tipus: ${
          edge.type || "segment"
        }`
      );


      console.log(
        `     direcció: ${
          edge.direction || "-"
        }`
      );


      console.log(
        `     distància graf: ${
          safeNumber(
            edge.distance_km
          ).toFixed(3)
        } km`
      );

    }
  );


  // ----------------------------------------------------------
  // Reconstruir
  // ----------------------------------------------------------

  const geometry =
    reconstructRoute(
      route,
      edgeIndex,
      nodeIndex
    );


  // ----------------------------------------------------------
  // Validacions
  // ----------------------------------------------------------

  console.log(
    "\n🔎 Validant geometria..."
  );


  const continuity =
    validateContinuity(
      geometry.points
    );


  const closure =
    validateClosure(
      geometry.points
    );


  // ----------------------------------------------------------
  // Resum
  // ----------------------------------------------------------

  printSummary(
    route,
    geometry,
    continuity,
    closure
  );


  // ----------------------------------------------------------
  // GeoJSON
  // ----------------------------------------------------------

  console.log(
    "\n💾 Generant GeoJSON..."
  );


  const geojson =
    toGeoJSON(
      geometry.points,
      route,
      geometry.diagnostics,
      continuity,
      closure,
      geometry
    );


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
    `📄 Fitxer: ${OUTPUT_FILE}`
  );


  console.log(
    "\n=========================================="
  );


  console.log(
    "✅ TEST ROUTE BUILDER v0.5 FINALITZAT"
  );


  console.log(
    "=========================================="
  );

}


// ============================================================
// EXECUCIÓ
// ============================================================

try {

  main();

} catch (
  error
) {

  console.error(
    "\n=========================================="
  );


  console.error(
    "❌ ERROR EXECUTANT ROUTE BUILDER v0.5"
  );


  console.error(
    "=========================================="
  );


  console.error(
    error.stack ||
    error.message
  );


  process.exit(
    1
  );

}