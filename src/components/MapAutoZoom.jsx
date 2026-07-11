/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
Field Edition 0.4

Fitxer: MapAutoZoom.jsx

Responsabilitats:
- Calcular l'extensió global de totes les xarxes
- Ajustar automàticament el zoom
- Garantir que totes les xarxes carregades siguin visibles

----------------------------------------------------
*/

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

export default function MapAutoZoom({ geojsonLayers }) {
  const map = useMap();

  useEffect(() => {
    if (!geojsonLayers.length) return;

    const globalBounds = L.latLngBounds([]);

    geojsonLayers.forEach((geojson) => {
      const layer = L.geoJSON(geojson);
      const bounds = layer.getBounds();

      if (bounds.isValid()) {
        globalBounds.extend(bounds);
      }
    });

    if (globalBounds.isValid()) {
      map.fitBounds(globalBounds, {
        padding: [30, 30],
      });
    }
  }, [geojsonLayers, map]);

  return null;
}