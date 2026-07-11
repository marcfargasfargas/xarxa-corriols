# 🌿 Xarxa de Corriols d'Alàs i Cerc

## Field Edition 0.4

Aplicació web desenvolupada amb React i Leaflet per gestionar la Xarxa de Corriols del municipi d'Alàs i Cerc.

Aquesta versió està orientada a les proves de camp i permet carregar, visualitzar i validar la xarxa de senders sobre diferents mapes base.

---

# Funcionalitats

## 📂 Importació de fitxers

Formats compatibles:

- GPX
- KML
- KMZ

Es poden carregar diversos fitxers consecutivament sense perdre els anteriors.

---

## 🗺 Mapes base

- OpenStreetMap
- Esri World Imagery (Satèl·lit)
- Cadastre

---

## 🌿 Xarxa de corriols

- Visualització simultània de diverses xarxes.
- Zoom automàtic sobre totes les xarxes carregades.
- Selecció interactiva de segments.
- Ressaltat visual dels segments seleccionats.

---

## 📊 Estadístiques

Per cada recorregut seleccionat:

- Distància acumulada
- Desnivell positiu
- Desnivell negatiu

---

## 🛠 Tecnologies

- React
- Vite
- React Leaflet
- Leaflet
- Turf.js

---

## Estructura del projecte

```
src/

components/
    BaseLayers.jsx
    GeoJsonLayer.jsx
    MapAutoZoom.jsx
    MapView.jsx
    Toolbar.jsx

services/
    gpxLoader.js
    kmlLoader.js
    kmzLoader.js

utils/
    segmentParser.js
```

---

## Instal·lació

Instal·lar dependències:

```bash
npm install
```

Executar en desenvolupament:

```bash
npm run dev
```

Compilar la versió de producció:

```bash
npm run build
```

---

## Full de ruta

### ✔ Field Edition 0.4

- Importació GPX/KML/KMZ
- Càrrega múltiple
- Selecció de segments
- Càlcul de distància
- Càlcul de desnivell
- OpenStreetMap
- Satèl·lit
- Cadastre

### 🔄 Field Edition 0.5 (prevista)

- Recorreguts circulars
- Exportació GPX/KML/KMZ
- Guardar i recuperar projectes
- Impressió de mapes
- Perfil altimètric
- Càlcul avançat de desnivells

---

## Autor

Projecte desenvolupat per **Marc Fargas** amb assistència tècnica de ChatGPT.

Municipi d'Alàs i Cerc (Alt Urgell)