/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
Field Edition 0.5

Fitxer: GISLayerPanel.jsx

Responsabilitats:
- Gestionar els mapes base
- Gestionar les capes GIS
- Actualitzar la configuració del visor

----------------------------------------------------
*/

export default function GISLayerPanel({
  gisLayers,
  updateGISLayer,
}) {

  function radioStyle() {
    return {
      display: "block",
      marginBottom: "8px",
      cursor: "pointer",
    };
  }

  function checkStyle() {
    return {
      display: "block",
      marginBottom: "8px",
      cursor: "pointer",
    };
  }

  return (

    <div>

      <h3>🗺 GIS Municipal</h3>

      <hr />

      <h4>Mapa base</h4>

      <label style={radioStyle()}>
        <input
          type="radio"
          name="basemap"
          checked={gisLayers.baseMap === "osm"}
          onChange={() =>
            updateGISLayer("baseMap", "osm")
          }
        />
        {" "}
        OpenStreetMap
      </label>

      <label style={radioStyle()}>
        <input
          type="radio"
          name="basemap"
          checked={gisLayers.baseMap === "esri"}
          onChange={() =>
            updateGISLayer("baseMap", "esri")
          }
        />
        {" "}
        Satèl·lit Esri
      </label>

      <label style={radioStyle()}>
        <input
          type="radio"
          name="basemap"
          checked={gisLayers.baseMap === "ortofoto"}
          onChange={() =>
            updateGISLayer("baseMap", "ortofoto")
          }
        />
        {" "}
        Ortofoto ICGC
      </label>

      <label style={radioStyle()}>
        <input
          type="radio"
          name="basemap"
          checked={gisLayers.baseMap === "topografic"}
          onChange={() =>
            updateGISLayer("baseMap", "topografic")
          }
        />
        {" "}
        Topogràfic ICGC
      </label>

      <hr />

      <h4>Capes GIS</h4>

      <label style={checkStyle()}>
        <input
          type="checkbox"
          checked={gisLayers.trails}
          onChange={(e) =>
            updateGISLayer(
              "trails",
              e.target.checked
            )
          }
        />
        {" "}
        🌿 Corriols
      </label>

      <label style={checkStyle()}>
        <input
          type="checkbox"
          checked={gisLayers.trailStatus}
          onChange={(e) =>
            updateGISLayer(
              "trailStatus",
              e.target.checked
            )
          }
        />
        {" "}
        🎨 Estat dels corriols
      </label>

      <label style={checkStyle()}>
        <input
          type="checkbox"
          checked={gisLayers.cadastre}
          onChange={(e) =>
            updateGISLayer(
              "cadastre",
              e.target.checked
            )
          }
        />
        {" "}
        📐 Cadastre
      </label>

      <label style={checkStyle()}>
        <input
          type="checkbox"
          disabled
        />
        {" "}
        🦌 Batudes de caça
        <small style={{ color:"#777" }}>
          {" "} (Sprint 3)
        </small>
      </label>

      <label style={checkStyle()}>
        <input
          type="checkbox"
          disabled
        />
        {" "}
        🌲 Espais protegits
      </label>

    </div>

  );

}