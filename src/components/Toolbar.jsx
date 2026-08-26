/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
Field Edition 0.5

Fitxer: Toolbar.jsx

Responsabilitats:
- Obrir fitxers GPX/KML/KMZ
- Carregar la Xarxa Municipal
- Enviar les dades a App.jsx

----------------------------------------------------
*/

import { useRef } from "react";

import { loadGPX } from "../services/gpxLoader";
import { loadKML } from "../services/kmlLoader";
import {
  loadKMZ,
} from "../services/kmzLoader";

export default function Toolbar({
  onLoaded,
  onMunicipalLoaded,
  appMode,
  userTool,
  setUserTool,
}) {
  const fileInputRef = useRef(null);

  // ==============================
  // Obrir un fitxer local
  // ==============================

  async function handleFile(event) {
    const file = event.target.files[0];

    if (!file) return;

    try {
      const extension = file.name
        .split(".")
        .pop()
        .toLowerCase();

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

  // ==============================
  // Carregar la Xarxa Municipal
  // ==============================

  async function loadMunicipalNetwork() {
  try {

    const response = await fetch(
      "/data/xarxa_v0.7/network-gpx.geojson"
    );

    if (!response.ok) {
      throw new Error(
        `Error carregant Xarxa Municipal: ${response.status}`
      );
    }

    const geojson =
      await response.json();

    console.log(
      "Xarxa Municipal GPX carregada:",
      geojson
    );

    console.log(
      "Segments Xarxa Municipal:",
      geojson.features?.length ?? 0
    );

    onMunicipalLoaded?.(
      geojson
    );

  } catch (err) {

    console.error(err);

    alert(
      "No s'ha pogut carregar la Xarxa Municipal."
    );

  }
}


  // ==============================
  // Interfície
  // ==============================

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

      <button
        onClick={loadMunicipalNetwork}
        style={{
          padding: "10px 18px",
          background: "#2e7d32",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "15px",
        }}
      >
        🌿 Xarxa Municipal
      </button>
      {appMode === "user" && (
  <>
    <button
  onClick={() => setUserTool("predefined")}
  style={{
    padding: "10px 18px",
    background:
      userTool === "predefined"
        ? "#1b5e20"
        : "#2e7d32",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "15px",
  }}
>
  🛣️ Voltes predefinides
</button>

    <button
      onClick={() => setUserTool("route")}
      style={{
        padding: "10px 18px",
        background: userTool === "route" ? "#1b5e20" : "#2e7d32",
        color: "white",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "15px",
      }}
    >
      🧭 Crear recorregut
    </button>
  </>
)}

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