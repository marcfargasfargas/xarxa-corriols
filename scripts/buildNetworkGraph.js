/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
v0.7

Fitxer: buildNetworkGraph.js

Objectiu:
- Construir el graf DEFINITIU de la xarxa
- Utilitzar network-nodes.json
- Utilitzar network-inventory.json
- Utilitzar els nodes reals consolidats
- Incorporar els terminals
- Dividir cada GPX pels nodes que hi intervenen
- Crear arestes entre nodes consecutius
- Fer les arestes bidireccionals
- Conservar distància i desnivell
- Validar que tots els segments tenen camí al graf

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

const INVENTORY_FILE =
  path.join(
    DATA_DIR,
    "network-inventory.json"
  );

const NODES_FILE =
  path.join(
    DATA_DIR,
    "network-nodes.json"
  );

const OUTPUT_FILE =
  path.join(
    DATA_DIR,
    "network-graph.json"
  );


// ============================================================
// UTILITATS
// ============================================================

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


function terminalId(
  segment,
  side
) {

  return `TERMINAL_${segment}_${side}`;

}


function occurrenceKey(
  nodeId,
  position
) {

  return (
    `${nodeId}@${position.toFixed(6)}`
  );

}


function partialValue(
  totalValue,
  startPosition,
  endPosition
) {

  return (
    totalValue *
    Math.abs(
      endPosition -
      startPosition
    )
  );

}


// ============================================================
// OBTENIR TOTS ELS PUNTS DE RUPTURA D'UN SEGMENT
// ============================================================

function collectSegmentOccurrences(
  segment,
  realNodes,
  terminals
) {

  const occurrences = [];


  // ==========================================================
  // 1. TERMINALS
  // ==========================================================

  for (
    const terminal
    of terminals
  ) {

    if (
      terminal.segment !==
      segment.file
    ) {

      continue;

    }


    const position =
      terminal.side === "start"
        ? 0
        : 1;


    occurrences.push({

      nodeId:
        terminalId(
          terminal.segment,
          terminal.side
        ),

      position,

      source:
        "terminal",

    });

  }


  // ==========================================================
  // 2. NODES REALS
  // ==========================================================

  for (
    const node
    of realNodes
  ) {


    // ========================================================
    // 2A. CONNEXIONS EXTREM ↔ EXTREM
    // ========================================================

    for (
      const connection
      of node.endpointConnections
    ) {

      if (
        connection.segmentA ===
        segment.file
      ) {

        const position =
          connection.sideA ===
          "start"
            ? 0
            : 1;


        occurrences.push({

          nodeId:
            node.id,

          position,

          source:
            "endpoint-endpoint",

        });

      }


      if (
        connection.segmentB ===
        segment.file
      ) {

        const position =
          connection.sideB ===
          "start"
            ? 0
            : 1;


        occurrences.push({

          nodeId:
            node.id,

          position,

          source:
            "endpoint-endpoint",

        });

      }

    }


    // ========================================================
    // 2B. CONNEXIONS EXTREM ↔ INTERIOR
    // ========================================================

    for (
      const connection
      of node.interiorConnections
    ) {

      // ------------------------------------------------------
      // Cas A:
      // el segment és l'EXTREM de la connexió
      // ------------------------------------------------------

      if (
        connection.segmentA ===
        segment.file
      ) {

        const position =
          connection.sideA ===
          "start"
            ? 0
            : 1;


        occurrences.push({

          nodeId:
            node.id,

          position,

          source:
            "endpoint-interior-endpoint",

        });

      }


      // ------------------------------------------------------
      // Cas B:
      // el segment conté el PUNT INTERIOR
      // ------------------------------------------------------

      if (
        connection.segmentB ===
        segment.file
      ) {

        const position =
          clamp(
            Number(
              connection.positionAlongSegment
            ),
            0,
            1
          );


        occurrences.push({

          nodeId:
            node.id,

          position,

          source:
            "endpoint-interior",

        });

      }

    }

  }


  return occurrences;

}


// ============================================================
// ELIMINAR DUPLICACIONS
// ============================================================

function deduplicateOccurrences(
  occurrences
) {

  const map =
    new Map();


  for (
    const occurrence
    of occurrences
  ) {

    const key =
      occurrenceKey(
        occurrence.nodeId,
        occurrence.position
      );


    if (
      !map.has(key)
    ) {

      map.set(
        key,
        occurrence
      );

    }

  }


  return Array.from(
    map.values()
  );

}


// ============================================================
// CONSTRUIR ARESTES D'UN SEGMENT
// ============================================================

function buildSegmentEdges(
  segment,
  occurrences
) {

  const sorted =
    [...occurrences]
      .sort(
        (a, b) =>
          a.position -
          b.position
      );


  const edges = [];


  for (
    let i = 0;
    i <
      sorted.length - 1;
    i++
  ) {

    const from =
      sorted[i];

    const to =
      sorted[i + 1];


    // --------------------------------------------------------
    // Evitar longitud zero
    // --------------------------------------------------------

    if (
      Math.abs(
        to.position -
        from.position
      ) <
      0.000001
    ) {

      continue;

    }


    const distance_km =
      partialValue(
        Number(
          segment.distance_km || 0
        ),
        from.position,
        to.position
      );


    const ascent_m =
      partialValue(
        Number(
          segment.ascent_m || 0
        ),
        from.position,
        to.position
      );


    const descent_m =
      partialValue(
        Number(
          segment.descent_m || 0
        ),
        from.position,
        to.position
      );


    edges.push({

      id:
        `EDGE_${segment.file}_${i + 1}`,

      type:
        "segment",

      segment:
        segment.file,

      from:
        from.nodeId,

      to:
        to.nodeId,

      positionStart:
        from.position,

      positionEnd:
        to.position,

      distance_km:
        Number(
          distance_km.toFixed(3)
        ),

      ascent_m:
        Number(
          ascent_m.toFixed(1)
        ),

      descent_m:
        Number(
          descent_m.toFixed(1)
        ),

      direction:
        "forward",

      bidirectional:
        true,

    });

  }


  return edges;

}


// ============================================================
// CREAR NODES DEL GRAF
// ============================================================

function buildGraphNodes(
  realNodes,
  terminals
) {

  const graphNodes = [];


  // ----------------------------------------------------------
  // Nodes reals
  // ----------------------------------------------------------

  for (
    const node
    of realNodes
  ) {

    graphNodes.push({

      id:
        node.id,

      type:
        "real-node",

      point:
        node.point,

      source:
        node.source,

    });

  }


  // ----------------------------------------------------------
  // Terminals
  // ----------------------------------------------------------

  for (
    const terminal
    of terminals
  ) {

    graphNodes.push({

      id:
        terminalId(
          terminal.segment,
          terminal.side
        ),

      type:
        "terminal",

      segment:
        terminal.segment,

      side:
        terminal.side,

      point:
        terminal.point,

    });

  }


  return graphNodes;

}


// ============================================================
// ADJACÈNCIA
// ============================================================

function buildAdjacency(
  nodes,
  edges
) {

  const adjacency = {};


  for (
    const node
    of nodes
  ) {

    adjacency[node.id] = [];

  }


  for (
    const edge
    of edges
  ) {

    if (
      !adjacency[edge.from]
    ) {

      adjacency[edge.from] = [];

    }


    if (
      !adjacency[edge.to]
    ) {

      adjacency[edge.to] = [];

    }


    adjacency[edge.from].push({

      edgeId:
        edge.id,

      to:
        edge.to,

      direction:
        edge.direction,

      segment:
        edge.segment,

      distance_km:
        edge.distance_km,

      ascent_m:
        edge.ascent_m,

      descent_m:
        edge.descent_m,

    });

  }


  return adjacency;

}


// ============================================================
// VALIDAR SEGMENTS
// ============================================================

function validateSegments(
  graphSegments
) {

  return graphSegments.filter(
    segment =>
      segment.edgeCount === 0
  );

}


// ============================================================
// VALIDAR NODES
// ============================================================

function validateNodes(
  graphNodes,
  adjacency
) {

  return graphNodes.filter(
    node =>
      !adjacency[node.id] ||
      adjacency[node.id].length === 0
  );

}


// ============================================================
// CONSTRUCCIÓ PRINCIPAL
// ============================================================

function build() {

  console.log(
    "🌿 Construint graf DEFINITIU de la xarxa v0.7..."
  );


  // ==========================================================
  // CARREGAR INVENTARI
  // ==========================================================

  if (
    !fs.existsSync(
      INVENTORY_FILE
    )
  ) {

    throw new Error(
      `No existeix: ${INVENTORY_FILE}`
    );

  }


  const inventory =
    JSON.parse(
      fs.readFileSync(
        INVENTORY_FILE,
        "utf8"
      )
    );


  // ==========================================================
  // CARREGAR NODES
  // ==========================================================

  if (
    !fs.existsSync(
      NODES_FILE
    )
  ) {

    throw new Error(
      `No existeix: ${NODES_FILE}`
    );

  }


  const nodeData =
    JSON.parse(
      fs.readFileSync(
        NODES_FILE,
        "utf8"
      )
    );


  const realNodes =
    nodeData.nodes || [];

  const terminals =
    nodeData.terminals || [];


  console.log(
    `📂 Segments inventariats: ${
      inventory.segmentCount
    }`
  );

  console.log(
    `🔵 Nodes reals: ${
      realNodes.length
    }`
  );

  console.log(
    `🔚 Terminals: ${
      terminals.length
    }`
  );


  // ==========================================================
  // CREAR NODES DEL GRAF
  // ==========================================================

  const graphNodes =
    buildGraphNodes(
      realNodes,
      terminals
    );


  // ==========================================================
  // CREAR ARESTES
  // ==========================================================

  const graphEdges = [];

  const graphSegments = [];


  let segmentsWithBreaks =
    0;

  let segmentsWithoutBreaks =
    0;


  // ==========================================================
  // PROCESSAR CADA SEGMENT
  // ==========================================================

  for (
    const segment
    of inventory.segments
  ) {

    const occurrences =
      collectSegmentOccurrences(
        segment,
        realNodes,
        terminals
      );


    const uniqueOccurrences =
      deduplicateOccurrences(
        occurrences
      );


    const sortedOccurrences =
      [...uniqueOccurrences]
        .sort(
          (a, b) =>
            a.position -
            b.position
        );


    if (
      sortedOccurrences.length >= 2
    ) {

      segmentsWithBreaks++;

    } else {

      segmentsWithoutBreaks++;

    }


    const segmentEdges =
      buildSegmentEdges(
        segment,
        sortedOccurrences
      );


    // --------------------------------------------------------
    // Crear les dues direccions
    // --------------------------------------------------------

    for (
      const edge
      of segmentEdges
    ) {

      // Direcció original

      graphEdges.push(
        edge
      );


      // Direcció inversa

      graphEdges.push({

        ...edge,

        id:
          `${edge.id}_REV`,

        from:
          edge.to,

        to:
          edge.from,

        positionStart:
          edge.positionEnd,

        positionEnd:
          edge.positionStart,

        ascent_m:
          edge.descent_m,

        descent_m:
          edge.ascent_m,

        direction:
          "reverse",

      });

    }


    // --------------------------------------------------------
    // Informació del segment
    // --------------------------------------------------------

    graphSegments.push({

      id:
        segment.file,

      distance_km:
        Number(
          segment.distance_km || 0
        ),

      ascent_m:
        Number(
          segment.ascent_m || 0
        ),

      descent_m:
        Number(
          segment.descent_m || 0
        ),

      start:
        segment.start,

      end:
        segment.end,

      nodePath:
        sortedOccurrences.map(
          occurrence => ({

            nodeId:
              occurrence.nodeId,

            position:
              occurrence.position,

          })
        ),

      occurrenceCount:
        sortedOccurrences.length,

      edgeCount:
        segmentEdges.length,

      bidirectional:
        true,

    });

  }


  // ==========================================================
  // ADJACÈNCIA
  // ==========================================================

  const adjacency =
    buildAdjacency(
      graphNodes,
      graphEdges
    );


  // ==========================================================
  // VALIDACIONS
  // ==========================================================

  const segmentsWithoutEdges =
    validateSegments(
      graphSegments
    );


  const nodesWithoutAdjacency =
    validateNodes(
      graphNodes,
      adjacency
    );


  console.log("");

  console.log(
    "📊 VALIDACIÓ DEL GRAF"
  );

  console.log(
    `🛤 Segments totals: ${
      graphSegments.length
    }`
  );

  console.log(
    `🧩 Segments amb nodes de ruptura: ${
      segmentsWithBreaks
    }`
  );

  console.log(
    `⚠️ Segments amb menys de 2 nodes: ${
      segmentsWithoutBreaks
    }`
  );

  console.log(
    `🔗 Arestes direccionals: ${
      graphEdges.length
    }`
  );

  console.log(
    `🔵 Nodes totals: ${
      graphNodes.length
    }`
  );

  console.log(
    `   ├─ Nodes reals: ${
      realNodes.length
    }`
  );

  console.log(
    `   └─ Terminals: ${
      terminals.length
    }`
  );

  console.log("");

  console.log(
    `❌ Segments sense arestes: ${
      segmentsWithoutEdges.length
    }`
  );

  console.log(
    `❌ Nodes sense adjacència: ${
      nodesWithoutAdjacency.length
    }`
  );


  // ==========================================================
  // SI HI HA ERRORS, NO GENERAR EL GRAF FINAL
  // ==========================================================

  if (
    segmentsWithoutEdges.length > 0
  ) {

    console.log("");

    console.error(
      "❌ EL GRAF NO ÉS VÀLID."
    );

    console.error(
      "Segments sense arestes:"
    );


    segmentsWithoutEdges
      .forEach(
        segment =>
          console.error(
            `   ${segment.id}`
          )
      );


    throw new Error(
      "Hi ha segments sense cap aresta."
    );

  }


  if (
    nodesWithoutAdjacency.length > 0
  ) {

    console.log("");

    console.error(
      "❌ EL GRAF NO ÉS VÀLID."
    );

    console.error(
      "Nodes sense connexions:"
    );


    nodesWithoutAdjacency
      .forEach(
        node =>
          console.error(
            `   ${node.id}`
          )
      );


    throw new Error(
      "Hi ha nodes sense adjacència."
    );

  }


  // ==========================================================
  // TERMINALS
  // ==========================================================

  const terminalIds =
    terminals.map(
      terminal =>
        terminalId(
          terminal.segment,
          terminal.side
        )
    );


  // ==========================================================
  // OBJECTE FINAL
  // ==========================================================

  const graph = {

    version:
      "0.7",

    type:
      "network-graph",

    generatedAt:
      new Date().toISOString(),

    source: {

      inventory:
        "network-inventory.json",

      nodes:
        "network-nodes.json",

    },

    segmentCount:
      graphSegments.length,

    nodeCount:
      graphNodes.length,

    edgeCount:
      graphEdges.length,

    realNodeCount:
      realNodes.length,

    terminalCount:
      terminals.length,

    terminalIds,

    validation: {

      segmentsWithoutEdges:
        segmentsWithoutEdges.length,

      nodesWithoutAdjacency:
        nodesWithoutAdjacency.length,

      valid:
        true,

    },

    segments:
      graphSegments,

    nodes:
      graphNodes,

    edges:
      graphEdges,

    adjacency,

  };


  // ==========================================================
  // GUARDAR
  // ==========================================================

  fs.writeFileSync(

    OUTPUT_FILE,

    JSON.stringify(
      graph,
      null,
      2
    ),

    "utf8"

  );


  // ==========================================================
  // RESULTAT FINAL
  // ==========================================================

  console.log("");

  console.log(
    "✅ GRAF DEFINITIU VÀLID CREAT."
  );

  console.log(
    `🛤 Segments: ${
      graph.segmentCount
    }`
  );

  console.log(
    `🔵 Nodes: ${
      graph.nodeCount
    }`
  );

  console.log(
    `🔗 Arestes direccionals: ${
      graph.edgeCount
    }`
  );

  console.log(
    `🔚 Terminals: ${
      graph.terminalCount
    }`
  );

  console.log("");

  console.log(
    "✔️ Segments sense arestes: 0"
  );

  console.log(
    "✔️ Nodes sense adjacència: 0"
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
    "❌ Error construint el graf definitiu:"
  );

  console.error(
    error.stack ||
    error.message
  );

  process.exit(1);

}