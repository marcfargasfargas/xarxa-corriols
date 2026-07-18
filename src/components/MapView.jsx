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

import {
  MapContainer,
  GeoJSON,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import BaseLayers from "./BaseLayers";
import MapAutoZoom from "./MapAutoZoom";
import GeoJsonLayer from "./GeoJsonLayer";
import BaseMapSelector from "./BaseMapSelector";

function parseHuntingAreaDescription(description) {
  if (!description) return {};

  const parser = new DOMParser();
  const document = parser.parseFromString(
    description,
    "text/html"
  );

  const data = {};

  document.querySelectorAll("tr").forEach((row) => {
    const cells = row.querySelectorAll("td");

    if (cells.length === 2) {
      const key = cells[0].textContent.trim();
      const value = cells[1].textContent.trim();

      if (key && value) {
        data[key] = value;
      }
    }
  });

  return data;
}

export default function MapView({
  geojsonLayers,
  huntingAreasData,
  onSegmentClick,
  selectedSegments,
  activeTrail,
  trailStatus,
  gisLayers,
  updateGISLayer,
  mapVersion,
  statusFilter,
  userTool,
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
        {/* Àrees cinegètiques */}
        {gisLayers.huntingAreas && huntingAreasData && (
          <GeoJSON
  data={huntingAreasData}
  style={(feature) => ({
    color:
      feature?.properties?.stroke || "#6e6e6e",
    weight: 1.5,
    fillColor:
      feature?.properties?.fill || "#f4a261",
    fillOpacity: 0.25,
  })}
  onEachFeature={(feature, layer) => {
  const properties = feature.properties || {};

  const description =
    properties.description?.value || "";

  const data =
    parseHuntingAreaDescription(description);

  const area = data.AREA_HA
    ? Number(
        data.AREA_HA.replace(",", ".")
      ).toFixed(2)
    : null;

  layer.bindPopup(`
    <div style="min-width: 240px">
      <strong style="font-size: 15px;">
        🏹 ${data.FIGURA_CIN || "Àrea de caça"}
      </strong>

      <br><br>

      <strong>${data.NOM || "Sense nom"}</strong>

      <br><br>

      <strong>Matrícula:</strong>
      ${data.MATRICULA || properties.name || "Sense dades"}

      ${
        data.TM
          ? `<br><strong>Municipi:</strong> ${data.TM}`
          : ""
      }

      ${
        data.COM
          ? `<br><strong>Comarca:</strong> ${data.COM}`
          : ""
      }

      ${
        area
          ? `<br><strong>Superfície:</strong> ${area} ha`
          : ""
      }
    </div>
  `);
}}
/>
      )}

        {/* Xarxes */}
        {geojsonLayers.map((layer, index) => (

          <GeoJsonLayer
            key={`${index}-${statusFilter}-${userTool}-${JSON.stringify(trailStatus)}`}
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