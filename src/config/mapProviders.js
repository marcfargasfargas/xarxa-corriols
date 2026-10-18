/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
Field Edition 0.6

Fitxer: mapProviders.js

Responsabilitats:
- Centralitzar els proveïdors cartogràfics
- Separar mapes base i capes superposades
- Facilitar futures ampliacions

----------------------------------------------------
*/

// ==============================
// MAPES BASE
// ==============================

export const MAP_PROVIDERS = {

  // OpenStreetMap
  osm: {
    id: "osm",
    name: "OpenStreetMap",
    type: "tile",

    url:
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",

    attribution:
      "© OpenStreetMap contributors",
  },

  // Satèl·lit Esri
  esri: {
    id: "esri",
    name: "Satèl·lit Esri",
    type: "tile",

    url:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",

    attribution:
      "Tiles © Esri",
  },

  // ICGC Ortofoto
  // Pendent d'activar
  ortofoto: {
  id: "ortofoto",
  name: "Ortofoto ICGC",
  type: "wms",

  url:
    "https://geoserveis.icgc.cat/servei/catalunya/orto-territorial/wms",

  layers: "ortofoto_color_vigent",
  format: "image/jpeg",
  transparent: false,

  attribution:
    "Institut Cartogràfic i Geològic de Catalunya",
},

  // ICGC Topogràfic
  // Pendent d'activar
  topografic: {
  id: "topografic",
  name: "Topogràfic ICGC",
  type: "wms",

  url:
    "https://geoserveis.icgc.cat/servei/catalunya/topografia-territorial/wms",

  layers: "topografia-territorial",
  format: "image/png",
  transparent: false,

  attribution:
    "Institut Cartogràfic i Geològic de Catalunya",
 },

};

// ==============================
// CAPES SUPERPOSADES
// ==============================

export const MAP_OVERLAYS = {

  // Cadastre
  cadastre: {
    id: "cadastre",
    name: "Parcel·les cadastrals",
    type: "wms",

    url:
      "https://ovc.catastro.meh.es/Cartografia/WMS/ServidorWMS.aspx?",

    layers: "Catastro",
    format: "image/png",
    transparent: true,

    attribution:
      "Dirección General del Catastro",
  },

};