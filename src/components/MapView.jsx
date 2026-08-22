/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
Field Edition 0.6 RC1

Fitxer: MapView.jsx

Responsabilitats:
- Crear el mapa Leaflet
- Coordinar les capes
- Gestionar el selector de mapes
- Carregar la Xarxa GPX
- Gestionar la selecció del Route Builder

----------------------------------------------------
*/

import {
  MapContainer,
  GeoJSON,
} from "react-leaflet";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import "leaflet/dist/leaflet.css";

import BaseLayers from "./BaseLayers";
import MapAutoZoom from "./MapAutoZoom";
import GeoJsonLayer from "./GeoJsonLayer";
import BaseMapSelector from "./BaseMapSelector";
import DirectionLayer from "./DirectionLayer";


function parseHuntingAreaDescription(
  description
) {

  if (!description) {
    return {};
  }

  const parser =
    new DOMParser();

  const document =
    parser.parseFromString(
      description,
      "text/html"
    );

  const data = {};

  document
    .querySelectorAll("tr")
    .forEach((row) => {

      const cells =
        row.querySelectorAll("td");

      if (cells.length === 2) {

        const key =
          cells[0]
            .textContent
            .trim();

        const value =
          cells[1]
            .textContent
            .trim();

        if (key && value) {

          data[key] =
            value;

        }

      }

    });

  return data;
}


export default function MapView({

  geojsonLayers,

  huntingAreasData,

  onSegmentClick,

  selectedSegments,

  activeTrail,

  trailStatus,

  gisLayers,

  updateGISLayer,

  mapVersion,

  statusFilter,

  userTool,

  selectedRoute,

  setSelectedRoute,

  routeBuilderGeoJSON,

  routeStatus,

}) {

  const routeStatusRef =
    useRef(routeStatus);
    useEffect(() => {

    routeStatusRef.current =
      routeStatus;

  }, [routeStatus]);


  // ============================================================
  // RUTA SELECCIONADA
  // ============================================================

  


  // ============================================================
  // CARREGAR XARXA GPX
  // ============================================================

  


  // ============================================================
  // DEBUG
  // ============================================================

  console.log(
    "🧭 SELECTED ROUTE:",
    selectedRoute
  );


  // ============================================================
  // CAPA GPX INTERACTIVA
  //
  // Només les edges FWD reben clics.
  //
  // La xarxa completa continua carregada a
  // routeBuilderGeoJSON perquè necessitem tant FWD
  // com REV per calcular la direcció.
  // ============================================================

  const clickableRouteGeoJSON =
    routeBuilderGeoJSON
      ? {
          ...routeBuilderGeoJSON,

          features:
            routeBuilderGeoJSON.features.filter(
              (feature) =>
                feature.properties?.direction ===
                "forward"
            ),
        }
      : null;


  // ============================================================
  // SELECCIONAR / INVERTIR / DESELECCIONAR EDGE
  // ============================================================

  function handleRouteEdgeClick(feature) {

  if (!routeBuilderGeoJSON) {
    return;
  }

  // ============================================================
  // TRACK FINALITZAT — NO PERMETRE NOVES SELECCIONS
  // ============================================================

  if (routeStatusRef.current === "finished") {

    console.log(
      "🏁 TRACK FINALITZAT — clic ignorat"
    );

    return;
  }


  const clickedEdge =
    feature.properties || {};

  const segmentName =
    clickedEdge.segment;


  if (!segmentName) {

    console.warn(
      "⚠️ Edge sense segment:",
      clickedEdge
    );

    return;
  }


  // ==========================================================
  // TOTES LES EDGES DEL SEGMENT
  //
  // Un mateix GPX pot tenir diverses edges:
  //
  // 054.gpx_1
  // 054.gpx_1_REV
  // 054.gpx_2
  // 054.gpx_2_REV
  // 054.gpx_3
  // 054.gpx_3_REV
  // ==========================================================
 

  // ==========================================================
  // TOTES LES EDGES DEL SEGMENT
  //
  // Un mateix GPX pot tenir diverses edges:
  //
  // 054.gpx_1
  // 054.gpx_1_REV
  // 054.gpx_2
  // 054.gpx_2_REV
  // 054.gpx_3
  // 054.gpx_3_REV
  // ==========================================================

  const segmentEdges =
    routeBuilderGeoJSON.features
      .filter(
        (item) =>
          item.properties?.segment ===
          segmentName
      )
      .map(
        (item) =>
          item.properties
      );


  console.log(
    "🛤️ TRAM CLICAT:",
    segmentName
  );

  console.log(
    "   EDGE CLICADA:",
    {
      edgeId:
        clickedEdge.edgeId,

      direction:
        clickedEdge.direction,

      from:
        clickedEdge.from,

      to:
        clickedEdge.to,
    }
  );


  // ==========================================================
  // ACTUALITZAR RUTA
  // ==========================================================

  setSelectedRoute(
    (previous) => {


     


      // ========================================================
      // 2. TRAM NO SELECCIONAT
      // ========================================================

      let selectedEdge =
        clickedEdge;


      // ========================================================
      // 3. PRIMER CLIC
      //
      // Si encara no hi ha ruta:
      // seleccionem directament l'edge clicada.
      // ========================================================

      if (
        previous.length === 0
      ) {

        console.log(
          "🟢 PRIMER TRAM:"
        );

      }


      // ========================================================
      // 4. CONTINUACIÓ DE LA RUTA
      //
      // Si ja hi ha ruta:
      //
      // l'edge nova ha de començar exactament
      // al node on acaba l'última edge.
      // ========================================================

      if (
        previous.length > 0
      ) {

        const lastEdge =
          previous[
            previous.length - 1
          ];


        const connectionNode =
          lastEdge.to;


        console.log(
          "🔗 BUSCANT CONTINUACIÓ:",
          {
            segment:
              segmentName,

            nodeActual:
              connectionNode,
          }
        );


        // ======================================================
        // PRIMER INTENT:
        //
        // L'edge exacta que l'usuari ha clicat
        // ja és compatible.
        // ======================================================

        const clickedCompatible =
          clickedEdge.from ===
          connectionNode;


        if (
          clickedCompatible
        ) {

          selectedEdge =
            clickedEdge;

        } else {


          // ====================================================
          // SEGON INTENT:
          //
          // Buscar qualsevol edge del mateix segment
          // que comenci al node actual.
          //
          // Això permet trobar automàticament la FWD o REV
          // correcta quan el segment té diverses edges.
          // ====================================================

          const connectedEdges =
            segmentEdges.filter(
              (edge) =>
                edge.from ===
                connectionNode
            );


          if (
            connectedEdges.length >
            0
          ) {

            selectedEdge =
              connectedEdges[0];

          } else {

            console.warn(
              "⚠️ CAP DIRECCIÓ CONNECTADA:",
              {
                segment:
                  segmentName,

                nodeActual:
                  connectionNode,

                edgesDisponibles:
                  segmentEdges.map(
                    (edge) => ({
                      edgeId:
                        edge.edgeId,

                      direction:
                        edge.direction,

                      from:
                        edge.from,

                      to:
                        edge.to,
                    })
                  ),
              }
            );

            return previous;
          }

        }

      }

    

      // ========================================================
      // 5. AFEGIR TRAM
      // ========================================================

      console.log(
        "🟢 TRAM AFEGIT:",
        {
          edgeId:
            selectedEdge.edgeId,

          direction:
            selectedEdge.direction,

          from:
            selectedEdge.from,

          to:
            selectedEdge.to,
        }
      );


      return [
        ...previous,
        selectedEdge,
      ];

    }
  );

}
        

  // ============================================================
  // RENDER
  // ============================================================

  return (

    <div
      style={{
        position:
          "relative",

        width:
          "100%",

        height:
          "600px",
      }}
    >

      <MapContainer

        key={
          mapVersion
        }

        center={[
          42.3562,
          1.5068,
        ]}

        zoom={
          14
        }

        style={{
          width:
            "100%",

          height:
            "100%",
        }}

      >


        {/* ================================================== */}
        {/* MAPA BASE */}
        {/* ================================================== */}

        <BaseLayers
          gisLayers={
            gisLayers
          }
        />


        {/* ================================================== */}
        {/* ZOOM AUTOMÀTIC */}
        {/* ================================================== */}

        <MapAutoZoom
          geojsonLayers={
            geojsonLayers
          }
        />


        {/* ================================================== */}
        {/* ÀREES CINEGÈTIQUES */}
        {/* ================================================== */}

        {
          gisLayers.huntingAreas &&
          huntingAreasData && (

            <GeoJSON

              data={
                huntingAreasData
              }

              style={() => ({

                color:
                  "#8b4513",

                weight:
                  2,

                fillColor:
                  "#ffffff",

                fillOpacity:
                  0.05,

              })}


              onEachFeature={(
                feature,
                layer
              ) => {

                const properties =
                  feature.properties ||
                  {};


                const description =
                  properties
                    .description
                    ?.value ||
                  "";


                const data =
                  parseHuntingAreaDescription(
                    description
                  );


                const area =
                  data.AREA_HA
                    ? Number(
                        data.AREA_HA
                          .replace(
                            ",",
                            "."
                          )
                      ).toFixed(2)
                    : null;


                layer.bindPopup(`

                  <div
                    style="
                      min-width: 240px
                    "
                  >

                    <strong
                      style="
                        font-size: 15px;
                      "
                    >
                      🏹 ${
                        data.FIGURA_CIN ||
                        "Àrea de caça"
                      }
                    </strong>

                    <br><br>

                    <strong>
                      ${
                        data.NOM ||
                        "Sense nom"
                      }
                    </strong>

                    <br><br>

                    <strong>
                      Matrícula:
                    </strong>

                    ${
                      data.MATRICULA ||
                      properties.name ||
                      "Sense dades"
                    }

                    ${
                      data.TM
                        ? `<br><strong>Municipi:</strong> ${data.TM}`
                        : ""
                    }

                    ${
                      data.COM
                        ? `<br><strong>Comarca:</strong> ${data.COM}`
                        : ""
                    }

                    ${
                      area
                        ? `<br><strong>Superfície:</strong> ${area} ha`
                        : ""
                    }

                  </div>

                `);

              }}

            />

          )
        }


        {/* ================================================== */}
        {/* XARXES EXISTENTS */}
        {/* ================================================== */}

        {
          geojsonLayers.map(
            (
              layer,
              index
            ) => (

              <GeoJsonLayer

                key={
                  `${index}-${statusFilter}-${userTool}-${JSON.stringify(trailStatus)}`
                }

                data={
                  layer
                }

                onSegmentClick={
                  onSegmentClick
                }

                selectedSegments={
                  selectedSegments
                }

                activeTrail={
                  activeTrail
                }

                trailStatus={
                  trailStatus
                }

                statusFilter={
                  statusFilter
                }

              />

            )
          )
        }


        {/* ================================================== */}
        {/* XARXA GPX — ROUTE BUILDER */}
        {/* ================================================== */}

        {
          clickableRouteGeoJSON && (

            <GeoJSON

              data={
                clickableRouteGeoJSON
              }


              style={() => ({

                color:
                  "#ff0000",

                weight:
                  5,

                opacity:
                  0.9,

              })}


              onEachFeature={(
  feature,
  layer
) => {

  if (
    routeStatus === "finished"
  ) {
    return;
  }

  layer.on(
    "click",
    () => {

      handleRouteEdgeClick(
        feature
      );

    }
  );

}}

            />

          )
        }


        {/* ================================================== */}
        {/* RESSALTAT DE LA RUTA SELECCIONADA */}
        {/* ================================================== */}

        <DirectionLayer

          networkGeoJSON={
            routeBuilderGeoJSON
          }

          selectedRoute={
            selectedRoute
          }

        />


      </MapContainer>

      {/* ================================================== */}
      {/* CONTROLS ROUTE BUILDER */}
      {/* ================================================== */}

            

      {/* ================================================== */}
      {/* SELECTOR DE MAPA */}
      {/* ================================================== */}

      <BaseMapSelector

        gisLayers={
          gisLayers
        }

        updateGISLayer={
          updateGISLayer
        }

      />

    </div>

  );

}