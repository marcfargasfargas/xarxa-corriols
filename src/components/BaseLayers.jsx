/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
Field Edition 0.4

Fitxer: BaseLayers.jsx

Responsabilitats:
- Gestionar els mapes base
- Permetre canviar entre les diferents capes
- Mantenir el mapa actiu

Mapes disponibles:
- OpenStreetMap
- Esri World Imagery
- Cadastre

----------------------------------------------------
*/

import {
  LayersControl,
  TileLayer,
  WMSTileLayer,
} from "react-leaflet";

const { BaseLayer } = LayersControl;

export default function BaseLayers() {
  return (
    <LayersControl position="topright">

      {/* OpenStreetMap */}

      <BaseLayer checked name="🗺 OpenStreetMap">
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors"
        />
      </BaseLayer>

      {/* Satèl·lit */}

      <BaseLayer name="🛰 Satèl·lit (Esri)">
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles © Esri"
        />
      </BaseLayer>

      {/* Cadastre */}

      <BaseLayer name="📐 Cadastre">
        <WMSTileLayer
          url="https://ovc.catastro.meh.es/Cartografia/WMS/ServidorWMS.aspx"
          layers="Catastro"
          format="image/png"
          transparent={false}
          attribution="Dirección General del Catastro"
        />
      </BaseLayer>

    </LayersControl>
  );
}