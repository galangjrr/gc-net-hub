/**
 * POST /api/pc-sync   header x-sync-token: <PC_SYNC_TOKEN>
 * Body: { pcs: { "pc-bino": 120, "pc-iyoo": 0 } }  (menit sisa per PC, 0 = idle)
 *
 * Fed by scripts/gb-watcher.ps1, which reads the GBilling log. Each call is a full snapshot of the
 * mapped PCs, so the booking page's "Kosong ±X mnt lagi" reflects the real billing timer. Maintenance
 * PCs are left alone, so OP can still park a PC out of service.
 */
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { parseSyncBody, pcTimerUpdate, tokenOk } from "@/lib/pc-sync";

export async function POST(req: Request) {
  if (!tokenOk(req.headers.get("x-sync-token"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const map = parseSyncBody(body);
  if (!map) return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });

  const now = Date.now();
  let updated = 0;
  for (const [pcId, minutesLeft] of Object.entries(map)) {
    const { error } = await supabaseAdmin
      .from("pcs")
      .update(pcTimerUpdate(minutesLeft, now))
      .eq("id", pcId)
      .neq("status", "maintenance");
    if (error) {
      console.error("[pc-sync] update failed:", pcId, error.message);
      return NextResponse.json({ error: "Gagal update PC." }, { status: 500 });
    }
    updated++;
  }
  // Freshness stamp: the booking page flags PC times as not-live once this goes stale.
  await supabaseAdmin.from("settings").update({ pc_synced_at: new Date(now).toISOString() }).eq("id", 1);
  return NextResponse.json({ ok: true, updated });
}
