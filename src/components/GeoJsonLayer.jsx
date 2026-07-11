/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
Field Edition 0.4

Fitxer: GeoJsonLayer.jsx

Responsabilitats:
- Dibuixar una xarxa GeoJSON
- Aplicar l'estil dels segments
- Gestionar la selecció dels trams
- Notificar els clics a App.jsx

----------------------------------------------------
*/

import { GeoJSON } from "react-leaflet";
import { useRef } from "react";

export default function GeoJsonLayer({
  data,
  onSegmentClick,
  selectedSegments,
}) {

  const layerRef = useRef(null);

  if (!data) return null;

  // Comprova si un segment està seleccionat
  function isSelected(feature) {
    return selectedSegments.some(
      (segment) => segment.name === feature.properties.name
    );
  }

  return (
    <GeoJSON
      ref={layerRef}
      data={data}

      style={(feature) => {
        const selected = isSelected(feature);

        return {
          color: selected ? "#1976d2" : "#d32f2f",
          weight: selected ? 6 : 4,
        };
      }}

      onEachFeature={(feature, layer) => {
        layer.on("click", () => {
          onSegmentClick?.(feature);
        });
      }}
    />
  );
}