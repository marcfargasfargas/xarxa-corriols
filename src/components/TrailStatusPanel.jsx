/*
----------------------------------------------------

Xarxa de Corriols d'Alàs i Cerc
Field Edition 0.5

Fitxer: TrailStatusPanel.jsx

Responsabilitats:
- Mostrar el corriol actiu
- Mostrar la informació del corriol
- Editar l'estat del corriol
- Permetre esborrar tots els estats (Administrador)

----------------------------------------------------
*/

export default function TrailStatusPanel({
  activeTrail,
  trailStatus,
  updateTrailStatus,
  clearTrailStatus,
  appMode,
  userTool,
}) {

  const hasStatus =
    Object.keys(trailStatus).length > 0;

  if (!activeTrail) {
    return (
      <div>

        <h3>🌿 Corriol actiu</h3>

        <p>Selecciona un corriol al mapa.</p>

        {hasStatus && appMode === "admin" && (
          <>
            <hr />

            <button
              onClick={clearTrailStatus}
              style={{
                width: "100%",
                padding: "10px",
                background: "#c62828",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              🗑 Esborrar tots els estats
            </button>
          </>
        )}

      </div>
    );
  }

 // Estat actual del corriol

const trailData = trailStatus[activeTrail.name];

const status =
  typeof trailData === "string"
    ? trailData
    : trailData?.status ?? "unreviewed";

const updatedAt =
  typeof trailData === "object"
    ? trailData?.updatedAt
    : null;

function buttonStyle(type) {

    return {

      width: "100%",

      padding: "10px",

      marginBottom: "8px",

      borderRadius: "6px",

      border:
        status === type
          ? "2px solid #000"
          : "1px solid #cccccc",

      background: "#ffffff",

      cursor: "pointer",

      textAlign: "left",

      fontSize: "14px",

      fontWeight:
        status === type ? "bold" : "normal",

    };

  }

  return (

    <div>

      <h3>🌿 Corriol actiu</h3>

      <p>
        <strong>{activeTrail.name}</strong>
      </p>

      {(appMode === "admin" || userTool === "status") && (
  <p>
    {status === "clean" && "🟢 Estat: Corriol net"}
    {status === "pending" && "🟡 Estat: Pendent de neteja"}
    {status === "maintenance" && "🔵 Estat: En manteniment"}
    {status === "closed" && "🔴 Estat: Corriol tancat"}
    {status === "unreviewed" && "⚪ Estat: Sense revisar"}
  </p>
)}

      {userTool === "route" && (
  <>
    <p>
      📏 {activeTrail.distance.toFixed(1)} km
    </p>

    <p>
      ⬆ {activeTrail.ascent.toFixed(0)} m
    </p>

    <p>
      ⬇ {activeTrail.descent.toFixed(0)} m
    </p>
  </>
)}

{(appMode === "admin" || userTool === "status") && updatedAt && (
  <p>
    📅 Última actualització:{" "}
    {new Date(updatedAt).toLocaleDateString("ca-ES")}
  </p>
)}

      <hr />
  {appMode === "admin" && (
  <>
    <h4>Estat del corriol</h4>

    <button
      style={buttonStyle("unreviewed")}
      onClick={() =>
        updateTrailStatus(
          activeTrail.name,
          "unreviewed"
        )
      }
    >
      ⚪ Sense revisar
    </button>

    <button
      style={buttonStyle("clean")}
      onClick={() =>
        updateTrailStatus(
          activeTrail.name,
          "clean"
        )
      }
    >
      🟢 Corriol net
    </button>

    <button
  style={buttonStyle("pending")}
  onClick={() =>
    updateTrailStatus(
      activeTrail.name,
      "pending"
    )
  }
>
  🟡 Pendent de neteja
</button>

<button
  style={buttonStyle("maintenance")}
  onClick={() =>
    updateTrailStatus(
      activeTrail.name,
      "maintenance"
    )
  }
>
  🔵 En manteniment
</button>

<button
  style={buttonStyle("closed")}
  onClick={() =>
    updateTrailStatus(
      activeTrail.name,
      "closed"
    )
  }
>
  🔴 Corriol tancat
</button>
</>
)}

      {hasStatus && appMode === "admin" && (
        <>
          <hr />

          <button
            onClick={clearTrailStatus}
            style={{
              width: "100%",
              padding: "10px",
              background: "#c62828",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🗑 Esborrar tots els estats
          </button>
        </>
      )}

    </div>

  );

}