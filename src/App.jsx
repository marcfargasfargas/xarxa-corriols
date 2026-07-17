/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
Field Edition 0.5

Fitxer: App.jsx

Responsabilitats:
- Gestionar les xarxes carregades
- Gestionar els corriols seleccionats
- Gestionar el corriol actiu
- Gestionar l'estat dels corriols
- Gestionar la configuració del GIS
- Coordinar els components principals

----------------------------------------------------
*/

import { useEffect, useState } from "react";

import "./App.css";

import Toolbar from "./components/Toolbar";
import MapView from "./components/MapView";
import TrailStatusPanel from "./components/TrailStatusPanel";
import GISLayerPanel from "./components/GISLayerPanel";

import { parseSegment } from "./utils/segmentParser";
import { exportSelectedSegmentsToGPX } from "./utils/gpxExporter";

function App() {

  // ==============================
  // Estat global
  // ==============================

  const [geojsonLayers, setGeojsonLayers] = useState([]);
  const [selectedSegments, setSelectedSegments] = useState([]);
  const [activeTrail, setActiveTrail] = useState(null);
  // ==============================
// Mode de l'aplicació
// ==============================

const [appMode, setAppMode] = useState("user");
const [userTool, setUserTool] = useState("status");
const [statusFilter, setStatusFilter] = useState("all");
function changeStatusFilter(filter) {
  setStatusFilter(filter);
  setSelectedSegments([]);
  setActiveTrail(null);
}
function changeUserTool(tool) {
  setUserTool(tool);
  setSelectedSegments([]);
  setActiveTrail(null);

  if (tool === "route") {
    setStatusFilter("all");
  }
}
function clearSelectedSegments() {
  setSelectedSegments([]);
  setActiveTrail(null);
}
  const [trailStatus, setTrailStatus] = useState(() => {
    const saved = localStorage.getItem("trailStatus");
    return saved ? JSON.parse(saved) : {};
  });

  // ==============================
  // Guardar automàticament els estats
  // ==============================

  useEffect(() => {
    localStorage.setItem(
      "trailStatus",
      JSON.stringify(trailStatus)
    );
  }, [trailStatus]);

// ==============================
// Versió del mapa
// ==============================

 const [mapVersion, setMapVersion] = useState(0);

  // ==============================
  // Configuració del GIS
  // ==============================

  const [gisLayers, setGisLayers] = useState({

    baseMap: "osm",

    trails: true,

    trailStatus: true,

    cadastre: false,

    ortofoto: false,

    topografic: false,

  });

  // ==============================
  // Carrega de xarxes
  // ==============================

  function handleLoaded(newGeojson) {

  setGeojsonLayers((previous) => [
    ...previous,
    newGeojson,
  ]);
  setMapVersion((previous) => previous + 1);

}

  function handleMunicipalLoaded(newGeojson) {
  console.log("Xarxes abans:", geojsonLayers.length);
  setGeojsonLayers([newGeojson]);
  setMapVersion((previous) => previous + 1);

  setSelectedSegments([]);

  setActiveTrail(null);
  console.log("Carregant Xarxa Municipal:", newGeojson.features.length);

}

  function updateTrailStatus(trailName, status) {

  setTrailStatus((previous) => ({

    ...previous,

    [trailName]: {
      status: status,
      updatedAt: new Date().toISOString(),
    },

  }));

}

  // ==============================
// Esborrar tots els estats
// ==============================

function clearTrailStatus() {

  const confirmDelete = window.confirm(
    "Vols esborrar tots els estats dels corriols?"
  );

  if (!confirmDelete) return;

  localStorage.removeItem("trailStatus");

  setTrailStatus({});

  setActiveTrail(null);

}
  // ==============================
  // Configuració del GIS
  // ==============================

  function updateGISLayer(name, value) {

    setGisLayers((previous) => ({

      ...previous,

      [name]: value,

    }));

  }

  // ==============================
// Selecció d'un corriol
// ==============================

function handleSegmentClick(feature) {
  const segment = parseSegment(feature);

  setActiveTrail(segment);

  

  if (userTool === "status") {
    return;
  }

  setSelectedSegments((previous) => {
    const exists = previous.some(
      (item) => item.name === segment.name
    );

    if (exists) {
      return previous.filter(
        (item) => item.name !== segment.name
      );
    }

    return [...previous, segment];
  });
}

  // ==============================
  // Estadístiques
  // ==============================

  const totalDistance = selectedSegments.reduce(
    (sum, segment) => sum + segment.distance,
    0
  );

  const totalAscent = selectedSegments.reduce(
    (sum, segment) => sum + segment.ascent,
    0
  );

  const totalDescent = selectedSegments.reduce(
    (sum, segment) => sum + segment.descent,
    0
  );

  // ==============================
  // Interfície
  // ==============================
const statusCounts = {
  all: geojsonLayers.reduce(
    (sum, layer) => sum + layer.features.length,
    0
  ),
  unreviewed: 0,
  clean: 0,
  pending: 0,
  closed: 0,
  maintenance: 0,
};
geojsonLayers.forEach((layer) => {
  layer.features.forEach((feature) => {
    const name = feature.properties?.name;
    const trailData = trailStatus[name];

    const status =
      typeof trailData === "string"
        ? trailData
        : trailData?.status ?? "unreviewed";

    statusCounts[status]++;
  });
});
  return (

    <div className="app">

      <header className="header">
        <h1>🌿 Xarxa de Corriols d'Alàs i Cerc</h1>
      </header>
      <button
  onClick={() =>
    setAppMode((mode) =>
      mode === "admin" ? "user" : "admin"
    )
  }
  style={{
    background: "#ffcc80",
    padding: "8px 14px",
    border: "1px solid #e0a050",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
  }}
>
  Mode: {appMode === "admin" ? "Administrador" : "Usuari"}
</button>

  

{appMode === "user" && userTool === "status" && (
  <div>
    {[
      ["all", `🌈 Tots (${statusCounts.all})`],
      ["unreviewed", `⚪ Sense revisar (${statusCounts.unreviewed})`],
      ["clean", `🟢 Nets (${statusCounts.clean})`],
      ["pending", `🟡 Pendents (${statusCounts.pending})`],
      ["maintenance", `🔵 En manteniment (${statusCounts.maintenance})`],
      ["closed", `🔴 Tancats (${statusCounts.closed})`],
    ].map(([filter, label]) => (
      <button
        key={filter}
        onClick={() => changeStatusFilter(filter)}
        style={{
          padding: "10px 14px",
          fontWeight: statusFilter === filter ? "bold" : "normal",
          border:
            statusFilter === filter
              ? "3px solid #1b5e20"
              : "1px solid #cccccc",
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    ))}
  </div>
)}
      <Toolbar
  onLoaded={handleLoaded}
  onMunicipalLoaded={handleMunicipalLoaded}
  appMode={appMode}
  userTool={userTool}
  setUserTool={changeUserTool}
/>

      <main className="layout">

        <section className="map">

          <MapView
  geojsonLayers={geojsonLayers}
  onSegmentClick={handleSegmentClick}
  selectedSegments={selectedSegments}
  activeTrail={activeTrail}
  trailStatus={trailStatus}
  gisLayers={gisLayers}
  updateGISLayer={updateGISLayer}
  mapVersion={mapVersion}
  statusFilter={statusFilter}
  userTool={userTool}
/>

        </section>

        <aside className="sidebar">

          <h2
            style={{
            margin: "0 0 12px 0",
            fontSize: "20px",
            color: "#1b5e20",
          }}
         >
            📍 Recorregut
         </h2>

          <div
  className="stats"
  style={{
    marginBottom: "20px",
    lineHeight: "1.4",
  }}
>

            <p>
              <strong>📏 Distància</strong><br />
              {totalDistance.toFixed(1)} km
            </p>

            <p>
              <strong>⬆️ Desnivell positiu</strong><br />
              {totalAscent.toFixed(0)} m
            </p>

            <p>
              <strong>⬇️ Desnivell negatiu</strong><br />
              {totalDescent.toFixed(0)} m
            </p>

          </div>

          

          <TrailStatusPanel
            activeTrail={activeTrail}
            trailStatus={trailStatus}
            updateTrailStatus={updateTrailStatus}
            clearTrailStatus={clearTrailStatus}
            appMode={appMode}
         />

          

          

          <h3
            style={{
            marginTop: "18px",
            marginBottom: "8px",
            color: "#1b5e20",
           }}
          >
             🌿 Xarxa carregada
          </h3>

          {geojsonLayers.length === 0 ? (

            <p>Cap xarxa carregada.</p>

          ) : (

            <>
              <p>
                <strong>{geojsonLayers.length}</strong>{" "}
                fitxers carregats
              </p>

              <p>
                <strong>
                  {geojsonLayers.reduce(
                     (sum, layer) => sum + layer.features.length,
                   0
                  )}
                </strong>{" "}
                segments totals
              </p>

            </>

          )}

          {appMode === "user" && userTool === "route" && selectedSegments.length > 0 && (
  <button
    onClick={clearSelectedSegments}
    style={{
      width: "100%",
      padding: "10px",
      marginTop: "15px",
      marginBottom: "10px",
      background: "#c62828",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: "bold",
    }}
  >
    🗑 Esborrar selecció
  </button>
)}
{appMode === "user" && userTool === "route" && selectedSegments.length > 0 && (
  <button
    onClick={() => exportSelectedSegmentsToGPX(selectedSegments)}
    style={{
      width: "100%",
      padding: "10px",
      marginBottom: "10px",
      background: "#2e7d32",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: "bold",
    }}
  >
    ⬇️ Descarregar GPX
  </button>
)}

          <h3
            style={{
            marginTop: "18px",
            marginBottom: "8px",
            color: "#1b5e20",
           }}
          >
            🧭 Trams seleccionats (7) ({selectedSegments.length})
          </h3>

          {selectedSegments.length === 0 ? (

            <p>No n'hi ha cap.</p>

          ) : (

            <ul style={{ paddingLeft: "18px", lineHeight: "1.6" }}>

              {selectedSegments.map((segment) => (

                <li key={segment.name}>

                  <strong>🌿 {segment.name}</strong>

                  <br />

                  <small>
                    📏 {segment.distance.toFixed(1)} km
                  </small>

                </li>

              ))}

            </ul>

          )}

        </aside>

      </main>

    </div>

  );

}

export default App;