import { useRef } from "react";
import { loadGPX } from "../services/gpxLoader";
import { loadKML } from "../services/kmlLoader";
import { loadKMZ } from "../services/kmzLoader";

export default function Toolbar({ onLoaded }) {
  const fileInputRef = useRef(null);
  async function handleFile(event) {
    const file = event.target.files[0];

    if (!file) return;

    try {
      

      const extension = file.name.split(".").pop().toLowerCase();

if (extension === "kmz") {
  const geojson = await loadKMZ(file);

  console.log(geojson);
  console.log(geojson.features[0]);

  onLoaded(geojson);

 } else if (extension === "gpx") {

  const geojson = await loadGPX(file);
  console.log(geojson);
  onLoaded(geojson);

} else if (extension === "kml") {

  const geojson = await loadKML(file);
  console.log(geojson);
  onLoaded(geojson);

} else {

  alert("Format de fitxer no suportat.");

}  

    } catch (err) {
      console.error(err);
      alert("No s'ha pogut llegir el KMZ.");
    }
  }

  return (
  <div
    style={{
      padding: "10px",
      background: "#ffffff",
      borderBottom: "1px solid #ccc",
      display: "flex",
      alignItems: "center",
      gap: "12px",
    }}
  >
    <button
      onClick={() => fileInputRef.current?.click()}
      style={{
        padding: "10px 18px",
        background: "#1b5e20",
        color: "white",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "15px",
      }}
    >
      📂 Obrir fitxer
    </button>

    <span style={{ color: "#666", fontSize: "14px" }}>
      KMZ · KML · GPX
    </span>

    <input
      ref={fileInputRef}
      type="file"
      accept=".kmz,.kml,.gpx,.geojson,.json"
      onChange={handleFile}
      style={{ display: "none" }}
    />
  </div>
);
}