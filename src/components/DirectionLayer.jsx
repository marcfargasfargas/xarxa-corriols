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
  // IDENTIFICADOR DE LA RUTA VISUAL
  //
  // Quan canvia la selecció:
  //
  //  EDGE_A | EDGE_B | EDGE_C
  //
  // passa a:
  //
  //  EDGE_A | EDGE_B
  //
  // i React força la reconstrucció del LayerGroup.
  // Això evita deixar capes taronges "fantasma".
  // ============================================================

  const routeKey =
    selectedRoute
      .map(
        (edge) =>
          edge.edgeId
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
        (edge) => {

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


          return (

            <GeoJSON

              key={
                `selected-${edge.edgeId}`
              }

              data={
                feature
              }

              interactive={
                false
              }

              style={{
                color:
                  "#ff9800",

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