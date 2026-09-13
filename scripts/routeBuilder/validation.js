// ============================================================
// ROUTE BUILDER
// VALIDATION
// Xarxa de Corriols d'Alàs i Cerc
// ============================================================

import {
  distanceBetweenPoints,
  distanceMeters,
} from "./geometry.js";


// ============================================================
// CONFIGURACIÓ
// ============================================================

const NODE_TOLERANCE_METERS =
  30;


const MAX_JUMP_METERS =
  100;


const MIN_POINT_DISTANCE_METERS =
  0.01;


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

    const routeEdge =
      route.edges[i];


    const edgeId =
      typeof routeEdge === "string"
        ? routeEdge
        : routeEdge?.edgeId;


    if (!edgeId) {

      throw new Error(
        `Aresta ${i + 1} sense edgeId vàlid.`
      );

    }


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
        `Node: ${nodeId}`,
        `Context: ${context}`,
        `Distància: ${distance.toFixed(2)} m`,
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
    `📐 Salt màxim: ${maxJump.toFixed(2)} m`
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


      console.log(
        `      DES DE: lat=${jump.from.lat} lon=${jump.from.lon}`
      );


      console.log(
        `      FINS A: lat=${jump.to.lat} lon=${jump.to.lon}`
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
// EXPORTS
// ============================================================

export {

  NODE_TOLERANCE_METERS,

  MAX_JUMP_METERS,

  MIN_POINT_DISTANCE_METERS,

  validateRoute,

  getEdgePositions,

  validateNodePoint,

  appendPoints,

  validateContinuity,

  validateClosure,

};