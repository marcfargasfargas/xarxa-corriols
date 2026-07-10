import { useState } from "react";
import "./App.css";

import MapView from "./components/MapView";
import Toolbar from "./components/Toolbar";

function App() {
  const [geojson, setGeojson] = useState(null);
  const [selectedSegments, setSelectedSegments] = useState([]);
  function handleSegmentClick(feature) {
  console.log("Segment clicat:", feature);

  setSelectedSegments((previous) => {
    if (previous.includes(feature)) {
      return previous.filter((item) => item !== feature);
    }

    return [...previous, feature];
  });
}

  console.log("App handleSegmentClick:", handleSegmentClick);
  return (
    <div className="app">
      <header className="header">
        <h1> Xarxa de Corriols d'Alàs i Cerc</h1>
      </header>

      <Toolbar onLoaded={setGeojson} />

      <main className="layout">
        <section className="map">
          <MapView
  geojson={geojson}
  onSegmentClick={handleSegmentClick}
/>
        </section>

        <aside className="sidebar">
          <h2>Recorregut</h2>

          <div className="stats">
            <p><strong>Km:</strong> 0,00</p>
            <p><strong>Desnivell +:</strong> 0 m</p>
            <p><strong>Desnivell -:</strong> 0 m</p>
            <p><strong>Temps:</strong> 0 h</p>
          </div>

          <hr />

          <h3>Xarxa</h3>
          <hr />

          <h3>Segments seleccionats</h3>

          <p>{selectedSegments.length} seleccionats</p>

          {geojson ? (
            <p>✅ Xarxa carregada ({geojson.features.length} elements)</p>
          ) : (
            <p>Cap xarxa carregada.</p>
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;