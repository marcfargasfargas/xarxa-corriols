import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

export default async (request) => {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Mètode no permès.",
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";

  if (!authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({
        error: "Falta el token d'autenticació.",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  const accessToken = authHeader.slice(7);

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !user) {
    return new Response(
      JSON.stringify({
        error: "Sessió d'usuari no vàlida.",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  if (user.id !== process.env.SUPABASE_ADMIN_USER_ID) {
    return new Response(
      JSON.stringify({
        error: "Usuari no autoritzat.",
      }),
      {
        status: 403,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: "Cos de la petició no vàlid.",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  const { network_gpx, network_graph, trail_status } = body;

  /*
   * ============================================================
   * GUARDAT NOMÉS DELS ESTATS DELS TRAMS
   * ============================================================
   *
   * Permet actualitzar trail_status sense haver d'enviar
   * tota la xarxa GPX + graf cada vegada que canvia un estat.
   */
  if (
    trail_status !== undefined &&
    (trail_status === null ||
      typeof trail_status !== "object" ||
      Array.isArray(trail_status))
  ) {
    return new Response(
      JSON.stringify({
        error: "Les dades de trail_status no són vàlides.",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  if (
    network_gpx === undefined &&
    network_graph === undefined &&
    trail_status !== undefined
  ) {
    const { error: statusError } = await supabaseAdmin
      .from("network_state")
      .update({
        trail_status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", "current");

    if (statusError) {
      console.error(
        "❌ Error guardant els estats dels trams:",
        statusError
      );

      return new Response(
        JSON.stringify({
          error: "No s'han pogut guardar els estats dels trams.",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        saved: "trail_status",
        updated_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  /*
   * ============================================================
   * GUARDAT DE LA XARXA
   * ============================================================
   *
   * Manté el comportament que ja teníem per guardar:
   *   - network_gpx
   *   - network_graph
   *
   * Si trail_status també ve inclòs, el guardem conjuntament.
   */
  if (
    !network_gpx ||
    typeof network_gpx !== "object" ||
    Array.isArray(network_gpx) ||
    !network_graph ||
    typeof network_graph !== "object" ||
    Array.isArray(network_graph)
  ) {
    return new Response(
      JSON.stringify({
        error: "Falten les dades de la xarxa.",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  const stateToSave = {
    id: "current",
    network_gpx,
    network_graph,
    updated_at: new Date().toISOString(),
  };

  if (trail_status !== undefined) {
    stateToSave.trail_status = trail_status;
  }

  const { error: saveError } = await supabaseAdmin
    .from("network_state")
    .upsert(stateToSave, {
      onConflict: "id",
    });

  if (saveError) {
    console.error("❌ Error guardant la xarxa:", saveError);

    return new Response(
      JSON.stringify({
        error: "No s'ha pogut guardar la xarxa.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      updated_at: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
};