import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SNAPSHOTS_TABLE = process.env.SUPABASE_SNAPSHOTS_TABLE || 'shared_snapshots';
const MAX_SNAPSHOT_SIZE_BYTES = 512_000;

interface SnapshotRow {
  id: string;
  created_at: string;
  payload: unknown;
}

export async function POST(request: Request) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Snapshot storage is not configured on the server.' },
      { status: 503 }
    );
  }

  let payload: unknown;
  try {
    const body = (await request.json()) as { payload?: unknown };
    payload = body.payload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Missing snapshot payload.' }, { status: 400 });
  }

  const serialized = JSON.stringify(payload);
  if (serialized.length > MAX_SNAPSHOT_SIZE_BYTES) {
    return NextResponse.json({ error: 'Snapshot payload is too large.' }, { status: 413 });
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${SNAPSHOTS_TABLE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify([{ payload }]),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorBody = await res.text();
      return NextResponse.json(
        { error: `Snapshot insert failed (${res.status}): ${errorBody}` },
        { status: 502 }
      );
    }

    const rows = (await res.json()) as SnapshotRow[];
    const created = rows[0];
    if (!created?.id) {
      return NextResponse.json({ error: 'Snapshot insert returned no id.' }, { status: 502 });
    }

    return NextResponse.json({ id: created.id, createdAt: created.created_at });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Snapshot insert failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Snapshot storage is not configured on the server.' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Snapshot id is required.' }, { status: 400 });

  try {
    const query = new URLSearchParams({
      select: 'id,created_at,payload',
      id: `eq.${id}`,
      limit: '1',
    });

    const res = await fetch(`${SUPABASE_URL}/rest/v1/${SNAPSHOTS_TABLE}?${query.toString()}`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorBody = await res.text();
      return NextResponse.json(
        { error: `Snapshot fetch failed (${res.status}): ${errorBody}` },
        { status: 502 }
      );
    }

    const rows = (await res.json()) as SnapshotRow[];
    if (!rows.length) {
      return NextResponse.json({ error: 'Snapshot not found.' }, { status: 404 });
    }

    const row = rows[0];
    return NextResponse.json({
      id: row.id,
      createdAt: row.created_at,
      snapshot: row.payload,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Snapshot fetch failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      },
      { status: 500 }
    );
  }
}
