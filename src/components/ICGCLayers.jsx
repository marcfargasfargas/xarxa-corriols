/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
Field Edition 0.5

Fitxer: ICGCLayers.jsx

Responsabilitats:
- Gestionar tots els mapes oficials de l'ICGC
- Mostrar l'Ortofoto
- Mostrar el Topogràfic
- Centralitzar els serveis de l'ICGC

----------------------------------------------------
*/

import { TileLayer } from "react-leaflet";

export default function ICGCLayers({ baseMap }) {

  switch (baseMap) {

    case "ortofoto":

      // Sprint 3.1
      // URL provisional fins validar el servei oficial

      return (
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="ICGC (provisional)"
        />
      );

    case "topografic":

      // Sprint 3.2

      return (
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="ICGC (provisional)"
        />
      );

    default:

      return null;

  }

}