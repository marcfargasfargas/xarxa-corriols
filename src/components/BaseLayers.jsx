/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
Field Edition v0.5 RC1

Fitxer: BaseLayers.jsx

Responsabilitats:
- Gestionar tots els mapes base
- TileLayer (OSM / ESRI)
- WMSTileLayer (Cadastre)
- Preparat per futures capes

----------------------------------------------------
*/

import {
  TileLayer,
  WMSTileLayer,
} from "react-leaflet";

import { MAP_PROVIDERS } from "../config/mapProviders";

export default function BaseLayers({ gisLayers }) {

  const provider = MAP_PROVIDERS[gisLayers.baseMap];

  if (!provider) return null;

  // ==========================
  // Cadastre (WMS)
  // ==========================

  if (provider.type === "wms") {

    return (
      <WMSTileLayer
        url={provider.url}
        layers={provider.layers}
        format={provider.format}
        transparent={provider.transparent}
        attribution={provider.attribution}
      />
    );

  }

  // ==========================
  // OpenStreetMap / ESRI
  // ==========================

  return (
    <TileLayer
      url={provider.url}
      attribution={provider.attribution}
    />
  );

}