import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function getSecretKey() {
  const newKeys = Deno.env.get("SUPABASE_SECRET_KEYS");

  if (newKeys) {
    try {
      const parsed = JSON.parse(newKeys);
      const key = parsed.default || Object.values(parsed)[0];

      if (typeof key === "string") {
        return key;
      }
    } catch {
      // Fall back to the legacy service-role secret below.
    }
  }

  return (
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("SUPABASE_SECRET_KEY")
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (!token) {
      return json({ error: "認証情報がありません。" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const secretKey = getSecretKey();

    if (!supabaseUrl || !secretKey) {
      return json(
        { error: "Supabaseのサーバー設定が不足しています。" },
        500,
      );
    }

    const admin = createClient(supabaseUrl, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: userData, error: userError } =
      await admin.auth.getUser(token);

    if (userError || !userData.user) {
      return json({ error: "認証に失敗しました。" }, 401);
    }

    if (userData.user.is_anonymous !== true) {
      return json(
        { error: "生徒ログインには匿名セッションが必要です。" },
        403,
      );
    }

    const body = await req.json().catch(() => ({}));

    const name = String(body?.name || "").trim();
    const code = String(body?.code || "").trim();

    if (!name || !code) {
      return json(
        { error: "名前とログインコードを入力してください。" },
        400,
      );
    }

    const { data: candidates, error: studentError } = await admin
      .from("students")
      .select("id, display_name, subjects, active")
      .eq("display_name", name)
      .eq("active", true);

    if (studentError) {
      throw studentError;
    }

    if (!candidates?.length) {
      return json(
        { error: "名前またはログインコードが違います。" },
        401,
      );
    }

    let matched: any = null;

    for (const student of candidates) {
      const { data: secret, error: secretError } = await admin
        .from("student_secrets")
        .select("login_code")
        .eq("student_id", student.id)
        .maybeSingle();

      if (secretError) {
        throw secretError;
      }

      if (secret?.login_code === code) {
        matched = student;
        break;
      }
    }

    if (!matched) {
      return json(
        { error: "名前またはログインコードが違います。" },
        401,
      );
    }

    const { error: deviceError } = await admin
      .from("student_devices")
      .upsert(
        {
          student_id: matched.id,
          auth_user_id: userData.user.id,
        },
        {
          onConflict: "auth_user_id",
        },
      );

    if (deviceError) {
      throw deviceError;
    }

    return json({
      student: {
        id: matched.id,
        name: matched.display_name,
        subjects: matched.subjects || ["japanese", "world"],
      },
    });
  } catch (error) {
    console.error(error);

    return json(
      { error: "ログイン処理でエラーが発生しました。" },
      500,
    );
  }
});
