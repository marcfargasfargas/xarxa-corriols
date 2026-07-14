/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
Field Edition v0.5 RC1

Fitxer: BaseMapSelector.jsx

Responsabilitats:
- Botó flotant del selector de mapes
- Menú desplegable
- Canviar el mapa base

----------------------------------------------------
*/

import { useState } from "react";

export default function BaseMapSelector({
  gisLayers,
  updateGISLayer,
}) {

  const [open, setOpen] = useState(false);

  function selectMap(baseMap) {

    updateGISLayer("baseMap", baseMap);

    setOpen(false);

  }

  return (

    <div
      style={{
        position: "absolute",
        top: "12px",
        right: "12px",
        zIndex: 1000,
      }}
    >

      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "white",
          border: "1px solid #bdbdbd",
          borderRadius: "8px",
          padding: "10px 14px",
          cursor: "pointer",
          fontWeight: "bold",
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        }}
      >
        🗺 Mapes {open ? "▲" : "▼"}
      </button>

      {open && (

        <div
          style={{
            marginTop: "8px",
            background: "white",
            border: "1px solid #cccccc",
            borderRadius: "8px",
            padding: "12px",
            width: "190px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          }}
        >

          <div
            style={{
              fontWeight: "bold",
              marginBottom: "10px",
              color: "#1b5e20",
            }}
          >
            MAPA BASE
          </div>

          <label
            style={{
              display: "block",
              marginBottom: "8px",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              checked={gisLayers.baseMap === "osm"}
              onChange={() => selectMap("osm")}
            />{" "}
            OpenStreetMap
          </label>

          <label
            style={{
              display: "block",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              checked={gisLayers.baseMap === "esri"}
              onChange={() => selectMap("esri")}
            />{" "}
            Satèl·lit ESRI
          </label>

        </div>

      )}

    </div>

  );

}