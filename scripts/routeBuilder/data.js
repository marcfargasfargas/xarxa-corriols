// ============================================================
// ROUTE BUILDER
// DATA
// Xarxa de Corriols d'Alàs i Cerc
// ============================================================

import fs from "fs";
import path from "path";


// ============================================================
// CONFIGURACIÓ
// ============================================================

const DATA_DIR =
  path.resolve(
    process.cwd(),
    "public/data/xarxa_v0.7"
  );


const GPX_DIR =
  path.join(
    DATA_DIR,
    "gpx"
  );


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
// ID TERMINAL
// ============================================================

function terminalId(
  segment,
  side
) {

  return (
    `TERMINAL_${segment}_${side}`
  );

}


// ============================================================
// INDEXAR NODES
// ============================================================

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
// EXPORTS
// ============================================================

export {

  DATA_DIR,

  GPX_DIR,

  parseGPX,

  loadGPX,

  loadJSON,

  terminalId,

  buildNodeIndex,

  buildEdgeIndex,

};