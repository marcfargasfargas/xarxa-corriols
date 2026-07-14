/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
Field Edition 0.5

Fitxer: MapView.jsx

Responsabilitats:
- Crear el mapa Leaflet
- Coordinar les capes
- Passar la configuració del GIS

----------------------------------------------------
*/

import { MapContainer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import BaseLayers from "./BaseLayers";
import MapAutoZoom from "./MapAutoZoom";
import GeoJsonLayer from "./GeoJsonLayer";
import BaseMapSelector from "./BaseMapSelector";

export default function MapView({
  geojsonLayers,
  onSegmentClick,
  selectedSegments,
  activeTrail,
  trailStatus,
  gisLayers,
  updateGISLayer,
  mapVersion,
}) {

  return (
    <div style={{ height: "600px", width: "100%" }}>
      <MapContainer
        key={mapVersion}
        center={[42.3562, 1.5068]}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
      >
        {/* Mapes base */}
        <BaseLayers gisLayers={gisLayers} />
        
        <BaseMapSelector
          gisLayers={gisLayers}
          updateGISLayer={updateGISLayer}
       />

        {/* Zoom automàtic */}
        <MapAutoZoom geojsonLayers={geojsonLayers} />

        {/* Xarxes carregades */}
       {geojsonLayers.map((layer, index) => (

  <GeoJsonLayer
    key={index}
    data={layer}
    onSegmentClick={onSegmentClick}
    selectedSegments={selectedSegments}
    activeTrail={activeTrail}
    trailStatus={trailStatus}
  />

))}
      </MapContainer>
    </div>
  );
}