export function exportSelectedSegmentsToGPX(selectedSegments) {
  if (!selectedSegments.length) return;

  const tracks = selectedSegments.map((segment) => {
    const coordinates = segment.feature?.geometry?.coordinates ?? [];

    const points = coordinates
      .map((coord) => {
        const [lon, lat, ele] = coord;

        return `
          <trkpt lat="${lat}" lon="${lon}">
            ${ele !== undefined ? `<ele>${ele}</ele>` : ""}
          </trkpt>`;
      })
      .join("");

    return `
      <trk>
  <name>${segment.name}</name>
  <desc>Distància: ${segment.distance.toFixed(3)} km | Ascensió total: ${segment.ascent.toFixed(0)} m | Baixada total: ${segment.descent.toFixed(0)} m</desc>
  <trkseg>
          ${points}
        </trkseg>
      </trk>`;
  }).join("");

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx
  version="1.1"
  creator="Xarxa de Corriols d'Alàs i Cerc"
  xmlns="http://www.topografix.com/GPX/1/1"
>
  ${tracks}
</gpx>`;

  const blob = new Blob([gpx], {
    type: "application/gpx+xml",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "recorregut-alas-i-cerc.gpx";
  link.click();

  URL.revokeObjectURL(url);
}