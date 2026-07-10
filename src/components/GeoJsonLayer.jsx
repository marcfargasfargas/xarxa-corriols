import { GeoJSON, useMap } from "react-leaflet";
import { useEffect, useRef } from "react";
import L from "leaflet";

export default function GeoJsonLayer({ data, onSegmentClick }) {
  console.log("Prop onSegmentClick:", onSegmentClick);

  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!data) return;

    const layer = L.geoJSON(data);
    const bounds = layer.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [20, 20],
      });
    } else {
      console.warn("El fitxer no conté geometries vàlides.");
    }
  }, [data, map]);

  if (!data) return null;

  return (
    <GeoJSON
      ref={layerRef}
      data={data}
      style={{
        color: "#d32f2f",
        weight: 4,
      }}
      onEachFeature={(feature, layer) => {
  layer.on("click", () => {
    onSegmentClick(feature);

    const seleccionat = layer.options.seleccionat === true;

    if (seleccionat) {
      layer.setStyle({
        color: "#d32f2f",
        weight: 4,
      });

      layer.options.seleccionat = false;
    } else {
      layer.setStyle({
        color: "#1976d2",
        weight: 6,
      });

      layer.options.seleccionat = true;
    }
  });
}}
    />
  );
}