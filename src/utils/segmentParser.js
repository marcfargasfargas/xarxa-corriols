import * as turf from "@turf/turf";

export function parseSegment(feature) {

  const properties = feature.properties ?? {};

  const description =
    properties.description?.value ??
    properties.description ??
    properties.desc ??
    "";

  // ==============================
  // IDENTIFICADOR DEL SEGMENT
  // ==============================

  // Nova xarxa GPX:
  // segment = 001.gpx, 002.gpx, etc.
  //
  // Compatibilitat amb xarxes antigues:
  // name continua sent acceptat.

  const name =
    properties.segment ??
    properties.name ??
    "Sense nom";

  const edgeId =
    properties.edgeId ??
    null;

  // ==============================
  // DISTÀNCIA
  // ==============================

  let distance = 0;

  if (
    Number.isFinite(
      Number(properties.distance_km)
    )
  ) {

    distance =
      Number(properties.distance_km);

  } else {

    const matchDistance =
      description.match(
        /Distància:\s*([\d.,]+)/
      );

    if (matchDistance) {

      distance =
        parseFloat(
          matchDistance[1].replace(",", ".")
        );

    } else {

      try {

        distance =
          turf.length(
            feature,
            {
              units: "kilometers",
            }
          );

      } catch {

        distance = 0;

      }

    }

  }

  // ==============================
  // DESNIVELLS
  // ==============================

  let ascent = 0;
  let descent = 0;

  // Nova xarxa GPX
  if (
    Number.isFinite(
      Number(properties.ascent_m)
    )
  ) {

    ascent =
      Number(properties.ascent_m);

  }

  if (
    Number.isFinite(
      Number(properties.descent_m)
    )
  ) {

    descent =
      Number(properties.descent_m);

  }

  // Compatibilitat amb xarxes antigues
  if (
    ascent === 0
  ) {

    const matchAscent =
      description.match(
        /Ascensió total:\s*([\d.,]+)/
      );

    if (matchAscent) {

      ascent =
        parseFloat(
          matchAscent[1].replace(",", ".")
        );

    }

  }

  if (
    descent === 0
  ) {

    const matchDescent =
      description.match(
        /Baixada total:\s*([\d.,]+)/
      );

    if (matchDescent) {

      descent =
        parseFloat(
          matchDescent[1].replace(",", ".")
        );

    }

  }

  // ==============================
  // OBJECTE NORMALITZAT
  // ==============================

  return {

    edgeId,

    name,

    distance,

    ascent,

    descent,

    feature,

  };

}