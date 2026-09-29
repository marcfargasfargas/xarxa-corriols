// ============================================================
// ROUTE BUILDER
// RECONSTRUCTION
// Xarxa de Corriols d'Alàs i Cerc
// ============================================================

import {
  loadGPX,
} from "./data.js";

import {
  extractSegmentSlice,
} from "./geometry.js";

import {
  getEdgePositions,
  validateNodePoint,
  appendPoints,
} from "./validation.js";


// ============================================================
// UTILITAT
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

    const routeEdge =
      route.edges[i];


    const edgeId =
      typeof routeEdge === "string"
        ? routeEdge
        : routeEdge?.edgeId;


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
// EXPORTS
// ============================================================

export {

  reconstructRoute,

};