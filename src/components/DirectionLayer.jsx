import {
  GeoJSON,
  LayerGroup,
  Marker,
} from "react-leaflet";

import L from "leaflet";


export default function DirectionLayer({
  networkGeoJSON,
  selectedRoute,
}) {

  if (
    !networkGeoJSON ||
    !selectedRoute?.length
  ) {
    return null;
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

      const edgeId =
        edge.edgeId;

      const currentCount =
        edgeUsage.get(
          edgeId
        ) || 0;

      edgeUsage.set(
        edgeId,
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

          const usageCount =
            edgeUsage.get(
              edge.edgeId
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