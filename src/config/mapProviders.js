/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
Field Edition 0.5

Fitxer: mapProviders.js

Responsabilitats:
- Centralitzar tots els proveïdors cartogràfics
- Definir la configuració dels mapes base
- Facilitar futures ampliacions

----------------------------------------------------
*/

export const MAP_PROVIDERS = {

  // ==========================
  // OpenStreetMap
  // ==========================

  osm: {

    id: "osm",

    name: "OpenStreetMap",

    type: "tile",

    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",

    attribution:
      "© OpenStreetMap contributors",

  },

  // ==========================
  // Esri
  // ==========================

  esri: {

    id: "esri",

    name: "Satèl·lit Esri",

    type: "tile",

    url:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",

    attribution:
      "Tiles © Esri",

  },
  
  // ==========================
  // Cadastre
  // ==========================

  cadastre: {

    id: "cadastre",

    name: "Cadastre",

    type: "wms",

    url: "https://ovc.catastro.meh.es/Cartografia/WMS/ServidorWMS.aspx?",

    layers: "Catastro",

    format: "image/png",

    transparent: false,

    attribution: "Dirección General del Catastro",

  },

  // ==========================
  // ICGC Ortofoto
  // ==========================

  ortofoto: {

    id: "ortofoto",

    name: "Ortofoto ICGC",

    type: "tile",

    available: false,

    url: "",

    attribution:
      "Institut Cartogràfic i Geològic de Catalunya",

  },

  // ==========================
  // ICGC Topogràfic
  // ==========================

  topografic: {

    id: "topografic",

    name: "Topogràfic ICGC",

    type: "tile",

    available: false,

    url: "",

    attribution:
      "Institut Cartogràfic i Geològic de Catalunya",

  },
  // ==========================
  // Cadastre
  // ==========================

  cadastre: {

    id: "cadastre",

    name: "Cadastre",

    type: "overlay",

    url: "https://ovc.catastro.meh.es/Cartografia/WMS/ServidorWMS.aspx?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=Catastro&STYLES=&FORMAT=image/png&SRS=EPSG:3857&TRANSPARENT=TRUE&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}",

    attribution: "Dirección General del Catastro",

  },

};