import JSZip from "jszip";
import { kml } from "@tmcw/togeojson";

export async function loadKMZ(file) {
  // Obrim el KMZ
  const zip = await JSZip.loadAsync(file);

  // Busquem el KML
  const kmlFile = Object.values(zip.files).find((f) =>
    f.name.endsWith(".kml")
  );

  if (!kmlFile) {
    throw new Error("No s'ha trobat cap fitxer KML dins del KMZ.");
  }

  // Llegim el KML com a text
  const text = await kmlFile.async("text");

  // El convertim a XML
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "text/xml");

  // Convertim a GeoJSON
  const geojson = kml(xml);

// Eliminem elements sense geometria
geojson.features = geojson.features.filter(
  (feature) => feature.geometry !== null
);

return geojson;
}