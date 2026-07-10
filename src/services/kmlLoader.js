import { kml } from "@tmcw/togeojson";

export async function loadKML(file) {
  const text = await file.text();

  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "text/xml");

  const geojson = kml(xml);

  return geojson;
}