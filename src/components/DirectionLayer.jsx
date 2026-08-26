import {
  GeoJSON,
  LayerGroup,
  Marker,
} from "react-leaflet";

import L from "leaflet";


export default function DirectionLayer({
  networkGeoJSON,
  selectedRoute,
  predefinedRouteGeoJSON,
}) {

  if (
  !predefinedRouteGeoJSON &&
  (!networkGeoJSON || !selectedRoute?.length)
) {
  return null;
}

    // ============================================================
  // RUTA PREDEFINIDA
  // ============================================================

  if (predefinedRouteGeoJSON) {

    const arrowSpacing = 500;

    function distanceBetween(pointA, pointB) {
      return L.latLng(
        pointA[1],
        pointA[0]
      ).distanceTo(
        L.latLng(
          pointB[1],
          pointB[0]
        )
      );
    }

    function calculateBearing(pointA, pointB) {

      const lat1 =
        pointA[1] *
        Math.PI /
        180;

      const lat2 =
        pointB[1] *
        Math.PI /
        180;

      const deltaLon =
        (
          pointB[0] -
          pointA[0]
        ) *
        Math.PI /
        180;

      const y =
        Math.sin(deltaLon) *
        Math.cos(lat2);

      const x =
        Math.cos(lat1) *
          Math.sin(lat2) -
        Math.sin(lat1) *
          Math.cos(lat2) *
          Math.cos(deltaLon);

      return (
        (
          Math.atan2(y, x) *
          180 /
          Math.PI +
          360
        ) % 360
      );
    }

    function interpolatePoint(
      pointA,
      pointB,
      ratio
    ) {

      return [
        pointA[0] +
          (
            pointB[0] -
            pointA[0]
          ) *
          ratio,

        pointA[1] +
          (
            pointB[1] -
            pointA[1]
          ) *
          ratio,
      ];
    }

    const arrows = [];

    let accumulatedDistance = 0;
    let nextArrowDistance = arrowSpacing;

    predefinedRouteGeoJSON.features?.forEach(
      (feature) => {

        const coordinates =
          feature.geometry?.coordinates;

        if (
          !coordinates ||
          coordinates.length < 2
        ) {
          return;
        }

        for (
          let i = 1;
          i < coordinates.length;
          i++
        ) {

          const pointA =
            coordinates[i - 1];

          const pointB =
            coordinates[i];

          const segmentDistance =
            distanceBetween(
              pointA,
              pointB
            );

          if (
            segmentDistance <= 0
          ) {
            continue;
          }

          const segmentStart =
            accumulatedDistance;

          const segmentEnd =
            accumulatedDistance +
            segmentDistance;

          while (
            nextArrowDistance >=
              segmentStart &&
            nextArrowDistance <
              segmentEnd
          ) {

            const distanceIntoSegment =
              nextArrowDistance -
              segmentStart;

            const ratio =
              distanceIntoSegment /
              segmentDistance;

            const arrowPoint =
              interpolatePoint(
                pointA,
                pointB,
                ratio
              );

            const bearing =
              calculateBearing(
                pointA,
                pointB
              );

            arrows.push({
              position: [
                arrowPoint[1],
                arrowPoint[0],
              ],
              bearing,
            });

            nextArrowDistance +=
              arrowSpacing;
          }

          accumulatedDistance =
            segmentEnd;
        }
      }
    );

    return (
      <LayerGroup>

        {/* ================================================== */}
        {/* TRAÇAT DE LA VOLTA */}
        {/* ================================================== */}

        <GeoJSON
          data={
            predefinedRouteGeoJSON
          }

          interactive={
            false
          }

          style={{
            color: "#f59e0b",
            weight: 8,
            opacity: 1,
          }}
        />

        {/* ================================================== */}
        {/* FLETXES DE DIRECCIÓ */}
        {/* ================================================== */}

        {arrows.map(
          (
            arrow,
            index
          ) => {

            const arrowRotation =
              arrow.bearing - 90;

            const arrowIcon =
              L.divIcon({

                className:
                  "route-direction-arrow",

                html: `
                  <div
                    style="
                      transform: rotate(${arrowRotation}deg);
                      color: #f59e0b;
                      font-size: 24px;
                      font-weight: 900;
                      line-height: 1;
                      text-shadow:
                        0 0 2px white,
                        0 0 2px white,
                        0 0 3px white;
                      width: 24px;
                      height: 24px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                    "
                  >
                    ➤
                  </div>
                `,

                iconSize: [
                  24,
                  24,
                ],

                iconAnchor: [
                  12,
                  12,
                ],

              });

            return (
              <Marker
                key={
                  `predefined-arrow-${index}`
                }

                position={
                  arrow.position
                }

                icon={
                  arrowIcon
                }

                interactive={
                  false
                }
              />
            );

          }
        )}

      </LayerGroup>
    );
  }


  // ============================================================
  // INDEXAR GEOMETRIES PER EDGE ID
  // ============================================================

  const edgeFeatures =
    new Map();

  networkGeoJSON.features.forEach(
    (feature) => {

      const edgeId =
        feature.properties?.edgeId;

      if (!edgeId) {
        return;
      }

      edgeFeatures.set(
        edgeId,
        feature
      );

    }
  );


  // ============================================================
  // COMPTAR QUANTES VEGADES APAREIX CADA EDGE
  // ============================================================

  const edgeUsage =
  new Map();

selectedRoute.forEach(
  (edge) => {

    const physicalEdgeId =
      edge.edgeId.replace(
        /_REV$/,
        ""
      );

    const currentCount =
      edgeUsage.get(
        physicalEdgeId
      ) || 0;

    edgeUsage.set(
      physicalEdgeId,
      currentCount + 1
    );

  }
);


  // ============================================================
  // IDENTIFICADOR DE LA RUTA VISUAL
  // ============================================================

  const routeKey =
    selectedRoute
      .map(
        (edge, index) =>
          `${index}-${edge.edgeId}`
      )
      .join("|");


  // ============================================================
  // OBTENIR PUNT I DIRECCIÓ DE LA FLETXA
  // ============================================================

  function getArrowData(
    feature
  ) {

    const coordinates =
      feature.geometry?.coordinates;


    if (
      !coordinates ||
      coordinates.length < 2
    ) {
      return null;
    }


    // ----------------------------------------------------------
    // Agafem la zona central de la línia.
    //
    // Utilitzem dos punts propers al centre per calcular
    // la direcció de la fletxa.
    // ----------------------------------------------------------

    const middleIndex =
      Math.floor(
        (coordinates.length - 1) / 2
      );


    const pointA =
      coordinates[
        middleIndex
      ];

    const pointB =
      coordinates[
        Math.min(
          middleIndex + 1,
          coordinates.length - 1
        )
      ];


    if (
      !pointA ||
      !pointB
    ) {
      return null;
    }


    const lonA =
      pointA[0];

    const latA =
      pointA[1];

    const lonB =
      pointB[0];

    const latB =
      pointB[1];


    // ----------------------------------------------------------
    // PUNT CENTRAL DE LA FLETXA
    // ----------------------------------------------------------

    const lat =
      (latA + latB) / 2;

    const lon =
      (lonA + lonB) / 2;


    // ----------------------------------------------------------
    // CALCULAR RUMB
    //
    // 0°   = nord
    // 90°  = est
    // 180° = sud
    // 270° = oest
    // ----------------------------------------------------------

    const lat1 =
      latA * Math.PI / 180;

    const lat2 =
      latB * Math.PI / 180;

    const deltaLon =
      (lonB - lonA) *
      Math.PI / 180;


    const y =
      Math.sin(
        deltaLon
      ) *
      Math.cos(lat2);


    const x =
      Math.cos(lat1) *
        Math.sin(lat2) -
      Math.sin(lat1) *
        Math.cos(lat2) *
        Math.cos(deltaLon);


    const bearing =
      (
        Math.atan2(
          y,
          x
        ) *
        180 /
        Math.PI +
        360
      ) % 360;


    return {
      lat,
      lon,
      bearing,
    };

  }


  // ============================================================
  // DIBUIXAR RUTA
  // ============================================================

  return (

    <LayerGroup
      key={
        `selected-route-${routeKey}`
      }
    >

      {selectedRoute.map(
        (edge, index) => {

          const feature =
            edgeFeatures.get(
              edge.edgeId
            );


          if (!feature) {

            console.warn(
              "⚠️ Geometria no trobada per:",
              edge.edgeId
            );

            return null;
          }


          // ======================================================
          // ÚS DE L'EDGE
          // ======================================================

          const physicalEdgeId =
  edge.edgeId.replace(
    /_REV$/,
    ""
  );

const usageCount =
  edgeUsage.get(
    physicalEdgeId
  ) || 1;


          const isRepeated =
            usageCount > 1;


          // ======================================================
          // COLOR
          // ======================================================

          const routeColor =
            isRepeated
              ? "#e65100"
              : "#ff9800";


          // ======================================================
          // DADES DE LA FLETXA
          // ======================================================

          const arrowData =
            getArrowData(
              feature
            );


          // ======================================================
          // ROTACIÓ DE LA FLETXA
          //
          // La fletxa ➤ apunta inicialment cap a la dreta.
          // El bearing 0° apunta cap al nord.
          //
          // Per això restem 90°.
          // ======================================================

          const arrowRotation =
            arrowData
              ? arrowData.bearing - 90
              : 0;


          // ======================================================
          // ICONA DE DIRECCIÓ
          // ======================================================

          const arrowIcon =
            L.divIcon({

              className:
                "route-direction-arrow",

              html: `
                <div
                  style="
                    transform: rotate(${arrowRotation}deg);
                    color: ${routeColor};
                    font-size: 24px;
                    font-weight: 900;
                    line-height: 1;
                    text-shadow:
                      0 0 2px white,
                      0 0 2px white,
                      0 0 3px white;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  "
                >
                  ➤
                </div>
              `,

              iconSize: [
                24,
                24,
              ],

              iconAnchor: [
                12,
                12,
              ],

            });


          return (

            <LayerGroup
              key={
                `selected-edge-${edge.edgeId}-${index}`
              }
            >

              {/* ================================================
                  LÍNIA SELECCIONADA
                  ================================================ */}

              <GeoJSON

                data={
                  feature
                }

                interactive={
                  false
                }

                style={{
                  color:
                    routeColor,

                  weight:
                    8,

                  opacity:
                    1,
                }}

              />


              {/* ================================================
                  FLETXA DE DIRECCIÓ
                  ================================================ */}

              {
                arrowData && (

                  <Marker

                    position={[
                      arrowData.lat,
                      arrowData.lon,
                    ]}

                    icon={
                      arrowIcon
                    }

                    interactive={
                      false
                    }

                  />

                )
              }

            </LayerGroup>

          );

        }
      )}

    </LayerGroup>

  );

}