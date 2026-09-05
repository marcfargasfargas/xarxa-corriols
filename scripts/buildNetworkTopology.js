/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
v0.7

Fitxer: buildNetworkTopology.js

Responsabilitats:
- Analitzar les connexions entre segments
- Detectar extrem ↔ extrem
- Detectar extrem ↔ interior
- Detectar possibles interior ↔ interior
- Preparar la topologia de la xarxa

IMPORTANT:
Aquest script NO modifica els GPX originals.

Tolerància inicial:
20 metres

----------------------------------------------------
*/

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


// ==============================
// Configuració
// ==============================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GPX_DIR = path.join(
  __dirname,
  "..",
  "public",
  "data",
  "xarxa_v0.7",
  "gpx"
);

const OUTPUT_FILE = path.join(
  __dirname,
  "..",
  "public",
  "data",
  "xarxa_v0.7",
  "network-topology-candidates.json"
);

const TOLERANCE_METERS = 20;


// ==============================
// Distància geogràfica
// ==============================

function distanceMeters(pointA, pointB) {

  const R = 6371000;

  const lat1 =
    pointA.lat * Math.PI / 180;

  const lat2 =
    pointB.lat * Math.PI / 180;

  const deltaLat =
    (pointB.lat - pointA.lat) *
    Math.PI / 180;

  const deltaLon =
    (pointB.lon - pointA.lon) *
    Math.PI / 180;

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
    Math.cos(lat2) *
    Math.sin(deltaLon / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;
}


// ==============================
// Distància punt → segment
// ==============================

function distancePointToSegment(
  point,
  segmentStart,
  segmentEnd
) {

  const latScale = 111320;

  const lonScale =
    111320 *
    Math.cos(
      point.lat * Math.PI / 180
    );


  const px =
    point.lon * lonScale;

  const py =
    point.lat * latScale;


  const ax =
    segmentStart.lon * lonScale;

  const ay =
    segmentStart.lat * latScale;


  const bx =
    segmentEnd.lon * lonScale;

  const by =
    segmentEnd.lat * latScale;


  const dx = bx - ax;

  const dy = by - ay;


  if (
    dx === 0 &&
    dy === 0
  ) {

    return {

      distance:
        Math.sqrt(
          (px - ax) ** 2 +
          (py - ay) ** 2
        ),

      ratio: 0,

    };

  }


  const ratio =
    Math.max(
      0,
      Math.min(
        1,
        (
          (px - ax) * dx +
          (py - ay) * dy
        ) /
        (dx * dx + dy * dy)
      )
    );


  const closestX =
    ax + ratio * dx;

  const closestY =
    ay + ratio * dy;


  return {

    distance:
      Math.sqrt(
        (px - closestX) ** 2 +
        (py - closestY) ** 2
      ),

    ratio,

    closestPoint: {

      lat:
        segmentStart.lat +
        (
          segmentEnd.lat -
          segmentStart.lat
        ) * ratio,

      lon:
        segmentStart.lon +
        (
          segmentEnd.lon -
          segmentStart.lon
        ) * ratio,

    },

  };

}


// ==============================
// Llegir GPX
// ==============================

function parseGPX(content) {

  const points = [];

  const regex =
    /<trkpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;

  let match;


  while (
    (match = regex.exec(content)) !== null
  ) {

    const lat =
      Number(match[1]);

    const lon =
      Number(match[2]);


    const elevationMatch =
      match[3].match(
        /<ele>([-+0-9.eE]+)<\/ele>/
      );


    const elevation =
      elevationMatch
        ? Number(elevationMatch[1])
        : null;


    points.push({

      lat,
      lon,
      elevation,

    });

  }


  return points;

}


// ==============================
// Carregar segments
// ==============================

function loadSegments() {

  const files =
    fs
      .readdirSync(GPX_DIR)
      .filter(
        file =>
          file
            .toLowerCase()
            .endsWith(".gpx")
      )
      .sort();


  const segments = [];


  for (
    const file of files
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
      parseGPX(content);


    if (
      points.length < 2
    ) {

      continue;

    }


    segments.push({

      file,

      points,

      start:
        points[0],

      end:
        points[points.length - 1],

    });

  }


  return segments;

}


// ==============================
// Detectar topologia
// ==============================

function buildTopologyCandidates(
  segments
) {

  const endpointConnections = [];

  const endpointToInterior = [];

  const interiorIntersections = [];


  // --------------------------------
  // Extrem ↔ extrem
  // --------------------------------

  for (
    let i = 0;
    i < segments.length;
    i++
  ) {

    for (
      let j = i + 1;
      j < segments.length;
      j++
    ) {

      const A =
        segments[i];

      const B =
        segments[j];


      const pairs = [

        [
          "start",
          A.start,
          "start",
          B.start
        ],

        [
          "start",
          A.start,
          "end",
          B.end
        ],

        [
          "end",
          A.end,
          "start",
          B.start
        ],

        [
          "end",
          A.end,
          "end",
          B.end
        ],

      ];


      for (
        const [
          sideA,
          pointA,
          sideB,
          pointB
        ]
        of pairs
      ) {

        const distance =
          distanceMeters(
            pointA,
            pointB
          );


        if (
          distance <=
          TOLERANCE_METERS
        ) {

          endpointConnections.push({

            type:
              "endpoint-endpoint",

            segmentA:
              A.file,

            sideA,

            segmentB:
              B.file,

            sideB,

            distance_m:
              Number(
                distance.toFixed(2)
              ),

          });

        }

      }

    }

  }


  // --------------------------------
  // Extrem ↔ interior
  // --------------------------------

  for (
    const A of segments
  ) {

    const endpoints = [

      {
        side: "start",
        point: A.start,
      },

      {
        side: "end",
        point: A.end,
      },

    ];


    for (
      const endpoint
      of endpoints
    ) {

      for (
        const B of segments
      ) {

        if (
          A.file === B.file
        ) {

          continue;

        }


        for (
          let i = 1;
          i <
          B.points.length - 2;
          i++
        ) {

          const p1 =
            B.points[i];

          const p2 =
            B.points[i + 1];


          const result =
            distancePointToSegment(
              endpoint.point,
              p1,
              p2
            );
let distanceFromStart = 0;

for (let j = 0; j < i; j++) {

  distanceFromStart +=
    distanceMeters(
      B.points[j],
      B.points[j + 1]
    );

}

distanceFromStart +=
  distanceMeters(
    B.points[i],
    result.closestPoint
  );


let totalSegmentDistance = 0;

for (let j = 0; j < B.points.length - 1; j++) {

  totalSegmentDistance +=
    distanceMeters(
      B.points[j],
      B.points[j + 1]
    );

}


const positionAlongSegment =
  totalSegmentDistance > 0
    ? distanceFromStart /
      totalSegmentDistance
    : 0;

          if (
            result.distance <=
            TOLERANCE_METERS
          ) {

            endpointToInterior.push({

  type:
    "endpoint-interior",

  segmentA:
    A.file,

  sideA:
    endpoint.side,

  segmentB:
    B.file,

  segmentPointIndex:
    i,

  positionOnSegment:
    Number(
      result.ratio.toFixed(4)
    ),

  positionAlongSegment:
    Number(
      positionAlongSegment.toFixed(4)
    ),

  connectionPoint: {

    lat:
      Number(
        result.closestPoint.lat.toFixed(7)
      ),

    lon:
      Number(
        result.closestPoint.lon.toFixed(7)
      ),

  },

  distance_m:
    Number(
      result.distance.toFixed(2)
    ),

});

          }

        }

      }

    }

  }


  return {

    endpointConnections,

    endpointToInterior,

    interiorIntersections,

  };

}


// ==============================
// Construir
// ==============================

function build() {

  console.log(
    "🌿 Analitzant topologia de la xarxa v0.7..."
  );


  const segments =
    loadSegments();


  console.log(
    `📂 Segments carregats: ${segments.length}`
  );


  const candidates =
    buildTopologyCandidates(
      segments
    );


  const output = {

    version:
      "0.7",

    generatedAt:
      new Date().toISOString(),

    tolerance_m:
      TOLERANCE_METERS,

    segmentCount:
      segments.length,

    endpointConnections:
      candidates.endpointConnections,

    endpointToInterior:
      candidates.endpointToInterior,

    interiorIntersections:
      candidates.interiorIntersections,

  };


  fs.writeFileSync(

    OUTPUT_FILE,

    JSON.stringify(
      output,
      null,
      2
    ),

    "utf8"

  );


  console.log("");

  console.log(
    "✅ Anàlisi topològica creada."
  );

  console.log(
    `🔗 Extrem ↔ extrem: ${
      candidates.endpointConnections.length
    }`
  );

  console.log(
    `📍 Extrem ↔ interior: ${
      candidates.endpointToInterior.length
    }`
  );

  console.log(
    `✳️ Interior ↔ interior: ${
      candidates.interiorIntersections.length
    }`
  );

  console.log("");

  console.log(
    `📄 Fitxer: ${OUTPUT_FILE}`
  );

}


// ==============================
// Executar
// ==============================

try {

  build();

} catch (error) {

  console.error("");

  console.error(
    "❌ Error analitzant la topologia:"
  );

  console.error(
    error.message
  );

  process.exit(1);

}