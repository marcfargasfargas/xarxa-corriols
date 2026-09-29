/**
 * ============================================================
 * TEST ROUTE FINDER v0.5.6
 * Xarxa de Corriols d'Alàs i Cerc
 * ============================================================
 *
 * Objectiu:
 *   Trobar voltes circulars des de la plaça d'Alàs
 *   amb objectius aproximats de 6 / 10 / 20 km.
 *
 * v0.5.6
 * -------
 * - Manté el Beam Search de v0.5.5
 * - Evita explosions de memòria
 * - Busca candidats dins finestres de distància
 * - Elimina duplicats exactes
 * - Selecciona rutes REALMENT diferents
 * - Penalitza fortament el solapament de segments
 * - Intenta diversificar els primers trams de la volta
 * - Manté 5 rutes màxim per objectiu
 *
 * Graf esperat:
 *   public/data/xarxa_v0.7/network-graph.json
 *
 * ============================================================
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ============================================================
// CONFIGURACIÓ
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GRAPH_PATH = path.resolve(
  __dirname,
  "../public/data/xarxa_v0.7/network-graph.json"
);

// ------------------------------------------------------------
// Xarxa
// ------------------------------------------------------------

const NETWORK_GATE = "NODE_046";
const PLAÇA_TERMINAL = "TERMINAL_plaça.gpx_start";

// ------------------------------------------------------------
// Objectius
// ------------------------------------------------------------

const TARGETS = [6, 10, 20];

const WINDOWS = {
  6: {
    min: 4,
    max: 8,
  },
  10: {
    min: 8,
    max: 12,
  },
  20: {
    min: 18,
    max: 22,
  },
};

// ------------------------------------------------------------
// Cercador
// ------------------------------------------------------------

const BEAM_WIDTH = 1000;

const MAX_RESULTS_PER_TARGET = 5;

const MIN_ROUTE_KM = 3;

const MAX_ITERATIONS = {
  6: 40,
  10: 60,
  20: 90,
};

// Evita que una mateixa branca creixi indefinidament.
const MAX_SEGMENTS_PER_ROUTE = {
  6: 45,
  10: 65,
  20: 100,
};

// ------------------------------------------------------------
// Diversitat
// ------------------------------------------------------------

// Percentatge màxim de segments compartits abans de considerar
// una ruta massa semblant.
//
// Exemple:
//   0.80 = poden compartir fins al 80%
//   0.65 = exigim més diversitat
//
// Per v0.5.6 utilitzem un valor relativament estricte.
const MAX_SHARED_SEGMENT_RATIO = 0.72;

// Penalització progressiva per solapament.
const SHARED_SEGMENT_PENALTY = 4.0;

// Penalització addicional si comparteixen els primers trams.
const SHARED_PREFIX_PENALTY = 2.5;

// Quants primers segments considerem "sortida".
const PREFIX_LENGTH = 3;

// Penalització si dues rutes tenen exactament el mateix primer segment.
const SAME_FIRST_SEGMENT_PENALTY = 1.5;

// Premiem rutes que utilitzen segments nous.
const NEW_SEGMENT_BONUS = 1.5;

// ------------------------------------------------------------
// Beam scoring
// ------------------------------------------------------------

// Pes de l'error respecte l'objectiu.
const DISTANCE_WEIGHT = 1.0;

// Penalització de longitud massa curta/larga.
const RANGE_PENALTY = 1.5;

// Evitem prioritzar només rutes extremadament llargues.
const SEGMENT_COUNT_PENALTY = 0.01;

// ------------------------------------------------------------
// Seguretat
// ------------------------------------------------------------

const MAX_STATES_PER_SEARCH = 150000;

const MAX_VISITED_NODES = 120;

const PROGRESS_EVERY = 5;

// ============================================================
// UTILITATS
// ============================================================

function round(value, decimals = 3) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// ============================================================
// CARREGAR GRAF
// ============================================================

function loadGraph() {
  console.log(`📂 Graf: ${GRAPH_PATH}`);

  if (!fs.existsSync(GRAPH_PATH)) {
    throw new Error(`No existeix el graf: ${GRAPH_PATH}`);
  }

  const raw = fs.readFileSync(GRAPH_PATH, "utf8");
  const graph = JSON.parse(raw);

  return graph;
}

// ============================================================
// NORMALITZACIÓ DE L'ADJACÈNCIA
// ============================================================

function extractAdjacency(graph) {
  /*
   * El graf v0.7.3 conté les arestes direccionals.
   *
   * Aquesta funció accepta diferents formes possibles d'emmagatzematge
   * per fer el test més robust.
   */

  if (graph.adjacency && typeof graph.adjacency === "object") {
    return graph.adjacency;
  }

  if (graph.graph && graph.graph.adjacency) {
    return graph.graph.adjacency;
  }

  if (graph.edgesByNode && typeof graph.edgesByNode === "object") {
    return graph.edgesByNode;
  }

  // ----------------------------------------------------------
  // Si el graf només té una llista d'arestes, la construïm.
  // ----------------------------------------------------------

  const edges =
    graph.edges ||
    graph.directedEdges ||
    graph.arcs ||
    graph.connections ||
    [];

  if (!Array.isArray(edges)) {
    throw new Error(
      "No s'ha trobat cap estructura d'adjacència ni llista d'arestes."
    );
  }

  const adjacency = {};

  for (const edge of edges) {
    if (!edge || !edge.from || !edge.to) {
      continue;
    }

    if (!adjacency[edge.from]) {
      adjacency[edge.from] = [];
    }

    adjacency[edge.from].push({
      edgeId: edge.id || edge.edgeId,
      to: edge.to,
      type: edge.type || "segment",
      direction: edge.direction || "forward",
      segment: edge.segment || null,
      distance_km: safeNumber(edge.distance_km),
      ascent_m: safeNumber(edge.ascent_m),
      descent_m: safeNumber(edge.descent_m),
    });
  }

  return adjacency;
}

// ============================================================
// VALIDACIÓ
// ============================================================

function validateGraph(graph, adjacency) {
  const nodes = graph.nodes || [];

  const nodeIds = new Set();

  for (const node of nodes) {
    if (node?.id) {
      nodeIds.add(node.id);
    }
  }

  console.log("📊 Versió del graf:", graph.version || graph.graphVersion || "?");
  console.log("🔎 Validant graf...");
  console.log(`   Nodes: ${nodeIds.size}`);

  let edgeCount = 0;

  for (const list of Object.values(adjacency)) {
    if (Array.isArray(list)) {
      edgeCount += list.length;
    }
  }

  console.log(`   Arestes: ${edgeCount}`);
  console.log(`   Porta xarxa: ${NETWORK_GATE}`);

  if (!adjacency[NETWORK_GATE]) {
    throw new Error(`No existeix l'adjacència de ${NETWORK_GATE}`);
  }

  console.log(
    `   Veïns de la porta: ${adjacency[NETWORK_GATE].length}`
  );

  if (!adjacency[PLAÇA_TERMINAL]) {
    console.log(
      `   ⚠️ No hi ha adjacència directa de ${PLAÇA_TERMINAL}`
    );
  }

  return {
    nodeIds,
    edgeCount,
  };
}

// ============================================================
// CONNECTIVITAT
// ============================================================

function analyzeConnectivity(adjacency) {
  console.log("\n🧭 Analitzant connectivitat...");

  const visited = new Set();
  const queue = [NETWORK_GATE];

  visited.add(NETWORK_GATE);

  while (queue.length > 0) {
    const node = queue.shift();

    const neighbors = adjacency[node] || [];

    for (const edge of neighbors) {
      if (!edge.to) continue;

      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        queue.push(edge.to);
      }
    }
  }

  const totalNodes = new Set();

  for (const [from, edges] of Object.entries(adjacency)) {
    totalNodes.add(from);

    for (const edge of edges || []) {
      if (edge.to) {
        totalNodes.add(edge.to);
      }
    }
  }

  console.log(
    `   Nodes accessibles: ${visited.size}/${totalNodes.size}`
  );

  console.log(
    `   Nodes inaccessibles: ${Math.max(
      0,
      totalNodes.size - visited.size
    )}`
  );

  return visited;
}

// ============================================================
// ACCÉS PLAÇA
// ============================================================

function getPlaçaAccessEdges(adjacency) {
  const edges = [];

  for (const [from, list] of Object.entries(adjacency)) {
    for (const edge of list || []) {
      if (
        edge.segment === "plaça.gpx" &&
        (
          edge.from === PLAÇA_TERMINAL ||
          from === PLAÇA_TERMINAL
        )
      ) {
        edges.push(edge);
      }
    }
  }

  // En cas que l'adjacència no contingui from dins de l'objecte.
  const direct = adjacency[PLAÇA_TERMINAL] || [];

  for (const edge of direct) {
    if (
      edge.segment === "plaça.gpx" &&
      !edges.some(e => e.edgeId === edge.edgeId)
    ) {
      edges.push(edge);
    }
  }

  return edges;
}

// ============================================================
// NORMALITZAR EDGE
// ============================================================

function normalizeEdge(edge, from) {
  return {
    edgeId: edge.edgeId || edge.id || `${from}->${edge.to}`,
    to: edge.to,
    type: edge.type || "segment",
    direction: edge.direction || "forward",
    segment: edge.segment || null,
    distance_km: safeNumber(edge.distance_km),
    ascent_m: safeNumber(edge.ascent_m),
    descent_m: safeNumber(edge.descent_m),
  };
}

// ============================================================
// ESTAT
// ============================================================

function createInitialState() {
  return {
    node: NETWORK_GATE,

    pathNodes: [NETWORK_GATE],

    edges: [],

    segments: [],

    distance: 0,

    ascent: 0,

    descent: 0,

    visitedNodes: new Set([NETWORK_GATE]),

    visitedEdges: new Set(),

    visitedSegments: new Set(),

    junctionCount: 0,
  };
}

function cloneState(state, edge) {
  const nextVisitedNodes = new Set(state.visitedNodes);
  const nextVisitedEdges = new Set(state.visitedEdges);
  const nextVisitedSegments = new Set(state.visitedSegments);

  nextVisitedNodes.add(edge.to);

  if (edge.edgeId) {
    nextVisitedEdges.add(edge.edgeId);
  }

  if (edge.segment) {
    nextVisitedSegments.add(edge.segment);
  }

  const segments = state.segments.slice();

  if (
    edge.segment &&
    edge.segment !== "plaça.gpx" &&
    (
      segments.length === 0 ||
      segments[segments.length - 1] !== edge.segment
    )
  ) {
    segments.push(edge.segment);
  }

  return {
    node: edge.to,

    pathNodes: [...state.pathNodes, edge.to],

    edges: [...state.edges, edge],

    segments,

    distance: state.distance + edge.distance_km,

    ascent: state.ascent + edge.ascent_m,

    descent: state.descent + edge.descent_m,

    visitedNodes: nextVisitedNodes,

    visitedEdges: nextVisitedEdges,

    visitedSegments: nextVisitedSegments,

    junctionCount:
      state.junctionCount +
      (edge.type === "junction" ? 1 : 0),
  };
}

// ============================================================
// CICLE
// ============================================================

function isCycle(state) {
  return (
    state.edges.length > 0 &&
    state.node === NETWORK_GATE
  );
}

// ============================================================
// SIGNATURA DE RUTA
// ============================================================

function getSegmentSignature(state) {
  return state.segments.join("|");
}

function getEdgeSignature(state) {
  return state.edges
    .map(edge => edge.edgeId)
    .join("|");
}

// ============================================================
// PREFIX
// ============================================================

function getPrefix(state) {
  return state.segments
    .slice(0, PREFIX_LENGTH)
    .join("|");
}

// ============================================================
// SOLAPAMENT
// ============================================================

function sharedSegments(routeA, routeB) {
  const a = new Set(routeA.segments);
  const b = new Set(routeB.segments);

  let shared = 0;

  for (const segment of a) {
    if (b.has(segment)) {
      shared++;
    }
  }

  return shared;
}

function sharedRatio(routeA, routeB) {
  const shared = sharedSegments(routeA, routeB);

  const maxSegments = Math.max(
    routeA.segments.length,
    routeB.segments.length,
    1
  );

  return shared / maxSegments;
}

function sharedPrefixLength(routeA, routeB) {
  const a = routeA.segments;
  const b = routeB.segments;

  const max = Math.min(
    PREFIX_LENGTH,
    a.length,
    b.length
  );

  let count = 0;

  for (let i = 0; i < max; i++) {
    if (a[i] === b[i]) {
      count++;
    } else {
      break;
    }
  }

  return count;
}

// ============================================================
// NORMALITZAR RUTA
// ============================================================

function routeFromState(state, target) {
  return {
    target,

    distance_network: state.distance,

    distance_total: state.distance,

    ascent_m: state.ascent,

    descent_m: state.descent,

    segments: [...state.segments],

    nodes: [...state.pathNodes],

    edges: [...state.edges],

    junctionCount: state.junctionCount,

    segmentCount: state.segments.length,
  };
}

// ============================================================
// SCORE DE DISTÀNCIA
// ============================================================

function distanceScore(state, target) {
  const diff = Math.abs(state.distance - target);

  return diff * DISTANCE_WEIGHT;
}

// ============================================================
// SCORE DE DIVERSITAT
// ============================================================

function diversityPenalty(state, selectedRoutes) {
  if (selectedRoutes.length === 0) {
    return 0;
  }

  let penalty = 0;

  for (const route of selectedRoutes) {
    const ratio = sharedRatio(state, route);

    if (ratio > MAX_SHARED_SEGMENT_RATIO) {
      penalty +=
        (ratio - MAX_SHARED_SEGMENT_RATIO) *
        100 *
        SHARED_SEGMENT_PENALTY;
    }

    const prefix = sharedPrefixLength(state, route);

    penalty +=
      prefix *
      SHARED_PREFIX_PENALTY;

    if (
      state.segments[0] &&
      route.segments[0] &&
      state.segments[0] === route.segments[0]
    ) {
      penalty += SAME_FIRST_SEGMENT_PENALTY;
    }
  }

  return penalty;
}

// ============================================================
// SCORE ESTAT
// ============================================================

function scoreState(state, target, selectedRoutes) {
  const diff = Math.abs(state.distance - target);

  let score = diff * DISTANCE_WEIGHT;

  // Penalització si ja ens acostem massa al màxim.
  const window = WINDOWS[target];

  if (state.distance > window.max) {
    score +=
      (state.distance - window.max) *
      RANGE_PENALTY *
      10;
  }

  // Massa segments = lleugera penalització.
  score +=
    state.segments.length *
    SEGMENT_COUNT_PENALTY;

  // Diversitat.
  score += diversityPenalty(
    state,
    selectedRoutes
  );

  return score;
}

// ============================================================
// VALIDAR TRANSICIÓ
// ============================================================

function canUseEdge(state, edge, target) {
  if (!edge.to) {
    return false;
  }

  // No permetre tornar a visitar nodes intermedis.
  //
  // Excepció:
  // NODE_046 només es pot visitar al final del cicle.
  if (
    edge.to !== NETWORK_GATE &&
    state.visitedNodes.has(edge.to)
  ) {
    return false;
  }

  // No reutilitzar exactament la mateixa aresta.
  if (
    edge.edgeId &&
    state.visitedEdges.has(edge.edgeId)
  ) {
    return false;
  }

  // No reutilitzar el mateix segment.
  //
  // Això evita moltes rutes artificials que recorren el mateix
  // segment dues vegades en sentits oposats.
  if (
    edge.segment &&
    edge.segment !== "plaça.gpx" &&
    state.visitedSegments.has(edge.segment)
  ) {
    return false;
  }

  if (
    state.segments.length >=
    MAX_SEGMENTS_PER_ROUTE[target]
  ) {
    return false;
  }

  if (
    state.visitedNodes.size >=
    MAX_VISITED_NODES
  ) {
    return false;
  }

  return true;
}

// ============================================================
// EXPANSIÓ BEAM
// ============================================================

function searchTarget(
  adjacency,
  target,
  selectedRoutes
) {
  const window = WINDOWS[target];

  console.log(
    `\n🔍 Buscant voltes al voltant de ${target} km...`
  );

  console.log(
    `   Finestra: ${window.min} – ${window.max} km`
  );

  console.log(
    `   Beam width: ${BEAM_WIDTH}`
  );

  const initial = createInitialState();

  let active = [initial];

  const candidates = [];

  const exactSignatures = new Set();

  let exploredStates = 0;

  for (
    let iteration = 1;
    iteration <= MAX_ITERATIONS[target];
    iteration++
  ) {
    const next = [];

    for (const state of active) {
      const neighbors =
        adjacency[state.node] || [];

      for (const rawEdge of neighbors) {
        exploredStates++;

        if (
          exploredStates >
          MAX_STATES_PER_SEARCH
        ) {
          console.log(
            `\n   ⚠️ Límit d'estats assolit: ${MAX_STATES_PER_SEARCH}`
          );

          break;
        }

        const edge =
          normalizeEdge(
            rawEdge,
            state.node
          );

        if (
          !canUseEdge(
            state,
            edge,
            target
          )
        ) {
          continue;
        }

        const child =
          cloneState(
            state,
            edge
          );

        // ----------------------------------------------------
        // Si torna a NODE_046 tenim un cicle.
        // ----------------------------------------------------

        if (isCycle(child)) {
          if (
            child.distance >= MIN_ROUTE_KM &&
            child.distance >= window.min &&
            child.distance <= window.max
          ) {
            const signature =
              getEdgeSignature(child);

            if (
              !exactSignatures.has(signature)
            ) {
              exactSignatures.add(signature);

              candidates.push(
                routeFromState(
                  child,
                  target
                )
              );
            }
          }

          // No continuar expandint després de tancar.
          continue;
        }

        // ----------------------------------------------------
        // No continuar si ja superem el màxim.
        // ----------------------------------------------------

        if (
          child.distance >
          window.max
        ) {
          continue;
        }

        // ----------------------------------------------------
        // No permetre rutes massa petites que ja no poden
        // créixer de forma raonable.
        // ----------------------------------------------------

        next.push(child);
      }

      if (
        exploredStates >
        MAX_STATES_PER_SEARCH
      ) {
        break;
      }
    }

    if (
      exploredStates >
      MAX_STATES_PER_SEARCH
    ) {
      break;
    }

    // --------------------------------------------------------
    // Ordenació beam.
    // --------------------------------------------------------

    next.sort(
      (a, b) =>
        scoreState(
          a,
          target,
          selectedRoutes
        ) -
        scoreState(
          b,
          target,
          selectedRoutes
        )
    );

    active =
      next.slice(
        0,
        BEAM_WIDTH
      );

    if (
      iteration === 1 ||
      iteration % PROGRESS_EVERY === 0
    ) {
      console.log(
        `   Iteració ${iteration}: ${active.length} estats actius`
      );
    }

    if (
      active.length === 0
    ) {
      break;
    }
  }

  console.log(
    `\n   Estats explorats: ${exploredStates}`
  );

  console.log(
    `   Cicles candidats: ${candidates.length}`
  );

  return candidates;
}

// ============================================================
// ELIMINAR DUPLICATS
// ============================================================

function removeDuplicateRoutes(routes) {
  const map = new Map();

  for (const route of routes) {
    const signature =
      route.segments.join("|");

    const existing =
      map.get(signature);

    if (!existing) {
      map.set(
        signature,
        route
      );

      continue;
    }

    // Si tenen exactament els mateixos segments,
    // ens quedem la que està més a prop de l'objectiu.
    const routeDiff =
      Math.abs(
        route.distance_network -
          route.target
      );

    const existingDiff =
      Math.abs(
        existing.distance_network -
          existing.target
      );

    if (
      routeDiff <
      existingDiff
    ) {
      map.set(
        signature,
        route
      );
    }
  }

  return [...map.values()];
}

// ============================================================
// SELECCIÓ DE RUTES DIVERSES
// ============================================================

function selectDiverseRoutes(
  routes,
  target
) {
  if (!routes.length) {
    return [];
  }

  // ----------------------------------------------------------
  // Ordenem inicialment per proximitat a l'objectiu.
  // ----------------------------------------------------------

  const sorted =
    [...routes].sort(
      (a, b) =>
        Math.abs(
          a.distance_total -
            target
        ) -
        Math.abs(
          b.distance_total -
            target
        )
    );

  const selected = [];

  // ----------------------------------------------------------
  // Primera ruta:
  // sempre la més precisa.
  // ----------------------------------------------------------

  selected.push(
    sorted[0]
  );

  // ----------------------------------------------------------
  // Successives:
  // maximitzem la combinació de:
  //   - proximitat
  //   - segments nous
  //   - diversitat
  // ----------------------------------------------------------

  while (
    selected.length <
      MAX_RESULTS_PER_TARGET &&
    selected.length <
      sorted.length
  ) {
    let best = null;
    let bestScore = Infinity;

    for (
      const candidate of sorted
    ) {
      if (
        selected.includes(
          candidate
        )
      ) {
        continue;
      }

      let tooSimilar = false;

      let diversityPenaltyTotal = 0;

      for (
        const chosen of selected
      ) {
        const ratio =
          sharedRatio(
            candidate,
            chosen
          );

        if (
          ratio >
          MAX_SHARED_SEGMENT_RATIO
        ) {
          tooSimilar = true;
        }

        diversityPenaltyTotal +=
          ratio * 100;

        diversityPenaltyTotal +=
          sharedPrefixLength(
            candidate,
            chosen
          ) * 10;
      }

      // ------------------------------------------------------
      // Quants segments nous aporta?
      // ------------------------------------------------------

      const candidateSegments =
        new Set(
          candidate.segments
        );

      const selectedSegments =
        new Set();

      for (
        const route of selected
      ) {
        for (
          const segment of
            route.segments
        ) {
          selectedSegments.add(
            segment
          );
        }
      }

      let newSegments = 0;

      for (
        const segment of
          candidateSegments
      ) {
        if (
          !selectedSegments.has(
            segment
          )
        ) {
          newSegments++;
        }
      }

      // ------------------------------------------------------
      // No descartem automàticament una ruta massa semblant
      // si és clarament millor que totes les alternatives.
      //
      // Però sí que la penalitzem fortament.
      // ------------------------------------------------------

      let score =
        Math.abs(
          candidate.distance_total -
            target
        );

      score +=
        diversityPenaltyTotal *
        0.08;

      score -=
        newSegments *
        NEW_SEGMENT_BONUS *
        0.03;

      if (tooSimilar) {
        score += 50;
      }

      // ------------------------------------------------------
      // Preferim primers segments diferents.
      // ------------------------------------------------------

      const sameFirst =
        selected.filter(
          route =>
            route.segments[0] ===
            candidate.segments[0]
        ).length;

      score +=
        sameFirst *
        1.5;

      if (
        score <
        bestScore
      ) {
        bestScore = score;
        best = candidate;
      }
    }

    if (!best) {
      break;
    }

    selected.push(best);
  }

  // ----------------------------------------------------------
  // Segona passada:
  // intentem substituir rutes massa semblants per alternatives.
  // ----------------------------------------------------------

  return improveDiversity(
    selected,
    sorted,
    target
  );
}

// ============================================================
// MILLORA DE DIVERSITAT
// ============================================================

function improveDiversity(
  selected,
  allRoutes,
  target
) {
  const result =
    [...selected];

  let changed = true;

  let safety = 0;

  while (
    changed &&
    safety < 3
  ) {
    changed = false;
    safety++;

    for (
      let i = 0;
      i < result.length;
      i++
    ) {
      const current =
        result[i];

      const candidates =
        allRoutes
          .filter(
            route =>
              !result.includes(
                route
              )
          )
          .sort(
            (a, b) =>
              Math.abs(
                a.distance_total -
                  target
              ) -
              Math.abs(
                b.distance_total -
                  target
              )
          );

      for (
        const candidate of
          candidates
      ) {
        let valid = true;

        for (
          let j = 0;
          j < result.length;
          j++
        ) {
          if (j === i) {
            continue;
          }

          const ratio =
            sharedRatio(
              candidate,
              result[j]
            );

          if (
            ratio >
            MAX_SHARED_SEGMENT_RATIO
          ) {
            valid = false;
            break;
          }
        }

        if (!valid) {
          continue;
        }

        const currentWorst =
          Math.max(
            ...result
              .filter(
                (_, idx) =>
                  idx !== i
              )
              .map(
                route =>
                  sharedRatio(
                    current,
                    route
                  )
              ),
            0
          );

        const candidateWorst =
          Math.max(
            ...result
              .filter(
                (_, idx) =>
                  idx !== i
              )
              .map(
                route =>
                  sharedRatio(
                    candidate,
                    route
                  )
              ),
            0
          );

        const currentDistanceError =
          Math.abs(
            current.distance_total -
              target
          );

        const candidateDistanceError =
          Math.abs(
            candidate.distance_total -
              target
          );

        if (
          candidateWorst <
            currentWorst &&
          candidateDistanceError <=
            currentDistanceError +
              0.75
        ) {
          result[i] =
            candidate;

          changed = true;

          break;
        }
      }
    }
  }

  // Tornem a ordenar per proximitat.
  result.sort(
    (a, b) =>
      Math.abs(
        a.distance_total -
          target
      ) -
      Math.abs(
        b.distance_total -
          target
      )
  );

  return result.slice(
    0,
    MAX_RESULTS_PER_TARGET
  );
}

// ============================================================
// AFEGIR ACCÉS DES DE LA PLAÇA
// ============================================================

function addPlaçaAccess(
  route,
  accessEdges
) {
  /*
   * La volta de xarxa és:
   *
   * NODE_046 → ... → NODE_046
   *
   * La volta completa ideal és:
   *
   * PLAÇA → NODE_046 → ... → NODE_046 → PLAÇA
   *
   * En alguns casos el graf només exposa una de les dues
   * arestes de plaça. Per això aquesta funció és tolerant
   * i mai retorna ascent_total / descent_total undefined.
   */

  // ----------------------------------------------------------
  // Valors base de la ruta
  // ----------------------------------------------------------

  const baseAscent =
    safeNumber(route.ascent_m);

  const baseDescent =
    safeNumber(route.descent_m);

  const baseDistance =
    safeNumber(route.distance_network);

  // ----------------------------------------------------------
  // Buscar les dues possibles direccions de plaça
  // ----------------------------------------------------------

  const accessOut =
    accessEdges.find(
      edge =>
        edge.edgeId ===
        "EDGE_plaça.gpx_1"
    ) ||
    accessEdges.find(
      edge =>
        edge.segment ===
          "plaça.gpx" &&
        edge.to ===
          NETWORK_GATE
    );

  const accessBack =
    accessEdges.find(
      edge =>
        edge.edgeId ===
        "EDGE_plaça.gpx_1_REV"
    ) ||
    accessEdges.find(
      edge =>
        edge.segment ===
          "plaça.gpx" &&
        edge.to ===
          PLAÇA_TERMINAL
    );

  // ----------------------------------------------------------
  // Distàncies de l'accés
  // ----------------------------------------------------------

  const accessOutDistance =
    accessOut
      ? safeNumber(
          accessOut.distance_km
        )
      : 0;

  const accessBackDistance =
    accessBack
      ? safeNumber(
          accessBack.distance_km
        )
      : 0;

  // ----------------------------------------------------------
  // Desnivell de l'accés
  // ----------------------------------------------------------

  const accessOutAscent =
    accessOut
      ? safeNumber(
          accessOut.ascent_m
        )
      : 0;

  const accessOutDescent =
    accessOut
      ? safeNumber(
          accessOut.descent_m
        )
      : 0;

  const accessBackAscent =
    accessBack
      ? safeNumber(
          accessBack.ascent_m
        )
      : 0;

  const accessBackDescent =
    accessBack
      ? safeNumber(
          accessBack.descent_m
        )
      : 0;

  // ----------------------------------------------------------
  // Valors totals
  //
  // Sempre són números, encara que falti una aresta.
  // ----------------------------------------------------------

  const distanceTotal =
    baseDistance +
    accessOutDistance +
    accessBackDistance;

  const ascentTotal =
    baseAscent +
    accessOutAscent +
    accessBackAscent;

  const descentTotal =
    baseDescent +
    accessOutDescent +
    accessBackDescent;

  // ----------------------------------------------------------
  // Edges totals
  // ----------------------------------------------------------

  const edgesTotal = [];

  if (accessOut) {
    edgesTotal.push(
      accessOut
    );
  }

  edgesTotal.push(
    ...route.edges
  );

  if (accessBack) {
    edgesTotal.push(
      accessBack
    );
  }

  // ----------------------------------------------------------
  // Nodes totals
  // ----------------------------------------------------------

  const nodesTotal = [
    PLAÇA_TERMINAL,
    ...route.nodes,
    PLAÇA_TERMINAL,
  ];

  // ----------------------------------------------------------
  // Retorn
  // ----------------------------------------------------------

  return {
    ...route,

    distance_total:
      distanceTotal,

    ascent_total:
      ascentTotal,

    descent_total:
      descentTotal,

    access_distance_km:
      accessOutDistance +
      accessBackDistance,

    access_ascent_m:
      accessOutAscent +
      accessBackAscent,

    access_descent_m:
      accessOutDescent +
      accessBackDescent,

    access_out:
      accessOut || null,

    access_back:
      accessBack || null,

    edges_total:
      edgesTotal,

    nodes_total:
      nodesTotal,
  };
}

// ============================================================
// RESULTATS
// ============================================================

function printRoute(
  route,
  index
) {
  console.log(
    `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
  );

  console.log(
    `🚶 VOLTA #${index}`
  );

  console.log(
    `🎯 Objectiu: ${route.target} km`
  );

  console.log(
    `📏 Distància xarxa: ${route.distance_network.toFixed(
      3
    )} km`
  );

  console.log(
    `📏 Distància total amb accés plaça: ${route.distance_total.toFixed(
      3
    )} km`
  );

  console.log(
    `📐 Diferència respecte objectiu: ${Math.abs(
      route.distance_total -
        route.target
    ).toFixed(3)} km`
  );

  console.log(
    `⬆️ Desnivell +: ${route.ascent_total.toFixed(
      1
    )} m`
  );

  console.log(
    `⬇️ Desnivell -: ${route.descent_total.toFixed(
      1
    )} m`
  );

  console.log(
    `🛤 Segments: ${route.segments.length}`
  );

  console.log(
    `🔗 Junctions: ${route.junctionCount}`
  );

  console.log("\nSegments:");

  route.segments.forEach(
    (segment, i) => {
      console.log(
        `   ${i + 1}. ${segment}`
      );
    }
  );

  console.log("\nNodes:");

  console.log(
    route.nodes_total.join(
      " → "
    )
  );
}

// ============================================================
// RESUM
// ============================================================

function printSummary(
  allResults
) {
  console.log(
    "\n=========================================="
  );

  console.log(
    "📊 RESUM FINAL v0.5.6"
  );

  console.log(
    "=========================================="
  );

  for (
    const target of TARGETS
  ) {
    const routes =
      allResults[target] || [];

    if (
      routes.length === 0
    ) {
      console.log(
        `🎯 ~${target} km: 0 voltes`
      );

      continue;
    }

    const best =
      routes[0];

    console.log(
      `🎯 ~${target} km: ${routes.length} voltes`
    );

    console.log(
      `   ⭐ Millor: ${best.distance_total.toFixed(
        3
      )} km`
    );

    console.log(
      `   📐 Diferència: ${Math.abs(
        best.distance_total -
          target
      ).toFixed(3)} km`
    );

    console.log(
      `   ⬆️ Desnivell +: ${best.ascent_total.toFixed(
        1
      )} m`
    );

    console.log(
      `   ⬇️ Desnivell -: ${best.descent_total.toFixed(
        1
      )} m`
    );

    // --------------------------------------------------------
    // Diversitat mitjana
    // --------------------------------------------------------

    if (
      routes.length > 1
    ) {
      let totalSimilarity = 0;
      let pairs = 0;

      for (
        let i = 0;
        i < routes.length;
        i++
      ) {
        for (
          let j = i + 1;
          j < routes.length;
          j++
        ) {
          totalSimilarity +=
            sharedRatio(
              routes[i],
              routes[j]
            );

          pairs++;
        }
      }

      const avg =
        pairs > 0
          ? totalSimilarity /
            pairs
          : 0;

      console.log(
        `   🔀 Solapament mitjà: ${(
          avg * 100
        ).toFixed(1)}%`
      );
    }
  }
}

// ============================================================
// MAIN
// ============================================================

function main() {
  console.log(
    "🌿 TEST ROUTE FINDER v0.5.6"
  );

  console.log(
    "=========================================="
  );

  console.log(
    `📂 Graf: ${GRAPH_PATH}`
  );

  console.log(
    `🚪 Porta xarxa: ${NETWORK_GATE}`
  );

  console.log(
    `🏁 Terminal plaça: ${PLAÇA_TERMINAL}`
  );

  console.log(
    `📏 Distància mínima: ${MIN_ROUTE_KM} km`
  );

  console.log(
    `🎯 Objectius: ${TARGETS.join(
      " / "
    )} km`
  );

  console.log(
    `🧠 Beam width: ${BEAM_WIDTH}`
  );

  console.log(
    `🎛️ Màx. rutes finals/objectiu: ${MAX_RESULTS_PER_TARGET}`
  );

  console.log(
    `🔀 Solapament màxim recomanat: ${(
      MAX_SHARED_SEGMENT_RATIO *
      100
    ).toFixed(0)}%`
  );

  console.log(
    `📊 Versió esperada del graf: 0.7.3`
  );

  // ----------------------------------------------------------
  // Graf
  // ----------------------------------------------------------

  const graph =
    loadGraph();

  const adjacency =
    extractAdjacency(
      graph
    );

  validateGraph(
    graph,
    adjacency
  );

  // ----------------------------------------------------------
  // Connectivitat
  // ----------------------------------------------------------

  analyzeConnectivity(
    adjacency
  );

  // ----------------------------------------------------------
  // Accés plaça
  // ----------------------------------------------------------

  const accessEdges =
    getPlaçaAccessEdges(
      adjacency
    );

  console.log(
    "\n🏛 Accés plaça:"
  );

  console.log(
  "\n🏛 Accés plaça:"
);

console.log(
  `   Arestes detectades: ${accessEdges.length}`
);

if (
  accessEdges.length === 0
) {
  console.log(
    "   ⚠️ No s'han trobat arestes plaça.gpx"
  );
} else {
  for (
    const edge of
      accessEdges
  ) {
    console.log(
      `   ${edge.edgeId} → ${edge.to}`
    );
  }
}

const plaçaForward =
  accessEdges.find(
    edge =>
      edge.edgeId ===
      "EDGE_plaça.gpx_1"
  );

const plaçaReverse =
  accessEdges.find(
    edge =>
      edge.edgeId ===
      "EDGE_plaça.gpx_1_REV"
  );

console.log(
  `   Anada plaça → xarxa: ${
    plaçaForward
      ? "OK"
      : "NO"
  }`
);

console.log(
  `   Tornada xarxa → plaça: ${
    plaçaReverse
      ? "OK"
      : "NO"
  }`
);

  // ----------------------------------------------------------
  // Resultats
  // ----------------------------------------------------------

  const allResults = {};

  // ----------------------------------------------------------
  // Cada objectiu de manera independent.
  // ----------------------------------------------------------

  for (
    const target of TARGETS
  ) {
    const candidates =
      searchTarget(
        adjacency,
        target,
        []
      );

    // --------------------------------------------------------
    // Duplicats
    // --------------------------------------------------------

    const unique =
      removeDuplicateRoutes(
        candidates
      );

    console.log(
      `   Duplicats exactes eliminats: ${
        candidates.length -
        unique.length
      }`
    );

    console.log(
      `   Candidats únics: ${unique.length}`
    );

    // --------------------------------------------------------
    // Selecció diversa
    // --------------------------------------------------------

    const selected =
      selectDiverseRoutes(
        unique,
        target
      );

    console.log(
      `   Voltes útils i diverses: ${selected.length}`
    );

    // --------------------------------------------------------
    // Afegim accés plaça.
    // --------------------------------------------------------

    const complete =
      selected.map(
        route =>
          addPlaçaAccess(
            route,
            accessEdges
          )
      );

    // --------------------------------------------------------
    // Ordenem per distància.
    // --------------------------------------------------------

    complete.sort(
      (a, b) =>
        Math.abs(
          a.distance_total -
            target
        ) -
        Math.abs(
          b.distance_total -
            target
        )
    );

    allResults[target] =
      complete;
  }

  // ==========================================================
  // IMPRIMIR RESULTATS
  // ==========================================================

  console.log(
    "\n=========================================="
  );

  console.log(
    "📊 RESULTATS DE LES VOLTES"
  );

  console.log(
    "=========================================="
  );

  for (
    const target of TARGETS
  ) {
    const routes =
      allResults[target] ||
      [];

    console.log(
      `\n🎯 VOLTES OBJECTIU ~${target} KM`
    );

    console.log(
      "=========================================="
    );

    if (
      routes.length === 0
    ) {
      console.log(
        "❌ No s'ha trobat cap volta."
      );

      continue;
    }

    console.log(
      `Voltes seleccionades: ${routes.length}`
    );

    routes.forEach(
      (route, index) =>
        printRoute(
          route,
          index + 1
        )
    );
  }

  // ==========================================================
  // RESUM
  // ==========================================================

  printSummary(
    allResults
  );

  console.log(
    "\n=========================================="
  );

  console.log(
    "✅ TEST ROUTE FINDER v0.5.6 FINALITZAT"
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
} catch (error) {
  console.error(
    "\n❌ Error executant el Route Finder:"
  );

  console.error(
    error
  );

  process.exit(
    1
  );
}