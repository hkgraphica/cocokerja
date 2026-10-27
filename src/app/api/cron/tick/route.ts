import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { tick } from "@/services/tick";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Vercel Cron mengirim `Authorization: Bearer $CRON_SECRET`. Pemicu eksternal memakai header yang sama. */
export async function GET(req: Request) {
  const expected = Buffer.from(`Bearer ${env().CRON_SECRET}`);
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await tick()) });
  } catch (e) {
    console.error("tick gagal", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
