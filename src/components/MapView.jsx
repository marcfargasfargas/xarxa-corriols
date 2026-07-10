import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import GeoJsonLayer from "./GeoJsonLayer";

export default function MapView({ geojson, onSegmentClick }) {
  console.log("MapView:", onSegmentClick);
  return (
    <div style={{ height: "600px", width: "100%" }}>
      <MapContainer
        center={[42.3562, 1.5068]}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        <GeoJsonLayer
  data={geojson}
  onSegmentClick={onSegmentClick}
/>
      </MapContainer>
    </div>
  );
}