import JSZip from "jszip";
import { kml } from "@tmcw/togeojson";

// ----------------------------------------------------
// Funció interna que converteix un KMZ (ArrayBuffer)
// en un GeoJSON
// ----------------------------------------------------

async function parseKMZ(arrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer);

  const kmlFile = Object.values(zip.files).find((f) =>
    f.name.endsWith(".kml")
  );

  if (!kmlFile) {
    throw new Error("No s'ha trobat cap fitxer KML dins del KMZ.");
  }

  const text = await kmlFile.async("text");

  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "text/xml");

  const geojson = kml(xml);

  geojson.features = geojson.features.filter(
    (feature) => feature.geometry !== null
  );

  return geojson;
}

// ----------------------------------------------------
// Carregar un KMZ seleccionat per l'usuari
// ----------------------------------------------------

export async function loadKMZ(file) {
  const arrayBuffer = await file.arrayBuffer();
  return parseKMZ(arrayBuffer);
}

// ----------------------------------------------------
// Carregar el KMZ oficial des de public/
// ----------------------------------------------------

export async function loadKMZFromUrl(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("No s'ha pogut carregar el KMZ.");
  }

  const arrayBuffer = await response.arrayBuffer();
  console.log("KMZ carregat:", url);
  return parseKMZ(arrayBuffer);
}