import { InsightSnapshotPayload } from '@/types';

interface CreateSnapshotResponse {
  id: string;
  createdAt: string;
}

interface GetSnapshotResponse {
  id: string;
  createdAt: string;
  snapshot: InsightSnapshotPayload;
}

export async function createSnapshot(
  payload: InsightSnapshotPayload
): Promise<CreateSnapshotResponse> {
  const res = await fetch('/api/snapshots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload }),
  });

  if (!res.ok) {
    const message = await safeErrorMessage(res);
    throw new Error(message || 'Failed to create snapshot.');
  }

  return res.json() as Promise<CreateSnapshotResponse>;
}

export async function getSnapshot(id: string): Promise<GetSnapshotResponse> {
  const res = await fetch(`/api/snapshots?id=${encodeURIComponent(id)}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!res.ok) {
    const message = await safeErrorMessage(res);
    throw new Error(message || 'Failed to fetch snapshot.');
  }

  return res.json() as Promise<GetSnapshotResponse>;
}

async function safeErrorMessage(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error || null;
  } catch {
    return null;
  }
}
