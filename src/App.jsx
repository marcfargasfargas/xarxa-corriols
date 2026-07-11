/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
Field Edition 0.4

Fitxer: App.jsx

Responsabilitats:
- Gestionar les xarxes carregades
- Gestionar els segments seleccionats
- Calcular les estadístiques
- Coordinar els components principals

----------------------------------------------------
*/

import { useState } from "react";

import "./App.css";

import Toolbar from "./components/Toolbar";
import MapView from "./components/MapView";

import { parseSegment } from "./utils/segmentParser";

function App() {

  // ==============================
  // Estat global
  // ==============================

  const [geojsonLayers, setGeojsonLayers] = useState([]);
  const [selectedSegments, setSelectedSegments] = useState([]);

  // ==============================
  // Carrega d'una nova xarxa
  // ==============================

  function handleLoaded(newGeojson) {
    setGeojsonLayers((previous) => [...previous, newGeojson]);
  }

  // ==============================
  // Selecció d'un segment
  // ==============================

  function handleSegmentClick(feature) {
    const segment = parseSegment(feature);

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

  return (
    <div className="app">

      <header className="header">
        <h1>🌿 Xarxa de Corriols d'Alàs i Cerc</h1>
      </header>

      <Toolbar onLoaded={handleLoaded} />

      <main className="layout">

        <section className="map">
          <MapView
            geojsonLayers={geojsonLayers}
            onSegmentClick={handleSegmentClick}
            selectedSegments={selectedSegments}
          />
        </section>

        <aside className="sidebar">

          <h2>📍 Recorregut</h2>

          <div className="stats">

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

          <hr />

          <h3>🌿 Xarxes carregades</h3>

          {geojsonLayers.length === 0 ? (
            <p>Cap xarxa carregada.</p>
          ) : (
            <>
              <p>
                <strong>{geojsonLayers.length}</strong> fitxers carregats
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

          <hr />

          <h3>
            🧭 Segments seleccionats ({selectedSegments.length})
          </h3>

          {selectedSegments.length === 0 ? (
            <p>No n'hi ha cap.</p>
          ) : (
            <ul style={{ paddingLeft: "18px", lineHeight: "1.6" }}>
              {selectedSegments.map((segment) => (
                <li key={segment.name}>
                  <strong>🟢 {segment.name}</strong>
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