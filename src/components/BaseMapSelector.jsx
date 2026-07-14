/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
Field Edition v0.5 RC1

Fitxer: BaseMapSelector.jsx

----------------------------------------------------
*/

import { useState } from "react";

export default function BaseMapSelector({
  gisLayers,
  updateGISLayer,
}) {
  const [open, setOpen] = useState(false);

  function select(baseMap) {
    updateGISLayer("baseMap", baseMap);
    setOpen(false);
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 2000,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #999",
          background: "#ffffff",
          color: "#222",
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,.25)",
        }}
      >
        🗺 Mapes
      </button>

      {open && (
        <div
          style={{
            marginTop: 8,
            width: 220,
            background: "#ffffff",
            color: "#222",
            border: "1px solid #cccccc",
            borderRadius: 8,
            padding: 12,
            boxShadow: "0 3px 10px rgba(0,0,0,.25)",
          }}
        >
          <div
            style={{
              fontWeight: "bold",
              marginBottom: 10,
              color: "#1b5e20",
            }}
          >
            MAPA BASE
          </div>

          <button
            style={{
              width: "100%",
              marginBottom: 8,
              padding: 8,
              textAlign: "left",
              background:
                gisLayers.baseMap === "osm"
                  ? "#dcedc8"
                  : "#ffffff",
              border: "1px solid #cccccc",
              borderRadius: 6,
              cursor: "pointer",
              color: "#222",
            }}
            onClick={() => select("osm")}
          >
            🗺 OpenStreetMap
          </button>

          <button
            style={{
              width: "100%",
              marginBottom: 8,
              padding: 8,
              textAlign: "left",
              background:
                gisLayers.baseMap === "esri"
                  ? "#dcedc8"
                  : "#ffffff",
              border: "1px solid #cccccc",
              borderRadius: 6,
              cursor: "pointer",
              color: "#222",
            }}
            onClick={() => select("esri")}
          >
            🛰 Satèl·lit ESRI
          </button>

          <button
            style={{
              width: "100%",
              padding: 8,
              textAlign: "left",
              background:
                gisLayers.baseMap === "cadastre"
                  ? "#dcedc8"
                  : "#ffffff",
              border: "1px solid #cccccc",
              borderRadius: 6,
              cursor: "pointer",
              color: "#222",
            }}
            onClick={() => select("cadastre")}
          >
            📐 Cadastre
          </button>
        </div>
      )}
    </div>
  );
}