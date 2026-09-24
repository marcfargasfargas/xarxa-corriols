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
import { loadKMZ } from "../services/kmzLoader";

import { supabase } from "../lib/supabaseClient";

export default function Toolbar({
  onLoaded,
  onMunicipalLoaded,
  appMode,
  userTool,
  setUserTool,
  onGPXImportPreview,
}) {
  const fileInputRef = useRef(null);
  const gpxImportInputRef = useRef(null);

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

      event.target.value = "";
    } catch (err) {
      console.error(err);
      alert("No s'ha pogut llegir el fitxer.");
    }
  }

  async function handleGPXImportFile(event) {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".gpx")) {
      alert("Selecciona un fitxer GPX.");
      event.target.value = "";
      return;
    }

    try {
      await onGPXImportPreview?.(file);
    } finally {
      event.target.value = "";
    }
  }

  async function loadMunicipalNetwork() {
    try {
      console.log("Carregant Xarxa Municipal des de Supabase...");

      const { data, error } = await supabase
        .from("network_state")
        .select("network_gpx")
        .eq("id", "current")
        .single();

      if (error) {
        throw error;
      }

      if (
        !data?.network_gpx ||
        !Array.isArray(data.network_gpx.features)
      ) {
        throw new Error(
          "La xarxa municipal actual no conté un GeoJSON vàlid."
        );
      }

      const geojson = data.network_gpx;

      console.log(
        "Xarxa Municipal carregada des de Supabase:",
        geojson
      );

      console.log(
        "Segments Xarxa Municipal:",
        geojson.features.length
      );

      onMunicipalLoaded?.(geojson);
    } catch (err) {
      console.error(
        "Error carregant Xarxa Municipal des de Supabase:",
        err
      );

      alert(
        "No s'ha pogut carregar la Xarxa Municipal des de Supabase."
      );
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
        gap: "6px",
        flexWrap: "wrap",
      }}
    >
      <button
        onClick={() => fileInputRef.current?.click()}
        style={{
          padding: "8px 10px",
          background: "#1b5e20",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        📂 Carregar GPX extern
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
              background:
                userTool === "route"
                  ? "#1b5e20"
                  : "#2e7d32",
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

      {appMode === "admin" && (
        <>
          <button
            onClick={() =>
              gpxImportInputRef.current?.click()
            }
            style={{
              padding: "10px 18px",
              background: "#ef6c00",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "bold",
            }}
          >
            ➕ Afegir segment GPX
          </button>

          <input
            ref={gpxImportInputRef}
            type="file"
            accept=".gpx"
            onChange={handleGPXImportFile}
            style={{ display: "none" }}
          />
        </>
      )}

      <span
        style={{
          color: "#666",
          fontSize: "14px",
        }}
      >
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