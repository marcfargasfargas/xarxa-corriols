import { GeoJSON } from "react-leaflet";
import { useRef } from "react";

export default function GeoJsonLayer({
  data,
  onSegmentClick,
  selectedSegments,
  activeTrail,
  trailStatus,
}) {
  const layerRef = useRef(null);

  if (!data) return null;

  function getStatus(feature) {
    const name = feature.properties?.name;
    return trailStatus[name] ?? "unreviewed";
  }

  function getColor(status) {
    switch (status) {
      case "clean":
        return "#2e7d32"; // Verd

      case "pending":
        return "#f9a825"; // Taronja

      case "closed":
        return "#c62828"; // Vermell

      default:
        return "#757575"; // Gris
    }
  }

  function isActive(feature) {
    return activeTrail?.name === feature.properties?.name;
  }

  return (
    <GeoJSON
      ref={layerRef}
      data={data}
      style={(feature) => {

        const status = getStatus(feature);
        const active = isActive(feature);

        return {
          color: getColor(status),
          weight: active ? 7 : 4,
          opacity: 1,
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