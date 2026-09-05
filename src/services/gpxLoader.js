import { gpx } from "@mapbox/togeojson";

export async function loadGPX(file) {
  const text = await file.text();

  const parser = new DOMParser();

  const xml = parser.parseFromString(text, "text/xml");

  const geojson = gpx(xml);

  
  return geojson;
}