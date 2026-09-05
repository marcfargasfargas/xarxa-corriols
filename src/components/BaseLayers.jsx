/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
Field Edition 0.6

Fitxer: BaseLayers.jsx

Responsabilitats:
- Mostrar el mapa base actiu
- Mostrar les capes superposades actives
- Gestionar TileLayer i WMSTileLayer

----------------------------------------------------
*/

import {
  TileLayer,
  WMSTileLayer,
} from "react-leaflet";

import {
  MAP_PROVIDERS,
  MAP_OVERLAYS,
} from "../config/mapProviders";

export default function BaseLayers({ gisLayers }) {

  const provider =
    MAP_PROVIDERS[gisLayers.baseMap];

  const cadastre =
    MAP_OVERLAYS.cadastre;

  return (
    <>

      {/* ==========================
          MAPA BASE
      ========================== */}

      {provider?.type === "tile" && (
        <TileLayer
          url={provider.url}
          attribution={provider.attribution}
        />
      )}
      
      {provider?.type === "wms" && (
  <WMSTileLayer
    key={gisLayers.baseMap}
    url={provider.url}
    layers={provider.layers}
    format={provider.format}
    transparent={provider.transparent}
    attribution={provider.attribution}
  />
)}

      {/* ==========================
          CAPES SUPERPOSADES
      ========================== */}

      {gisLayers.cadastre && (
        <WMSTileLayer
          url={cadastre.url}
          layers={cadastre.layers}
          format={cadastre.format}
          transparent={cadastre.transparent}
          attribution={cadastre.attribution}
        />
      )}

    </>
  );

}