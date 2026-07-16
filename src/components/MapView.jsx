/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
Field Edition 0.5 RC1

Fitxer: MapView.jsx

Responsabilitats:
- Crear el mapa Leaflet
- Coordinar les capes
- Gestionar el selector de mapes

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
  statusFilter,
}) {

  return (

    <div
      style={{
        position: "relative",
        width: "100%",
        height: "600px",
      }}
    >

      <MapContainer
        key={mapVersion}
        center={[42.3562, 1.5068]}
        zoom={14}
        style={{
          width: "100%",
          height: "100%",
        }}
      >

        {/* Mapa base */}
        <BaseLayers
          gisLayers={gisLayers}
        />

        {/* Zoom automàtic */}
        <MapAutoZoom
          geojsonLayers={geojsonLayers}
        />

        {/* Xarxes */}
        {geojsonLayers.map((layer, index) => (

          <GeoJsonLayer
            key={`${index}-${statusFilter}`}
            data={layer}
            onSegmentClick={onSegmentClick}
            selectedSegments={selectedSegments}
            activeTrail={activeTrail}
            trailStatus={trailStatus}
            statusFilter={statusFilter}
          />

        ))}

      </MapContainer>

      {/* Selector flotant */}
      <BaseMapSelector
        gisLayers={gisLayers}
        updateGISLayer={updateGISLayer}
      />

    </div>

  );

}