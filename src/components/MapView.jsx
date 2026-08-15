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

}) {


  // ============================================================
  // XARXA GPX
  // ============================================================

  const [
    routeBuilderGeoJSON,
    setRouteBuilderGeoJSON,
  ] = useState(null);


  // ============================================================
  // RUTA SELECCIONADA
  // ============================================================

  const [
    selectedRoute,
    setSelectedRoute,
  ] = useState([]);


  // ============================================================
  // CARREGAR XARXA GPX
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
  // Important:
  // un mateix GPX pot tenir diverses edges:
  //
  // 054.gpx_1
  // 054.gpx_1_REV
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
    "🛤 TRAM CLICAT:",
    segmentName
  );

  console.log(
    "   EDGES DEL SEGMENT:",
    segmentEdges.map(
      (edge) => ({
        edgeId: edge.edgeId,
        direction: edge.direction,
        from: edge.from,
        to: edge.to,
      })
    )
  );


  // ==========================================================
  // TROBAR LA PARELLA DE L'EDGE CLICADA
  // ==========================================================

  let clickedCounterpart = null;

  if (clickedEdge.edgeId) {

    if (
      clickedEdge.direction ===
      "forward"
    ) {

      clickedCounterpart =
        segmentEdges.find(
          (edge) =>
            edge.direction ===
              "reverse" &&
            edge.edgeId ===
              `${clickedEdge.edgeId}_REV`
        );

    } else {

      const forwardId =
        clickedEdge.edgeId.replace(
          "_REV",
          ""
        );

      clickedCounterpart =
        segmentEdges.find(
          (edge) =>
            edge.direction ===
              "forward" &&
            edge.edgeId ===
              forwardId
        );

    }

  }


  // ==========================================================
  // ACTUALITZAR RUTA
  // ==========================================================

  setSelectedRoute(
    (previous) => {

      // ========================================================
      // COMPROVAR SI EL SEGMENT JA ESTÀ SELECCIONAT
      // ========================================================

      const existingIndex =
  previous.findIndex(
    (edge) =>
      edge.edgeId ===
      clickedEdge.edgeId
  );


      // ========================================================
      // SEGMENT JA SELECCIONAT
      // ========================================================

      if (
        existingIndex !== -1
      ) {

        const currentEdge =
          previous[
            existingIndex
          ];


        // ======================================================
        // TROBAR LA DIRECCIÓ CONTRÀRIA DE LA MATEIXA EDGE
        // ======================================================

        let alternateEdge =
          null;


        if (
          currentEdge.direction ===
          "forward"
        ) {

          alternateEdge =
            segmentEdges.find(
              (edge) =>
                edge.edgeId ===
                `${currentEdge.edgeId}_REV`
            );

        } else {

          const forwardId =
            currentEdge.edgeId.replace(
              "_REV",
              ""
            );

          alternateEdge =
            segmentEdges.find(
              (edge) =>
                edge.edgeId ===
                forwardId
            );

        }


        // ======================================================
        // TERCER CLIC
        // ======================================================

        if (
         currentEdge._secondClickDone
        ) {

          console.log(
            "🔴 TRAM DESELECCIONAT:",
            segmentName
          );

          return previous.filter(
            (_, index) =>
              index !==
              existingIndex
          );

        }


        // ======================================================
        // SEGON CLIC → INVERTIR
        // ======================================================

        if (!alternateEdge) {

          console.warn(
            "⚠️ No existeix la direcció contrària:",
            currentEdge.edgeId
          );

          return previous;
        }


        // ======================================================
        // COMPROVAR EDGE ANTERIOR
        // ======================================================

        const previousEdge =
          previous[
            existingIndex - 1
          ];


        if (
          previousEdge &&
          alternateEdge.from !==
            previousEdge.to
        ) {

          console.warn(
            "⚠️ No es pot invertir:",
            {
              segment:
                segmentName,

              edge:
                alternateEdge.edgeId,

              finalAnterior:
                previousEdge.to,

              iniciAlternativa:
                alternateEdge.from,
            }
          );

          return previous.map(
            (edge, index) =>
              index === existingIndex
                ? {
                     ...edge,
                     _secondClickDone:
                     true,
                  }
                : edge
          );
        }


        // ======================================================
        // COMPROVAR EDGE SEGÜENT
        // ======================================================

        const nextEdge =
          previous[
            existingIndex + 1
          ];


        if (
          nextEdge &&
          alternateEdge.to !==
            nextEdge.from
        ) {

          console.warn(
            "⚠️ No es pot invertir perquè trencaria " +
            "la continuïtat següent:",
            {
              segment:
                segmentName,

              edge:
                alternateEdge.edgeId,

              finalAlternativa:
                alternateEdge.to,

              iniciSegüent:
                nextEdge.from,
            }
          );

          return previous.map(
             (edge, index) =>
               index === existingIndex
                 ? {
                     ...edge,
                     _secondClickDone:
                       true,
                   }
                 : edge
           );
        }


        // ======================================================
        // INVERSIÓ ACCEPTADA
        // ======================================================

        const invertedEdge = {

         ...alternateEdge,

         _directionChanged:
            true,

         _secondClickDone:
            true,

       };


        console.log(
          "🔄 DIRECCIÓ INVERTIDA:",
          invertedEdge.edgeId
        );


        return previous.map(
          (edge, index) =>
            index ===
            existingIndex
              ? invertedEdge
              : edge
        );

      }


      // ========================================================
      // SEGMENT NO SELECCIONAT
      // PRIMER CLIC
      // ========================================================

      let selectedEdge =
        clickedEdge;


      // ========================================================
      // SI JA HI HA RUTA:
      //
      // NO BUSQUEM "LA PRIMERA FWD".
      //
      // Busquem qualsevol edge del segment que comenci
      // exactament on acaba l'última edge seleccionada.
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
        // l'edge que l'usuari ha clicat
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
          // qualsevol altra edge del segment
          // que comenci al node actual
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
      // PRIMER CLIC / CONTINUACIÓ ACCEPTADA
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