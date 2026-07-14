/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
Field Edition 0.5

Fitxer: BaseLayers.jsx

Responsabilitats:
- Mostrar el mapa base seleccionat
- Utilitzar la configuració de mapProviders
- Delegar els mapes especials (ICGC)

----------------------------------------------------
*/

import { TileLayer } from "react-leaflet";

import { MAP_PROVIDERS } from "../config/mapProviders";

import ICGCLayers from "./ICGCLayers";

export default function BaseLayers({ gisLayers }) {

  const provider = MAP_PROVIDERS[gisLayers.baseMap];

  // Els mapes de l'ICGC es gestionen
  // en un component específic

  if (
    gisLayers.baseMap === "ortofoto" ||
    gisLayers.baseMap === "topografic"
  ) {
    return (
      <ICGCLayers
        baseMap={gisLayers.baseMap}
      />
    );
  }

  if (!provider) return null;

  return (
    <TileLayer
      url={provider.url}
      attribution={provider.attribution}
    />
  );

}