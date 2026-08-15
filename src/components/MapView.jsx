/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
Field Edition 0.6 RC1

Fitxer: MapView.jsx

Responsabilitats:
- Crear el mapa Leaflet
- Coordinar les capes
- Gestionar el selector de mapes
- Mostrar la ruta generada pel Route Builder

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


function parseHuntingAreaDescription(description) {

  if (!description) return {};

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
          cells[0].textContent.trim();

        const value =
          cells[1].textContent.trim();

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


  const [
    routeBuilderGeoJSON,
    setRouteBuilderGeoJSON
  ] = useState(null);

  const [
  selectedRoute,
  setSelectedRoute
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

  console.log(
  "🧭 SELECTED ROUTE:",
  selectedRoute
);

  return (

    <div
      style={{
        position: "relative",
        width: "100%",
        height: "600px",
      }}
    >

      <MapContainer

        key={mapVersion}

        center={[
          42.3562,
          1.5068
        ]}

        zoom={14}

        style={{
          width: "100%",
          height: "100%",
        }}

      >

        {/* ================================================== */}
        {/* MAPA BASE */}
        {/* ================================================== */}

        <BaseLayers
          gisLayers={gisLayers}
        />


        {/* ================================================== */}
        {/* ZOOM AUTOMÀTIC */}
        {/* ================================================== */}

        <MapAutoZoom
          geojsonLayers={geojsonLayers}
        />


        {/* ================================================== */}
        {/* ÀREES CINEGÈTIQUES */}
        {/* ================================================== */}

        {gisLayers.huntingAreas &&
          huntingAreasData && (

          <GeoJSON

            data={huntingAreasData}

            style={() => ({

              color: "#8b4513",

              weight: 2,

              fillColor: "#ffffff",

              fillOpacity: 0.05,

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
                      data.AREA_HA.replace(
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

        )}


        {/* ================================================== */}
        {/* XARXES EXISTENTS */}
        {/* ================================================== */}

        {geojsonLayers.map(
          (
            layer,
            index
          ) => (

            <GeoJsonLayer

              key={
                `${index}-${statusFilter}-${userTool}-${JSON.stringify(trailStatus)}`
              }

              data={layer}

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
        )}


        {/* ================================================== */}
        {/* RUTA ROUTE BUILDER */}
        {/* ================================================== */}

        {routeBuilderGeoJSON && (
  <GeoJSON
    data={routeBuilderGeoJSON}

    style={() => ({
      color: "#ff0000",
      weight: 4,
      opacity: 0.8,
    })}

    onEachFeature={(feature, layer) => {

  layer.on("click", () => {

    const clickedEdge =
      feature.properties;

    const segmentName =
      clickedEdge.segment;


    // ========================================================
    // TROBAR LES DUES DIRECCIONS DEL MATEIX TRAM
    // ========================================================

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


    const forwardEdge =
      segmentEdges.find(
        (edge) =>
          edge.direction === "forward"
      );


    const reverseEdge =
      segmentEdges.find(
        (edge) =>
          edge.direction === "reverse"
      );


    console.log(
      "🛤 TRAM CLICAT:",
      segmentName
    );

    console.log(
      "   FWD:",
      forwardEdge?.edgeId
    );

    console.log(
      "   REV:",
      reverseEdge?.edgeId
    );


    setSelectedRoute((previous) => {

      // ======================================================
      // COMPROVAR SI EL TRAM JA FORMA PART DE LA RUTA
      // ======================================================

      const existingIndex =
        previous.findIndex(
          (edge) =>
            edge.segment ===
            segmentName
        );


      // ======================================================
      // TRAM JA SELECCIONAT
      // ======================================================

      if (existingIndex !== -1) {

        const currentEdge =
          previous[existingIndex];


        const alternateEdge =
          currentEdge.direction ===
          "forward"
            ? reverseEdge
            : forwardEdge;


        // ----------------------------------------------------
        // TERCER CLIC → DESELECCIONAR
        //
        // Aquí utilitzem una petita marca temporal:
        // si ja hem invertit aquest tram, el següent clic
        // l'elimina.
        // ----------------------------------------------------

        if (
          currentEdge._directionChanged
        ) {

          console.log(
            "🔴 TRAM DESELECCIONAT:",
            segmentName
          );

          return previous.filter(
            (_, index) =>
              index !== existingIndex
          );

        }


        // ----------------------------------------------------
        // SEGON CLIC → INTENTAR INVERTIR
        // ----------------------------------------------------

        if (!alternateEdge) {

          console.warn(
            "⚠️ No existeix l'altra direcció:",
            segmentName
          );

          return previous;

        }


        // ----------------------------------------------------
        // COMPROVAR CONNEXIÓ AMB L'EDGE ANTERIOR
        // ----------------------------------------------------

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

              finalAnterior:
                previousEdge.to,

              iniciAlternativa:
                alternateEdge.from,
            }
          );

          return previous;

        }


        // ----------------------------------------------------
        // COMPROVAR CONNEXIÓ AMB L'EDGE SEGÜENT
        // ----------------------------------------------------

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

              finalAlternativa:
                alternateEdge.to,

              iniciSegüent:
                nextEdge.from,
            }
          );

          return previous;

        }


        // ----------------------------------------------------
        // INVERSIÓ ACCEPTADA
        // ----------------------------------------------------

        const invertedEdge = {
          ...alternateEdge,
          _directionChanged: true,
        };


        console.log(
          "🔄 DIRECCIÓ INVERTIDA:",
          invertedEdge.edgeId
        );


        return previous.map(
          (edge, index) =>
            index === existingIndex
              ? invertedEdge
              : edge
        );

      }


      // ======================================================
      // TRAM NO SELECCIONAT → PRIMER CLIC
      // ======================================================

      let selectedEdge =
        clickedEdge;


      // ------------------------------------------------------
      // SI JA HI HA RUTA, BUSQUEM LA DIRECCIÓ CONNECTADA
      // ------------------------------------------------------

      if (previous.length > 0) {

        const lastEdge =
          previous[
            previous.length - 1
          ];


        const forwardCompatible =
          forwardEdge &&
          forwardEdge.from ===
            lastEdge.to;


        const reverseCompatible =
          reverseEdge &&
          reverseEdge.from ===
            lastEdge.to;


        if (
          forwardCompatible
        ) {

          selectedEdge =
            forwardEdge;

        } else if (
          reverseCompatible
        ) {

          selectedEdge =
            reverseEdge;

        } else {

          console.warn(
            "⚠️ CAP DIRECCIÓ CONNECTADA:",
            {
              segment:
                segmentName,

              nodeActual:
                lastEdge.to,

              forward:
                forwardEdge?.from,

              reverse:
                reverseEdge?.from,
            }
          );

          return previous;

        }

      }


      // ======================================================
      // PRIMER CLIC ACCEPTAT
      // ======================================================

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

    });

  });

}}

  />
)}

      </MapContainer>


      {/* ================================================== */}
      {/* SELECTOR DE MAPA */}
      {/* ================================================== */}

      <BaseMapSelector

        gisLayers={gisLayers}

        updateGISLayer={
          updateGISLayer
        }

      />

    </div>

  );

}