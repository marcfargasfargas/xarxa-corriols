/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
Field Edition 0.6

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

import { gpx } from "@mapbox/togeojson";

import "./App.css";

import Toolbar from "./components/Toolbar";
import MapView from "./components/MapView";
import TrailStatusPanel from "./components/TrailStatusPanel";
import GISLayerPanel from "./components/GISLayerPanel";

import { parseSegment } from "./utils/segmentParser";
import { exportSelectedSegmentsToGPX } from "./utils/gpxExporter";
import routes from "./data/routes";



function App() {

  // ==============================
  // Estat global
  // ==============================

  const [geojsonLayers, setGeojsonLayers] = useState([]);
  const [huntingAreasData, setHuntingAreasData] = useState(null);
  const [selectedSegments, setSelectedSegments] = useState([]);
  // ============================================================
// ROUTE BUILDER
// ============================================================

const [
  selectedRoute,
  setSelectedRoute,
] = useState([]);

const [routeStatus, setRouteStatus] = useState("building");

// ============================================================
// XARXA GPX — ROUTE BUILDER
// ============================================================

const [
  routeBuilderGeoJSON,
  setRouteBuilderGeoJSON,
] = useState(null);

// ============================================================
// RUTES PREDEFINIDES
// ============================================================

const [
  predefinedRouteGeoJSON,
  setPredefinedRouteGeoJSON,
] = useState(null);
const [
  predefinedRouteStats,
  setPredefinedRouteStats,
] = useState(null);

// ============================================================
// ROUTE BUILDER — CONTROLS
// ============================================================

function handleUndoLastRouteEdge() {

  setSelectedRoute(
    (previous) => {

      if (!previous.length) {
        return previous;
      }

      const removedEdge =
        previous[
          previous.length - 1
        ];

      console.log(
        "↩️ ÚLTIM TRAM ELIMINAT:",
        removedEdge.edgeId
      );

      return previous.slice(
        0,
        -1
      );

    }
  );

}

// ============================================================
// TORNAR A COMENÇAR
// ============================================================

function handleRestartRoute() {

  const confirmRestart =
    window.confirm(
      "Vols descartar aquesta ruta i començar-ne una de nova?"
    );

  if (!confirmRestart) {
    return;
  }

  console.log(
    "↩️ TORNANT A COMENÇAR — ruta descartada"
  );

  setSelectedRoute([]);

  setRouteStatus("building");

}

// ============================================================
// CONSTRUIR COORDENADES DEL TRACK
// ============================================================

function buildRouteCoordinates() {

  if (
    !selectedRoute?.length ||
    !routeBuilderGeoJSON?.features?.length
  ) {
    return [];
  }


  const coordinates = [];


  selectedRoute.forEach(
    (edge) => {

      const feature =
        routeBuilderGeoJSON.features.find(
          (item) =>
            item.properties?.edgeId ===
            edge.edgeId
        );


      if (!feature) {

        console.warn(
          "⚠️ Geometria no trobada per al GPX:",
          edge.edgeId
        );

        return;
      }


      const edgeCoordinates =
        feature.geometry?.coordinates;


      if (
        !edgeCoordinates?.length
      ) {
        return;
      }


      edgeCoordinates.forEach(
  (point) => {

    const lastPoint =
      coordinates[
        coordinates.length - 1
      ];

    if (
      !lastPoint ||
      lastPoint[0] !== point[0] ||
      lastPoint[1] !== point[1]
    ) {

      coordinates.push(
        point
      );

    }

  }
);

    }
  );

   

  return coordinates;

}

// ============================================================
// CONSTRUIR CONTINGUT GPX
// ============================================================

function buildGPXContent(
  coordinates,
  distance,
  ascent,
  descent
) {

  if (!coordinates?.length) {
    return "";
  }


  const trackPoints =
    coordinates
      .map(
        ([longitude, latitude]) =>
          `    <trkpt lat="${latitude}" lon="${longitude}"></trkpt>`
      )
      .join("\n");


  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx
  version="1.1"
  creator="Xarxa de Corriols d'Alàs i Cerc"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/1/1/gpx.xsd">

  <trk>
    <name>Track Xarxa de Corriols</name>
        <desc>
      ${distance.toFixed(2)} km |
      +${ascent.toFixed(0)} m |
      -${descent.toFixed(0)} m
    </desc>
    <trkseg>
${trackPoints}
    </trkseg>

  </trk>

</gpx>`;
}


// ============================================================
// INVERTIR RUTA COMPLETA
// ============================================================

function handleInvertRoute() {

  setSelectedRoute(
    (previous) => {

      if (
        !previous.length ||
        !routeBuilderGeoJSON
      ) {
        return previous;
      }


      console.log(
        "🔄 INVERTINT RUTA:",
        previous
      );


      // ======================================================
      // 1. INVERTIR L'ORDRE DELS TRAMS
      // ======================================================

      const reversedRoute =
        [
          ...previous
        ].reverse();


      // ======================================================
      // 2. CANVIAR FWD ↔ REV
      // ======================================================

      const invertedRoute =
        reversedRoute.map(
          (edge) => {

            let oppositeEdgeId;


            if (
              edge.edgeId.endsWith(
                "_REV"
              )
            ) {

              oppositeEdgeId =
                edge.edgeId.replace(
                  /_REV$/,
                  ""
                );

            } else {

              oppositeEdgeId =
                `${edge.edgeId}_REV`;

            }


            // ==================================================
            // BUSCAR L'EDGE CONTRÀRIA A LA XARXA
            // ==================================================

            const oppositeFeature =
              routeBuilderGeoJSON.features.find(
                (feature) =>
                  feature.properties?.edgeId ===
                  oppositeEdgeId
              );


            if (
              !oppositeFeature
            ) {

              console.warn(
                "⚠️ No s'ha trobat la direcció contrària:",
                {
                  edge:
                    edge.edgeId,

                  opposite:
                    oppositeEdgeId,
                }
              );

              return null;
            }


            return {
              ...oppositeFeature.properties,
            };

          }
        );


      // ======================================================
      // 3. COMPROVAR QUE TOTES LES EDGES
      //    TENEN LA SEVA CONTRÀRIA
      // ======================================================

      if (
        invertedRoute.some(
          (edge) =>
            !edge
        )
      ) {

        console.warn(
          "⚠️ No s'ha pogut invertir tota la ruta."
        );

        return previous;
      }


      console.log(
        "✅ RUTA INVERTIDA:",
        invertedRoute
      );


      return invertedRoute;

    }
  );

}

  const [activeTrail, setActiveTrail] = useState(null);

  // ==============================
// Mode de l'aplicació
// ==============================

const [appMode, setAppMode] = useState("user");
const [userTool, setUserTool] = useState("status");
const [statusFilter, setStatusFilter] = useState("all");
const [predefinedRouteDistance, setPredefinedRouteDistance] = useState(null);
const [selectedPredefinedRoute, setSelectedPredefinedRoute] = useState(null);
const [expandedRouteDistance, setExpandedRouteDistance] = useState(null);
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

function calculatePredefinedRouteStats(geojson) {
  let ascent = 0;
  let descent = 0;

  function processCoordinates(coordinates) {
    for (let i = 1; i < coordinates.length; i++) {
      const previousElevation = coordinates[i - 1][2];
      const currentElevation = coordinates[i][2];

      if (
        typeof previousElevation !== "number" ||
        typeof currentElevation !== "number"
      ) {
        continue;
      }

      const difference =
        currentElevation - previousElevation;

      if (difference > 0) {
        ascent += difference;
      }

      if (difference < 0) {
        descent += Math.abs(difference);
      }
    }
  }

  geojson.features?.forEach((feature) => {
    const geometry = feature.geometry;

    if (!geometry) {
      return;
    }

    if (geometry.type === "LineString") {
      processCoordinates(
        geometry.coordinates
      );
    }

    if (geometry.type === "MultiLineString") {
      geometry.coordinates.forEach(
        (line) => {
          processCoordinates(line);
        }
      );
    }
  });

  return {
    ascent: Math.round(ascent),
    descent: Math.round(descent),
  };
}

async function handlePredefinedRouteSelect(route) {
  try {
    setSelectedPredefinedRoute(route);
    setPredefinedRouteDistance(
      route.distance
    );

    setPredefinedRouteStats(null);

    const response = await fetch(route.gpx);

    if (!response.ok) {
      throw new Error(
        `No s'ha pogut carregar la ruta: ${response.status}`
      );
    }

    const text = await response.text();

    const parser =
      new DOMParser();

    const xml =
      parser.parseFromString(
        text,
        "text/xml"
      );

    const geojson =
      gpx(xml);

      const stats =
  calculatePredefinedRouteStats(
    geojson
  );

    setPredefinedRouteStats(stats);

    setPredefinedRouteGeoJSON(
      geojson
    );

  } catch (error) {

    console.error(
      "Error carregant ruta predefinida:",
      error
    );

    setPredefinedRouteGeoJSON(
      null
    );

    alert(
      "No s'ha pogut carregar la ruta predefinida."
    );
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

    baseMap: "esri",

    trails: true,

    trailStatus: true,

    cadastre: false,

    huntingAreas: false,

    ortofoto: false,

    topografic: false,

  });
  useEffect(() => {
  async function loadHuntingAreas() {
    try {
      const response = await fetch(
  "/data/areesCinegetiquesAltUrgell.geojson"
);

if (!response.ok) {
  throw new Error(
    `No s'ha pogut carregar les àrees cinegètiques: ${response.status}`
  );
}

const geojson = await response.json();

      setHuntingAreasData(geojson);

      

      console.log(
        "Àrees cinegètiques carregades:",
        geojson.features.length
      );
    } catch (error) {
      console.error(
        "Error carregant les àrees cinegètiques:",
        error
      );
    }
  }

  loadHuntingAreas();
}, []);

// ============================================================
// CARREGAR XARXA GPX — ROUTE BUILDER
// ============================================================

useEffect(() => {

  fetch(
    "/data/xarxa_v0.7/network-gpx.geojson"
  )

    .then((response) => {

      if (!response.ok) {

        throw new Error(
          `Error carregant Xarxa GPX: ${response.status}`
        );

      }

      return response.json();

    })

    .then((data) => {

      console.log(
        "✅ Xarxa GPX carregada:",
        data
      );

      console.log(
        "🛤 Features Xarxa GPX:",
        data.features?.length ?? 0
      );

      setRouteBuilderGeoJSON(
        data
      
);

    })

    .catch((error) => {

      console.error(
        "❌ Error carregant Xarxa GPX:",
        error
      );

    });

}, []);

  // ==============================
  // Carrega de xarxes
  // ==============================

  function handleLoaded(newGeojson) {

  // Netejar el context anterior
  setGeojsonLayers([newGeojson]);
  setSelectedSegments([]);
  setActiveTrail(null);

  // Sortir del mode Route Builder
  setUserTool("status");
  setSelectedRoute([]);
  setRouteStatus("building");

  setMapVersion((previous) => previous + 1);

}

  function handleMunicipalLoaded(newGeojson) {

  console.log(
    "Carregant Xarxa Municipal:",
    newGeojson.features.length
  );

  // Substituir qualsevol xarxa anterior
  setGeojsonLayers([newGeojson]);

  // Netejar seleccions
  setSelectedSegments([]);
  setActiveTrail(null);

  // Sortir del Route Builder
  setUserTool("status");
  setSelectedRoute([]);
  setRouteStatus("building");

  setMapVersion((previous) => previous + 1);

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
  console.log("🔎 FEATURE CLICAT:", feature);
  console.log("🔎 PROPERTIES:", feature.properties);
  console.log("🔎 EDGE ID:", feature.properties?.edgeId);

  const segment = parseSegment(feature);

  console.log("🔎 SEGMENT PARSEJAT:", segment);

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

  // ============================================================
// ESTADÍSTIQUES DEL ROUTE BUILDER
// ============================================================

const routeDistance =
  selectedRoute.reduce(
    (sum, edge) =>
      sum + (edge.distance_km || 0),
    0
  );

const routeAscent =
  selectedRoute.reduce(
    (sum, edge) =>
      sum + (edge.ascent_m || 0),
    0
  );

const routeDescent =
  selectedRoute.reduce(
    (sum, edge) =>
      sum + (edge.descent_m || 0),
    0
  );

  // ==============================
  // Interfície
  // ==============================
const uniqueSegments = new Set();

geojsonLayers.forEach((layer) => {
  layer.features.forEach((feature) => {
    const segment =
      feature.properties?.segment ??
      feature.properties?.name;

    if (segment) {
      uniqueSegments.add(segment);
    }
  });
});

const statusCounts = {
  all: uniqueSegments.size,
  unreviewed: 0,
  clean: 0,
  pending: 0,
  closed: 0,
  maintenance: 0,
};

uniqueSegments.forEach((segment) => {
  const trailData =
    trailStatus[segment];

  const status =
    typeof trailData === "string"
      ? trailData
      : trailData?.status ?? "unreviewed";

  statusCounts[status]++;
});

function changeAppMode() {
  if (appMode === "admin") {
    setAppMode("user");
    return;
  }

  const password = window.prompt(
    "🔐 Introdueix la clau d'administrador:"
  );

  if (password === "alas-admin") {
    setAppMode("admin");
  } else if (password !== null) {
    alert("Clau incorrecta.");
  }
}
  return (

    <div className="app">

      <header className="header">
        <h1>🌿 Xarxa de Corriols d'Alàs i Cerc</h1>
      </header>
      <button
  onClick={changeAppMode}
   
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
  huntingAreasData={huntingAreasData}
  onSegmentClick={handleSegmentClick}
  selectedSegments={selectedSegments}
  activeTrail={activeTrail}
  trailStatus={trailStatus}
  gisLayers={gisLayers}
  updateGISLayer={updateGISLayer}
  mapVersion={mapVersion}
  statusFilter={statusFilter}
  userTool={userTool}
  selectedRoute={selectedRoute}
  setSelectedRoute={setSelectedRoute}
  routeBuilderGeoJSON={routeBuilderGeoJSON}
  routeStatus={routeStatus}
  predefinedRouteGeoJSON={predefinedRouteGeoJSON}
/>

        </section>

        <aside className="sidebar">

      {userTool === "predefined" && (
  <>
    <h2
      style={{
        margin: "0 0 16px 0",
        fontSize: "20px",
        color: "#1b5e20",
      }}
    >
      🛣️ Voltes predefinides
    </h2>

    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      {["6km", "10km", "20km"].map((distance) => (
        <div key={distance}>

          <button
            onClick={() =>
              setExpandedRouteDistance(
                expandedRouteDistance === distance
                  ? null
                  : distance
              )
            }
            style={{
              width: "100%",
              padding: "10px 12px",
              textAlign: "left",
              border: "1px solid #ccc",
              borderRadius: "6px",
              background:
                expandedRouteDistance === distance
                  ? "#e8f5e9"
                  : "#ffffff",
              color: "#1b5e20",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "bold",
            }}
          >
            {expandedRouteDistance === distance
              ? "▼"
              : "▶"}{" "}
            {distance === "6km"
              ? "6 km"
              : distance === "10km"
              ? "10 km"
              : "20 km"}
          </button>

          {expandedRouteDistance === distance && (
            <div
              style={{
                marginTop: "5px",
                paddingLeft: "10px",
              }}
            >
              {routes[distance].map((route) => (
                <button
                  key={route.id}
                  onClick={() =>
                    handlePredefinedRouteSelect(route)
                    }
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    marginBottom: "4px",
                    textAlign: "left",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                    background:
                      selectedPredefinedRoute?.id === route.id
                        ? "#ffe0b2"
                        : "#ffffff",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  {route.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  </>
)}    

{userTool === "predefined" &&
  selectedPredefinedRoute &&
  predefinedRouteStats && (
    <div
      style={{
        marginTop: "18px",
        padding: "14px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        background: "#ffffff",
      }}
    >
      <h3
        style={{
          margin: "0 0 12px 0",
          color: "#1b5e20",
          fontSize: "17px",
        }}
      >
        Informació de la volta
      </h3>

      <div
        style={{
          fontSize: "18px",
          fontWeight: "bold",
          marginBottom: "8px",
        }}
      >
        🏁 {selectedPredefinedRoute.name}
      </div>

      <div
        style={{
          fontSize: "16px",
          marginBottom: "12px",
        }}
      >
        {selectedPredefinedRoute.distance}
      </div>

      <div
        style={{
          borderTop: "1px solid #ddd",
          paddingTop: "10px",
        }}
      >
        <p
          style={{
            margin: "8px 0",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <strong>⬆️ Desnivell positiu</strong>
          <strong style={{ color: "#2e7d32" }}>
            +{predefinedRouteStats.ascent} m
          </strong>
        </p>

        <p
          style={{
            margin: "8px 0",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <strong>⬇️ Desnivell negatiu</strong>
          <strong style={{ color: "#c62828" }}>
            -{predefinedRouteStats.descent} m
          </strong>
        </p>
      </div>

      <div
        style={{
          marginTop: "14px",
          padding: "10px",
          background: "#e3f2fd",
          borderRadius: "6px",
          fontSize: "13px",
          color: "#1565c0",
        }}
      >
        ℹ️ Les dades poden variar lleugerament
        segons l'origen del track.
      </div>
    </div>
)}

  {userTool === "route" && (
    <>
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
          {routeDistance.toFixed(2)} km
        </p>

        <p>
          <strong>⬆️ Desnivell positiu</strong><br />
          {routeAscent.toFixed(0)} m
        </p>

                <p>
          <strong>⬇️ Desnivell negatiu</strong><br />
          {routeDescent.toFixed(0)} m
        </p>

        <div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "12px",
    marginBottom: "14px",
  }}
>

  <button
    onClick={handleInvertRoute}
    disabled={!selectedRoute?.length}
  >
    🔄 Invertir ruta
  </button>


  {routeStatus === "building" && (
    <>

      <button
        onClick={handleUndoLastRouteEdge}
        disabled={!selectedRoute?.length}
      >
        ↩️ Esborrar últim tram
      </button>


      <button
        onClick={() => {

          if (!selectedRoute?.length) {
            return;
          }

          setRouteStatus("finished");

        }}
        disabled={!selectedRoute?.length}
      >
        🏁 Finalitzar track
      </button>

    </>
  )}


  {routeStatus === "finished" && (

  <>

    <button
      onClick={handleRestartRoute}
    >
      ↩️ Tornar a començar
    </button>
    

    <button
    onClick={() => {

  const coordinates =
    buildRouteCoordinates();

  const gpx =
  buildGPXContent(
    coordinates,
    routeDistance,
    routeAscent,
    routeDescent
  );

  if (!gpx) {
    return;
  }

  const blob =
    new Blob(
      [gpx],
      {
        type: "application/gpx+xml",
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href = url;

  link.download =
  `track-xarxa-corriols-${routeDistance.toFixed(2)}km.gpx`;

  document.body.appendChild(
    link
  );

  link.click();

  document.body.removeChild(
    link
  );

  URL.revokeObjectURL(
    url
  );

}}  
    >
      ⬇️ Descarregar track GPX
    </button>

    </>

  )}

</div>


      </div>   {/* ← AQUEST ÉS EL QUE FALTAVA */}

      <p
        style={{
          marginTop: "8px",
          fontWeight: "bold",
        }}
      >
        🧭 {selectedRoute.length} trams
      </p>

    </>
  )}

  {userTool !== "route" && userTool !== "predefined" && (
  <TrailStatusPanel
    activeTrail={activeTrail}
    trailStatus={trailStatus}
    updateTrailStatus={updateTrailStatus}
    clearTrailStatus={clearTrailStatus}
    appMode={appMode}
    userTool={userTool}
  />
)}

          

        {userTool !== "route" && userTool !== "predefined" && (
  
       <>

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

          {userTool === "route" && (
  <>
    <h3
      style={{
        marginTop: "18px",
        marginBottom: "8px",
        color: "#1b5e20",
      }}
    >
      🧭 Trams de la ruta
    </h3>

    {selectedRoute.length === 0 ? (

      <p>
        Encara no hi ha cap tram seleccionat.
      </p>

    ) : (

      <ol
        style={{
          paddingLeft: "22px",
          lineHeight: "1.5",
        }}
      >

        {selectedRoute.map(
          (edge, index) => (

            <li
              key={
                `${edge.edgeId}-${index}`
              }
              style={{
                marginBottom: "8px",
              }}
            >

              <strong>
                {edge.segment}
              </strong>

              <br />

              <small>

                {edge.direction === "reverse"
                  ? "← REV"
                  : "→ FWD"}

                {" · "}

                {(
                  edge.distance_km || 0
                ).toFixed(3)}

                {" km"}

              </small>

            </li>

          )
        )}

      </ol>

    )}

  </>

)}

        </aside>

      </main>

    </div>

  );

}

export default App;