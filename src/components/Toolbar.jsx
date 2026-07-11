/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
Field Edition 0.4

Fitxer: Toolbar.jsx

Responsabilitats:
- Seleccionar fitxers
- Detectar el format
- Convertir-los a GeoJSON
- Enviar-los a App.jsx

Formats suportats:
- GPX
- KML
- KMZ

----------------------------------------------------
*/

import { useRef } from "react";

import { loadGPX } from "../services/gpxLoader";
import { loadKML } from "../services/kmlLoader";
import { loadKMZ } from "../services/kmzLoader";

export default function Toolbar({ onLoaded }) {
  const fileInputRef = useRef(null);

  async function handleFile(event) {
    const file = event.target.files[0];

    if (!file) return;

    try {
      const extension = file.name.split(".").pop().toLowerCase();

      let geojson = null;

      switch (extension) {
        case "gpx":
          geojson = await loadGPX(file);
          break;

        case "kml":
          geojson = await loadKML(file);
          break;

        case "kmz":
          geojson = await loadKMZ(file);
          break;

        default:
          alert("Format de fitxer no suportat.");
          return;
      }

      onLoaded(geojson);

      // Permet tornar a seleccionar el mateix fitxer
      event.target.value = "";

    } catch (err) {
      console.error(err);
      alert("No s'ha pogut llegir el fitxer.");
    }
  }

  return (
    <div
      style={{
        padding: "10px",
        background: "#ffffff",
        borderBottom: "1px solid #ccc",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <button
        onClick={() => fileInputRef.current?.click()}
        style={{
          padding: "10px 18px",
          background: "#1b5e20",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "15px",
        }}
      >
        📂 Obrir fitxer
      </button>

      <span style={{ color: "#666", fontSize: "14px" }}>
        GPX · KML · KMZ
      </span>

      <input
        ref={fileInputRef}
        type="file"
        accept=".gpx,.kml,.kmz,.geojson,.json"
        onChange={handleFile}
        style={{ display: "none" }}
      />
    </div>
  );
}