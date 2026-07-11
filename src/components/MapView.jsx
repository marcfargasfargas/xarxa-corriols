/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
Field Edition 0.4

Fitxer: MapView.jsx

Responsabilitats:
- Crear el mapa Leaflet
- Mostrar els mapes base
- Aplicar el zoom automàtic
- Mostrar totes les xarxes carregades

----------------------------------------------------
*/

import { MapContainer } from "react-leaflet";

import "leaflet/dist/leaflet.css";

import BaseLayers from "./BaseLayers";
import MapAutoZoom from "./MapAutoZoom";
import GeoJsonLayer from "./GeoJsonLayer";

export default function MapView({
  geojsonLayers,
  onSegmentClick,
  selectedSegments,
}) {
  return (
    <div style={{ height: "600px", width: "100%" }}>
      <MapContainer
        center={[42.3562, 1.5068]}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
      >
        {/* Mapes base */}
        <BaseLayers />

        {/* Zoom global */}
        <MapAutoZoom geojsonLayers={geojsonLayers} />

        {/* Xarxes carregades */}
        {geojsonLayers.map((layer, index) => (
          <GeoJsonLayer
            key={index}
            data={layer}
            onSegmentClick={onSegmentClick}
            selectedSegments={selectedSegments}
          />
        ))}
      </MapContainer>
    </div>
  );
}