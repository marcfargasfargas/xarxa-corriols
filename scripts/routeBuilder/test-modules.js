import {
  DATA_DIR,
  GPX_DIR,
  loadJSON,
  buildNodeIndex,
  buildEdgeIndex,
} from "./data.js";

import {
  reconstructRoute,
} from "./reconstruction.js";

import {
  validateRoute,
  validateContinuity,
  validateClosure,
} from "./validation.js";


// ============================================================
// CONFIGURACIÓ
// ============================================================

const GRAPH_FILE =
  `${DATA_DIR}/network-graph.json`;

const NODES_FILE =
  `${DATA_DIR}/network-nodes.json`;

const ROUTE_FILE =
  `${DATA_DIR}/test-route.json`;


// ============================================================
// TEST
// ============================================================

console.log(
  "\n=========================================="
);

console.log(
  "🧪 TEST ROUTE BUILDER — MÒDULS SEPARATS"
);

console.log(
  "=========================================="
);


console.log(
  `📂 Data: ${DATA_DIR}`
);

console.log(
  `📂 GPX: ${GPX_DIR}`
);


// ============================================================
// CARREGAR DADES
// ============================================================

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
    nodeData.nodes?.length || 0
  }`
);


// ============================================================
// INDEXOS
// ============================================================

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


// ============================================================
// VALIDAR RUTA
// ============================================================

validateRoute(
  route,
  edgeIndex
);


// ============================================================
// RECONSTRUIR
// ============================================================

const reconstruction =
  reconstructRoute(
    route,
    edgeIndex,
    nodeIndex
  );


// ============================================================
// VALIDAR GEOMETRIA
// ============================================================

console.log(
  "\n🔎 Validant geometria..."
);


const continuity =
  validateContinuity(
    reconstruction.points
  );


const closure =
  validateClosure(
    reconstruction.points
  );


// ============================================================
// RESULTAT
// ============================================================

console.log(
  "\n=========================================="
);

console.log(
  "📊 RESULTAT"
);

console.log(
  "=========================================="
);

console.log(
  `📍 Punts finals: ${
    reconstruction.points.length
  }`
);

console.log(
  `📏 Distància reconstruïda: ${(
    continuity.totalDistance_m / 1000
  ).toFixed(3)} km`
);

console.log(
  `📐 Salt màxim: ${
    continuity.maxJump_m.toFixed(2)
  } m`
);

console.log(
  `⚠️ Salts > 100 m: ${
    continuity.jumps.length
  }`
);

console.log(
  `🏁 Tancament: ${
    closure.distance_m.toFixed(2)
  } m`
);


// ============================================================
// VALIDACIÓ FINAL
// ============================================================

const valid =
  continuity.valid &&
  closure.valid;


if (valid) {

  console.log(
    "\n✅ MOTOR MODULAR VÀLID"
  );

  console.log(
    "   La geometria és contínua i tancada."
  );

} else {

  console.log(
    "\n❌ MOTOR MODULAR NO VÀLID"
  );

}


console.log(
  "\n=========================================="
);