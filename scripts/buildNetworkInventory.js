/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
v0.7

Fitxer: buildNetworkInventory.js

Responsabilitats:
- Llegir tots els GPX de la xarxa
- Extreure informació bàsica dels segments
- Calcular distància
- Calcular desnivell positiu i negatiu
- Preparar l'inventari de la xarxa

Font:
public/data/xarxa-v07/gpx/

Sortida:
public/data/xarxa-v07/network-inventory.json

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
  "network-inventory.json"
);


// ==============================
// Distància entre dos punts
// ==============================

function distanceMeters(pointA, pointB) {

  const R = 6371000;

  const lat1 = pointA.lat * Math.PI / 180;
  const lat2 = pointB.lat * Math.PI / 180;

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
// Llegir punts GPX
// ==============================

function parseGPX(content) {

  const points = [];

  const regex =
    /<trkpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;

  let match;

  while ((match = regex.exec(content)) !== null) {

    const lat = Number(match[1]);
    const lon = Number(match[2]);

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
// Analitzar segment
// ==============================

function analyseSegment(fileName) {

  const filePath =
    path.join(GPX_DIR, fileName);

  const content =
    fs.readFileSync(
      filePath,
      "utf8"
    );

  const points =
    parseGPX(content);

  if (points.length < 2) {

    console.warn(
      `⚠️ ${fileName}: menys de 2 punts`
    );

    return null;
  }


  let distance = 0;

  let ascent = 0;

  let descent = 0;


  for (
    let i = 1;
    i < points.length;
    i++
  ) {

    const previous =
      points[i - 1];

    const current =
      points[i];


    distance +=
      distanceMeters(
        previous,
        current
      );


    if (
      previous.elevation !== null &&
      current.elevation !== null
    ) {

      const delta =
        current.elevation -
        previous.elevation;


      if (delta > 0) {

        ascent += delta;

      } else {

        descent +=
          Math.abs(delta);

      }

    }

  }


  return {

    file: fileName,

    points: points.length,

    distance_m:
      Number(distance.toFixed(1)),

    distance_km:
      Number(
        (distance / 1000).toFixed(3)
      ),

    ascent_m:
      Number(ascent.toFixed(1)),

    descent_m:
      Number(descent.toFixed(1)),

    start: {

      lat: points[0].lat,

      lon: points[0].lon,

      elevation:
        points[0].elevation,

    },

    end: {

      lat:
        points[points.length - 1].lat,

      lon:
        points[points.length - 1].lon,

      elevation:
        points[points.length - 1].elevation,

    },

  };

}


// ==============================
// Construcció de l'inventari
// ==============================

function buildInventory() {

  console.log(
    "🌿 Construint inventari de la xarxa v0.7..."
  );


  if (!fs.existsSync(GPX_DIR)) {

    throw new Error(
      `No existeix la carpeta GPX: ${GPX_DIR}`
    );

  }


  const files =
    fs
      .readdirSync(GPX_DIR)
      .filter(
        (file) =>
          file
            .toLowerCase()
            .endsWith(".gpx")
      )
      .sort();


  console.log(
    `📂 GPX trobats: ${files.length}`
  );


  const segments = [];


  for (const file of files) {

    const segment =
      analyseSegment(file);

    if (segment) {

      segments.push(segment);

    }

  }


  const inventory = {

    version: "0.7",

    generatedAt:
      new Date().toISOString(),

    source:

      "public/data/xarxa-v07/gpx/",

    segmentCount:
      segments.length,

    segments,

  };


  fs.writeFileSync(

    OUTPUT_FILE,

    JSON.stringify(
      inventory,
      null,
      2
    ),

    "utf8"

  );


  console.log("");

  console.log(
    "✅ Inventari creat correctament."
  );

  console.log(
    `📊 Segments: ${segments.length}`
  );

  console.log(
    `📄 Fitxer: ${OUTPUT_FILE}`
  );

}


// ==============================
// Executar
// ==============================

try {

  buildInventory();

} catch (error) {

  console.error("");

  console.error(
    "❌ Error construint l'inventari:"
  );

  console.error(
    error.message
  );

  process.exit(1);

}