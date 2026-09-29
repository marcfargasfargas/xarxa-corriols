// ============================================================
// POSICIÓ NORMALITZADA → PUNT GPX
// ============================================================
function clamp(
  value,
  min,
  max
) {

  return Math.min(
    Math.max(
      value,
      min
    ),
    max
  );

}


// ============================================================
// INTERPOLAR PUNT
// ============================================================

function interpolatePoint(
  a,
  b,
  ratio
) {

  const r =
    clamp(
      ratio,
      0,
      1
    );


  let elevation =
    null;


  if (
    Number.isFinite(
      a.elevation
    ) &&
    Number.isFinite(
      b.elevation
    )
  ) {

    elevation =
      a.elevation +
      (
        b.elevation -
        a.elevation
      ) *
      r;

  }


  return {

    lat:
      a.lat +
      (
        b.lat -
        a.lat
      ) *
      r,

    lon:
      a.lon +
      (
        b.lon -
        a.lon
      ) *
      r,

    elevation,

  };

}


function distanceBetweenPoints(
  a,
  b
) {

  const R =
    6371000;


  const lat1 =
    Number(a.lat) *
    Math.PI /
    180;


  const lat2 =
    Number(b.lat) *
    Math.PI /
    180;


  const dLat =
    (
      Number(b.lat) -
      Number(a.lat)
    ) *
    Math.PI /
    180;


  const dLon =
    (
      Number(b.lon) -
      Number(a.lon)
    ) *
    Math.PI /
    180;


  const x =
    Math.sin(
      dLat / 2
    ) ** 2;


  const y =
    Math.cos(lat1) *
    Math.cos(lat2) *
    Math.sin(
      dLon / 2
    ) ** 2;


  const c =
    2 *
    Math.atan2(
      Math.sqrt(
        x + y
      ),
      Math.sqrt(
        1 - x - y
      )
    );


  return R * c;

}

function pointAtPosition(
  points,
  position
) {

  if (
    points.length < 2
  ) {

    throw new Error(
      "GPX amb menys de 2 punts."
    );

  }


  const p =
    clamp(
      Number(position),
      0,
      1
    );


  // ----------------------------------------------------------
  // Posició basada en DISTÀNCIA REAL del GPX
  // ----------------------------------------------------------

  const distances = [
    0
  ];


  let totalDistance =
    0;


  for (
    let i = 1;
    i < points.length;
    i++
  ) {

    totalDistance +=
      distanceBetweenPoints(
        points[i - 1],
        points[i]
      );


    distances.push(
      totalDistance
    );

  }


  if (
    totalDistance <= 0
  ) {

    return {

      ...points[0],

      _position:
        p,

    };

  }


  const targetDistance =
    p *
    totalDistance;


  let index =
    0;


  while (
    index <
      distances.length - 1 &&
    distances[index + 1] <
      targetDistance
  ) {

    index++;

  }


  if (
    index >=
      points.length - 1
  ) {

    return {

      ...points[
        points.length - 1
      ],

      _position:
        1,

    };

  }


  const segmentDistance =
    distances[index + 1] -
    distances[index];


  const ratio =
    segmentDistance > 0
      ? (
          targetDistance -
          distances[index]
        ) /
        segmentDistance
      : 0;


  return {

    ...interpolatePoint(
      points[index],
      points[index + 1],
      ratio
    ),

    _position:
      p,

  };

}


// ============================================================
// EXTREURE SUBTRAM GPX
// ============================================================

function extractSegmentSlice(
  points,
  positionStart,
  positionEnd
) {

  const reversed =
    positionEnd <
    positionStart;


  const low =
    Math.min(
      positionStart,
      positionEnd
    );


  const high =
    Math.max(
      positionStart,
      positionEnd
    );


  // ----------------------------------------------------------
  // Distàncies acumulades del GPX
  // ----------------------------------------------------------

  const distances = [
    0
  ];


  let totalDistance =
    0;


  for (
    let i = 1;
    i < points.length;
    i++
  ) {

    totalDistance +=
      distanceBetweenPoints(
        points[i - 1],
        points[i]
      );


    distances.push(
      totalDistance
    );

  }


  // ----------------------------------------------------------
  // Punts inicial i final
  // ----------------------------------------------------------

  const startPoint =
    pointAtPosition(
      points,
      low
    );


  const endPoint =
    pointAtPosition(
      points,
      high
    );


  const result = [];


  result.push(
    startPoint
  );


  // ----------------------------------------------------------
  // Punts interiors
  // ----------------------------------------------------------

  const startDistance =
    low *
    totalDistance;


  const endDistance =
    high *
    totalDistance;


  for (
    let i = 1;
    i < points.length - 1;
    i++
  ) {

    if (
      distances[i] >
        startDistance &&
      distances[i] <
        endDistance
    ) {

      result.push({

        ...points[i],

        _position:
          distances[i] /
          totalDistance,

      });

    }

  }


  // ----------------------------------------------------------
  // Punt final
  // ----------------------------------------------------------

  result.push(
    endPoint
  );


  // ----------------------------------------------------------
  // Eliminar duplicats consecutius
  // ----------------------------------------------------------

  const cleaned = [];


  for (
    const point of result
  ) {

    if (
      cleaned.length === 0
    ) {

      cleaned.push(
        point
      );

      continue;

    }


    const previous =
      cleaned[
        cleaned.length - 1
      ];


    const distance =
      distanceBetweenPoints(
        previous,
        point
      );


    if (
      distance >
      0.01
    ) {

      cleaned.push(
        point
      );

    }

  }


  // ----------------------------------------------------------
  // Invertir si és REV
  // ----------------------------------------------------------

  if (
    reversed
  ) {

    cleaned.reverse();

  }


  return cleaned;

}


// ============================================================
// DISTÀNCIA EN METRES
// ============================================================

function distanceMeters(
  a,
  b
) {

  return distanceBetweenPoints(
    a,
    b
  );

}


// ============================================================
// EXPORTS
// ============================================================

export {
  clamp,
  interpolatePoint,
  distanceBetweenPoints,
  distanceMeters,
  pointAtPosition,
  extractSegmentSlice,
};