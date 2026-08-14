/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
Field Edition 0.4

Fitxer: segmentParser.js

Responsabilitats:
- Interpretar qualsevol segment GeoJSON
- Obtenir el nom
- Calcular la distància
- Obtenir els desnivells
- Retornar un objecte estàndard per a tota l'aplicació

Compatible amb:
- GPX
- KML
- KMZ

----------------------------------------------------
*/

import * as turf from "@turf/turf";

export function parseSegment(feature) {

  const properties = feature.properties ?? {};
  
  const description =
  properties.description?.value ??
  properties.description ??
  properties.desc ??
  "";

  // ==============================
  // Nom del segment
  // ==============================

  const name = properties.name ?? "Sense nom";

  // ==============================
  // Distància
  // ==============================

  let distance = 0;

  const matchDistance =
    description.match(/Distància:\s*([\d.,]+)/);

  if (matchDistance) {
    distance = parseFloat(
      matchDistance[1].replace(",", ".")
    );
  } else {
    try {
      distance = turf.length(feature, {
        units: "kilometers",
      });
    } catch {
      distance = 0;
    }
  }

  // ==============================
  // Desnivells
  // ==============================

  let ascent = 0;
  let descent = 0;

  const matchAscent =
    description.match(/Ascensió total:\s*([\d.,]+)/);

  const matchDescent =
    description.match(/Baixada total:\s*([\d.,]+)/);

  if (matchAscent) {
    ascent = parseFloat(
      matchAscent[1].replace(",", ".")
    );
  }

  if (matchDescent) {
    descent = parseFloat(
      matchDescent[1].replace(",", ".")
    );
  }

  // ==============================
  // Objecte normalitzat
  // ==============================

  return {
    name,
    distance,
    ascent,
    descent,
    feature,
  };
}