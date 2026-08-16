import {
  GeoJSON,
  LayerGroup,
} from "react-leaflet";


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
  //
  // Exemple:
  //
  // EDGE_A → 1
  // EDGE_B → 2
  // EDGE_C → 1
  // EDGE_D → 3
  //
  // Això ens permet detectar quan una ruta
  // torna a passar pel mateix tram.
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
  //
  // Incloem la posició de cada edge perquè React
  // pugui distingir correctament dues aparicions
  // del mateix edge.
  // ============================================================

  const routeKey =
    selectedRoute
      .map(
        (edge, index) =>
          `${index}-${edge.edgeId}`
      )
      .join("|");


  // ============================================================
  // DIBUIXAR RUTA SELECCIONADA
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
          // QUANTES VEGADES HEM UTILITZAT AQUEST EDGE?
          // ======================================================

          const usageCount =
            edgeUsage.get(
              edge.edgeId
            ) || 1;


          // ======================================================
          // ESTIL VISUAL
          //
          // Primera vegada:
          // taronja normal
          //
          // Segona vegada o més:
          // taronja més intens
          // ======================================================

          const isRepeated =
            usageCount > 1;


          return (

            <GeoJSON

              key={
                `selected-${edge.edgeId}-${index}`
              }

              data={
                feature
              }

              interactive={
                false
              }

              style={{
                color:
                  isRepeated
                    ? "#e65100"
                    : "#ff9800",

                weight:
                  8,

                opacity:
                  1,
              }}

            />

          );

        }
      )}

    </LayerGroup>

  );

}