/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
v0.7.3

buildNetworkGraph.js

Objectius:
- Construir el graf definitiu de la xarxa.
- Conservar els 234 nodes reals.
- Conservar els terminals.
- Construir les arestes físiques dels segments.
- Crear junctions de 0 m només quan la informació
  topològica original demostra que dos nodes comparteixen
  el mateix punt de connexió.
- NO fusionar nodes.
- NO crear junctions només perquè dues ocurrències
  tinguin el mateix position.
- Tractar els terminals com punts d'entrada/sortida.
- Validar que tots els nodes tenen adjacència.

Cas especial:
plaça.gpx

TERMINAL_plaça.gpx_start
          |
          | 0.017 km
          |
       NODE_046

No:
TERMINAL_plaça.gpx_start
          |
          | 0 m
          |
       NODE_046

Cas 156/157:

156.gpx END
     |
     +---- NODE_031
     |
     +---- NODE_126
              |
              | junction 0 m
              |
          NODE_031

157.gpx START
     |
     +---- NODE_031
     |
     +---- NODE_126

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

const VERSION = "0.7.3";


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


function positionKey(
  position
) {
  return Number(position).toFixed(6);
}


function occurrenceKey(
  nodeId,
  position
) {
  return `${nodeId}@${positionKey(position)}`;
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
// TERMINAL INDEX
// ============================================================

function buildTerminalIndex(
  terminals
) {
  const index =
    new Map();

  for (
    const terminal
    of terminals
  ) {

    const key =
      `${terminal.segment}|${terminal.side}`;

    index.set(
      key,
      terminal
    );
  }

  return index;
}


// ============================================================
// RECOLLIR OCURRENCIES
// ============================================================

function collectSegmentOccurrences(
  segment,
  realNodes,
  terminals
) {

  const occurrences = [];


  // ----------------------------------------------------------
  // TERMINALS
  // ----------------------------------------------------------

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

      isTerminal:
        true,

      terminalSide:
        terminal.side,

    });
  }


  // ----------------------------------------------------------
  // NODES REALS
  // ----------------------------------------------------------

  for (
    const node
    of realNodes
  ) {

    // ========================================================
    // ENDPOINT ↔ ENDPOINT
    // ========================================================

    for (
      const connection
      of (
        node.endpointConnections ||
        []
      )
    ) {

      if (
        connection.segmentA ===
        segment.file
      ) {

        const position =
          connection.sideA === "start"
            ? 0
            : 1;

        occurrences.push({

          nodeId:
            node.id,

          position,

          source:
            "endpoint-endpoint",

          isTerminal:
            false,

          endpointSide:
            connection.sideA,

          connectionType:
            "endpoint-endpoint",

          pairedSegment:
            connection.segmentB,

          pairedSide:
            connection.sideB,

          endpointDistance_m:
            Number(
              connection.endpointDistance_m ||
              0
            ),

        });
      }


      if (
        connection.segmentB ===
        segment.file
      ) {

        const position =
          connection.sideB === "start"
            ? 0
            : 1;

        occurrences.push({

          nodeId:
            node.id,

          position,

          source:
            "endpoint-endpoint",

          isTerminal:
            false,

          endpointSide:
            connection.sideB,

          connectionType:
            "endpoint-endpoint",

          pairedSegment:
            connection.segmentA,

          pairedSide:
            connection.sideA,

          endpointDistance_m:
            Number(
              connection.endpointDistance_m ||
              0
            ),

        });
      }
    }


    // ========================================================
    // ENDPOINT ↔ INTERIOR
    // ========================================================

    for (
      const connection
      of (
        node.interiorConnections ||
        []
      )
    ) {

      // ------------------------------------------------------
      // Aquest segment és l'extrem
      // ------------------------------------------------------

      if (
        connection.segmentA ===
        segment.file
      ) {

        const position =
          connection.sideA === "start"
            ? 0
            : 1;

        occurrences.push({

          nodeId:
            node.id,

          position,

          source:
            "endpoint-interior-endpoint",

          isTerminal:
            false,

          endpointSide:
            connection.sideA,

          connectionType:
            "endpoint-interior",

          pairedSegment:
            connection.segmentB,

          pairedSide:
            null,

          endpointDistance_m:
            Number(
              connection.distance_m ||
              0
            ),

        });
      }


      // ------------------------------------------------------
      // Aquest segment conté el punt interior
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

          isTerminal:
            false,

          endpointSide:
            null,

          connectionType:
            "endpoint-interior",

          pairedSegment:
            connection.segmentA,

          pairedSide:
            connection.sideA,

          endpointDistance_m:
            Number(
              connection.distance_m ||
              0
            ),

        });
      }
    }
  }


  return occurrences;
}


// ============================================================
// DEDUPLICACIÓ EXACTA
//
// Només eliminem la mateixa ocurrència del mateix node
// en la mateixa posició.
//
// NO fusionem nodes diferents.
// ============================================================

function deduplicateExactOccurrences(
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
  ).sort(
    (a, b) =>
      a.position -
      b.position
  );
}


// ============================================================
// AGRUPAR PER POSICIÓ
// ============================================================

function groupOccurrencesByPosition(
  occurrences
) {

  const groups =
    new Map();

  for (
    const occurrence
    of occurrences
  ) {

    const key =
      positionKey(
        occurrence.position
      );

    if (
      !groups.has(key)
    ) {

      groups.set(
        key,
        []
      );

    }

    groups
      .get(key)
      .push(
        occurrence
      );
  }

  return groups;
}


// ============================================================
// ESCOLLIR REPRESENTANT DE POSICIÓ
//
// Aquesta funció només serveix per construir la línia
// geomètrica del segment.
//
// Si hi ha terminal, el terminal té prioritat.
//
// En cas contrari escollim el node real de forma
// determinista.
//
// IMPORTANT:
// els altres nodes no desapareixen.
// Es connectaran mitjançant junctions quan correspongui.
// ============================================================

function choosePositionRepresentative(
  group
) {

  const terminals =
    group.filter(
      occurrence =>
        occurrence.isTerminal
    );

  if (
    terminals.length >
    0
  ) {

    return terminals[0];

  }


  const sorted =
    [...group].sort(
      (a, b) =>
        a.nodeId.localeCompare(
          b.nodeId,
          undefined,
          {
            numeric: true
          }
        )
    );

  return sorted[0];
}


// ============================================================
// COMPROVAR SI UNA OCURRENCIA ÉS UNA CONNEXIÓ REAL
// ENTRE DOS NODES EN EL MATEIX PUNT.
//
// La regla principal de v0.7.3:
//
// NO crear junction perquè:
//
// NODE_A @ 0
// NODE_B @ 0
//
// apareguin simplement en el mateix segment.
//
// Només crear junction quan les dades de connexió
// mostren que aquesta relació existeix realment.
//
// El cas clau:
//
// 156 end ↔ 157 start
//
// produeix NODE_126 / NODE_031 en els dos segments.
//
// ============================================================

function shouldCreateJunction(
  occurrenceA,
  occurrenceB,
  segment
) {

  // ----------------------------------------------------------
  // Mai terminal ↔ node real per posició.
  //
  // El terminal és una entrada física al segment.
  // ----------------------------------------------------------

  if (
    occurrenceA.isTerminal ||
    occurrenceB.isTerminal
  ) {

    return false;

  }


  // ----------------------------------------------------------
  // Han de ser nodes diferents.
  // ----------------------------------------------------------

  if (
    occurrenceA.nodeId ===
    occurrenceB.nodeId
  ) {

    return false;

  }


  // ----------------------------------------------------------
  // Només considerem junctions en extrems.
  //
  // Això evita fabricar junctions entre dos punts interiors
  // que simplement coincideixen en position.
  // ----------------------------------------------------------

  const isEndpointA =
    occurrenceA.position === 0 ||
    occurrenceA.position === 1;

  const isEndpointB =
    occurrenceB.position === 0 ||
    occurrenceB.position === 1;

  if (
    !isEndpointA ||
    !isEndpointB
  ) {

    return false;

  }


  // ----------------------------------------------------------
  // Necessitem una connexió topològica de tipus
  // endpoint-endpoint.
  // ----------------------------------------------------------

  const endpointConnectionA =
    occurrenceA.connectionType ===
    "endpoint-endpoint";

  const endpointConnectionB =
    occurrenceB.connectionType ===
    "endpoint-endpoint";


  if (
    !endpointConnectionA &&
    !endpointConnectionB
  ) {

    return false;

  }


  // ----------------------------------------------------------
  // En aquest punt tenim dos nodes que provenen
  // d'una relació endpoint-endpoint.
  //
  // Això és suficient per mantenir-los connectats
  // com una junction.
  // ----------------------------------------------------------

  return true;
}


// ============================================================
// CREAR JUNCTIONS
//
// NOMÉS entre nodes reals que:
//
// - ocupen exactament la mateixa posició topològica
// - són extrems
// - provenen d'una connexió endpoint-endpoint
// - no són terminals
//
// NO creem junctions terminal ↔ node.
// ============================================================

function buildJunctionEdges(
  segment,
  occurrences
) {

  const junctionEdges = [];

  const groups =
    groupOccurrencesByPosition(
      occurrences
    );


  for (
    const [
      position,
      group
    ]
    of groups
  ) {

    if (
      group.length <
      2
    ) {

      continue;

    }


    // --------------------------------------------------------
    // Comparar parelles
    // --------------------------------------------------------

    for (
      let i = 0;
      i <
        group.length;
      i++
    ) {

      for (
        let j = i + 1;
        j <
          group.length;
        j++
      ) {

        const A =
          group[i];

        const B =
          group[j];


        if (
          !shouldCreateJunction(
            A,
            B,
            segment
          )
        ) {

          continue;

        }


        const nodeA =
          A.nodeId;

        const nodeB =
          B.nodeId;


        // ----------------------------------------------------
        // ID determinista
        // ----------------------------------------------------

        const sortedIds =
          [
            nodeA,
            nodeB
          ].sort();


        const baseId =
          `JUNCTION_${segment.file}_${position}_${sortedIds[0]}_${sortedIds[1]}`;


        // ----------------------------------------------------
        // Evitar duplicats
        // ----------------------------------------------------

        if (
          junctionEdges.some(
            edge =>
              edge.id ===
              baseId
          )
        ) {

          continue;

        }


        // ----------------------------------------------------
        // Direcció A → B
        // ----------------------------------------------------

        junctionEdges.push({

          id:
            baseId,

          type:
            "junction",

          segment:
            segment.file,

          from:
            nodeA,

          to:
            nodeB,

          position:
            Number(position),

          distance_km:
            0,

          ascent_m:
            0,

          descent_m:
            0,

          direction:
            "junction",

          bidirectional:
            true,

        });


        // ----------------------------------------------------
        // Direcció B → A
        // ----------------------------------------------------

        junctionEdges.push({

          id:
            `${baseId}_REV`,

          type:
            "junction",

          segment:
            segment.file,

          from:
            nodeB,

          to:
            nodeA,

          position:
            Number(position),

          distance_km:
            0,

          ascent_m:
            0,

          descent_m:
            0,

          direction:
            "junction",

          bidirectional:
            true,

        });

      }
    }
  }


  return junctionEdges;
}


// ============================================================
// ARESTES GEOMÈTRIQUES
//
// Una sola continuació per posició.
//
// Exemple plaça:
//
// TERMINAL @ 0
// NODE_046 @ 0
// NODE_046 @ 1
//
// El node NODE_046 @ 0 no representa un punt físic
// diferent del NODE_046 @ 1.
//
// Per tant:
//
// TERMINAL @ 0
// NODE_046 @ 1
//
// i una única aresta de 17 m.
//
// ============================================================

function buildSegmentEdges(
  segment,
  occurrences
) {

  const groups =
    groupOccurrencesByPosition(
      occurrences
    );


  const representatives = [];


  for (
    const [
      position,
      group
    ]
    of groups
  ) {

    const representative =
      choosePositionRepresentative(
        group
      );


    // --------------------------------------------------------
    // Cas especial:
    //
    // Si el mateix node apareix al mateix segment a
    // position 0 i 1, NO necessitem dues ocurrències.
    //
    // Això és exactament el que passava amb plaça.gpx.
    // --------------------------------------------------------

    representatives.push({

      ...representative,

      position:
        Number(position),

    });

  }


  // ----------------------------------------------------------
  // Ordenar
  // ----------------------------------------------------------

  representatives.sort(
    (a, b) =>
      a.position -
      b.position
  );


  // ----------------------------------------------------------
  // Si el mateix node és representant de dues posicions,
  // mantenim només la primera i l'última necessàries.
  //
  // Això evita:
  //
  // NODE_046 @ 0
  // NODE_046 @ 1
  //
  // com dues ocurrències inútils.
  // ----------------------------------------------------------

  const clean =
    [];


  for (
    const occurrence
    of representatives
  ) {

    const previous =
      clean[
        clean.length - 1
      ];


    if (
      previous &&
      previous.nodeId ===
      occurrence.nodeId
    ) {

      // Si és el mateix node, actualitzem la seva
      // posició final.
      previous.position =
        occurrence.position;

      continue;

    }


    clean.push(
      occurrence
    );

  }


  const edges = [];


  // ----------------------------------------------------------
  // Crear arestes
  // ----------------------------------------------------------

  for (
    let i = 0;
    i <
      clean.length - 1;
    i++
  ) {

    const from =
      clean[i];

    const to =
      clean[i + 1];


    if (
      from.nodeId ===
      to.nodeId
    ) {

      continue;

    }


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
          segment.distance_km ||
          0
        ),
        from.position,
        to.position
      );


    const ascent_m =
      partialValue(
        Number(
          segment.ascent_m ||
          0
        ),
        from.position,
        to.position
      );


    const descent_m =
      partialValue(
        Number(
          segment.descent_m ||
          0
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
// NODES DEL GRAF
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

      terminalType:
        terminal.type ||
        "natural",

      name:
        terminal.name ||
        null,

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

    adjacency[node.id] =
      [];

  }


  for (
    const edge
    of edges
  ) {

    if (
      !adjacency[
        edge.from
      ]
    ) {

      adjacency[
        edge.from
      ] = [];

    }


    adjacency[
      edge.from
    ].push({

      edgeId:
        edge.id,

      to:
        edge.to,

      type:
        edge.type,

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
      segment.edgeCount ===
      0
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
      adjacency[node.id].length ===
      0
  );
}


// ============================================================
// CONSTRUCCIÓ PRINCIPAL
// ============================================================

function build() {

  console.log(
    `🌿 Construint graf DEFINITIU de la xarxa v${VERSION}...`
  );


  // ==========================================================
  // INVENTARI
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
  // NODES
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
    nodeData.nodes ||
    [];

  const terminals =
    nodeData.terminals ||
    [];


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
  // PROCESSAR SEGMENTS
  // ==========================================================

  const graphEdges = [];

  const graphSegments = [];


  let segmentsWithBreaks =
    0;

  let segmentsWithoutBreaks =
    0;

  let junctionCount =
    0;

  let multiNodePositions =
    0;


  for (
    const segment
    of inventory.segments
  ) {

    // --------------------------------------------------------
    // Ocurrències
    // --------------------------------------------------------

    const occurrences =
      collectSegmentOccurrences(
        segment,
        realNodes,
        terminals
      );


    const uniqueOccurrences =
      deduplicateExactOccurrences(
        occurrences
      );


    // --------------------------------------------------------
    // Posicions múltiples
    // --------------------------------------------------------

    const positionGroups =
      groupOccurrencesByPosition(
        uniqueOccurrences
      );


    for (
      const group
      of positionGroups.values()
    ) {

      if (
        group.length >
        1
      ) {

        multiNodePositions++;

      }

    }


    // --------------------------------------------------------
    // Junctions
    // --------------------------------------------------------

    const junctionEdges =
      buildJunctionEdges(
        segment,
        uniqueOccurrences
      );


    junctionCount +=
      junctionEdges.length;


    for (
      const edge
      of junctionEdges
    ) {

      graphEdges.push(
        edge
      );

    }


    // --------------------------------------------------------
    // Arestes físiques del segment
    // --------------------------------------------------------

    const segmentEdges =
      buildSegmentEdges(
        segment,
        uniqueOccurrences
      );


    if (
      uniqueOccurrences.length >=
      2
    ) {

      segmentsWithBreaks++;

    } else {

      segmentsWithoutBreaks++;

    }


    // --------------------------------------------------------
    // Direcció anada
    // --------------------------------------------------------

    for (
      const edge
      of segmentEdges
    ) {

      graphEdges.push(
        edge
      );


      // ------------------------------------------------------
      // Direcció tornada
      // ------------------------------------------------------

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
    // Segment al graf
    // --------------------------------------------------------

    graphSegments.push({

      id:
        segment.file,

      distance_km:
        Number(
          segment.distance_km ||
          0
        ),

      ascent_m:
        Number(
          segment.ascent_m ||
          0
        ),

      descent_m:
        Number(
          segment.descent_m ||
          0
        ),

      start:
        segment.start,

      end:
        segment.end,

      nodePath:
        uniqueOccurrences.map(
          occurrence => ({

            nodeId:
              occurrence.nodeId,

            position:
              occurrence.position,

          })
        ),

      occurrenceCount:
        uniqueOccurrences.length,

      edgeCount:
        segmentEdges.length,

      junctionCount:
        junctionEdges.length,

      bidirectional:
        true,

    });

  }


  // ==========================================================
  // NODES
  // ==========================================================

  const graphNodes =
    buildGraphNodes(
      realNodes,
      terminals
    );


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


  const directionalSegmentEdges =
    graphEdges.filter(
      edge =>
        edge.type ===
        "segment"
    ).length;


  const directionalJunctionEdges =
    graphEdges.filter(
      edge =>
        edge.type ===
        "junction"
    ).length;


  // ==========================================================
  // RESULTATS DE VALIDACIÓ
  // ==========================================================

  console.log("");

  console.log(
    `📊 VALIDACIÓ DEL GRAF v${VERSION}`
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
    `🔗 Arestes direccionals totals: ${
      graphEdges.length
    }`
  );


  console.log(
    `   ├─ Arestes de segments: ${
      directionalSegmentEdges
    }`
  );


  console.log(
    `   └─ Arestes junction: ${
      directionalJunctionEdges
    }`
  );


  console.log(
    `🔀 Junctions bidireccionals: ${
      directionalJunctionEdges / 2
    }`
  );


  console.log(
    `📍 Posicions amb múltiples nodes: ${
      multiNodePositions
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
  // MOSTRAR PROBLEMES
  // ==========================================================

  if (
    segmentsWithoutEdges.length >
    0
  ) {

    console.log("");

    console.error(
      "Segments sense arestes:"
    );


    for (
      const segment
      of segmentsWithoutEdges
    ) {

      console.error(
        `   ${segment.id}`
      );

    }

  }


  if (
    nodesWithoutAdjacency.length >
    0
  ) {

    console.log("");

    console.error(
      "Nodes sense connexions:"
    );


    for (
      const node
      of nodesWithoutAdjacency
    ) {

      console.error(
        `   ${node.id}`
      );

    }

  }


  // ==========================================================
  // VALIDACIÓ FINAL
  // ==========================================================

  if (
    segmentsWithoutEdges.length >
    0
  ) {

    throw new Error(
      "Hi ha segments sense cap aresta."
    );

  }


  if (
    nodesWithoutAdjacency.length >
    0
  ) {

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
  // GRAF FINAL
  // ==========================================================

  const graph = {

    version:
      VERSION,

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

    segmentEdgeCount:
      directionalSegmentEdges,

    junctionEdgeCount:
      directionalJunctionEdges,

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
  // ESCRIURE
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
    `✅ GRAF DEFINITIU v${VERSION} VÀLID CREAT.`
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
    `🔗 Arestes direccionals totals: ${
      graph.edgeCount
    }`
  );


  console.log(
    `   ├─ Segments: ${
      graph.segmentEdgeCount
    }`
  );


  console.log(
    `   └─ Junctions: ${
      graph.junctionEdgeCount
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

} catch (
  error
) {

  console.error("");

  console.error(
    `❌ Error construint el graf v${VERSION}:`
  );

  console.error(
    error.stack ||
    error.message
  );

  process.exit(1);

}