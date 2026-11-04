/// <reference lib="deno.ns" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "https://esm.sh/web-push@3.6.7";
import {
  cleanVapidPrivateKey,
  createSendPushHandler,
  fetchPushStore,
  sendWebPushRequest,
} from "../_shared/send-push-policy.ts";

const VAPID_PUBLIC_KEY = "BLF0Fx0NaW60vTV-1fM6jX-TrAWkC5A7Q9ksc4dwdIozzwrW4VwgR2GU4S3BuAlqr-XN0DA7i6lAJRtBsDqmsS4";
const VAPID_SUBJECT = "mailto:gf5000air@hotmail.com";

Deno.serve(createSendPushHandler({
  getServiceRoleKey: () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  getCronSecret: () => Deno.env.get("CRON_SECRET"),
  createStore: (serviceRoleKey) => {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fetchPushStore },
    });
    return {
      async findDuplicate(key) {
        const { data, error } = await supabase.from("sync_log").select("id")
          .eq("tipo", `push_${key}`).eq("status", "success").limit(1);
        if (error) throw error;
        return !!data?.length;
      },
      async loadSubscriptions(topic, limit) {
        let query = supabase.from("push_subscriptions")
          .select("id, endpoint, keys_p256dh, keys_auth").order("id").limit(limit);
        if (topic) query = query.eq("topic", topic);
        const { data, error } = await query;
        if (error) throw error;
        if (!Array.isArray(data)) throw new Error("Assinaturas indisponíveis");
        return data;
      },
      async removeExpired(ids) {
        const { error } = await supabase.from("push_subscriptions").delete().in("id", ids);
        if (error) throw error;
      },
      async recordDelivery(key, details) {
        const { error } = await supabase.from("sync_log").insert({
          tipo: `push_${key}`,
          status: "success",
          detalhes: details,
          finished_at: new Date().toISOString(),
        });
        if (error) throw error;
      },
    };
  },
  createSender: () => {
    const privateKey = cleanVapidPrivateKey(Deno.env.get("VAPID_PRIVATE_KEY"));
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, privateKey);
    return async (sub, payload) => {
      const details = webpush.generateRequestDetails({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
      }, payload, {
        TTL: 86_400,
        vapidDetails: { subject: VAPID_SUBJECT, publicKey: VAPID_PUBLIC_KEY, privateKey },
      });
      return await sendWebPushRequest(details);
    };
  },
}));
