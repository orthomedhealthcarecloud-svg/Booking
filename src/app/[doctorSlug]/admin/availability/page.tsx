'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { useDoctor } from '@/components/DoctorProvider';
import { useAuth } from '@/components/AuthProvider';
import { Icon } from '@/components/ui/Icon';
import { firestore } from '@/lib/firebase/client';
import type { AvailabilityTemplateDoc, ConsultationType } from '@/lib/types';

type CellState = 'video' | 'text' | 'both' | 'off';
type Block = AvailabilityTemplateDoc['blocks'][number];

// Bookable window: 08:00 → 22:00 in 30-minute steps (last start = 21:30).
const DAY_START_HOUR = 8;
const DAY_END_HOUR = 22;
const SLOTS = Array.from({ length: (DAY_END_HOUR - DAY_START_HOUR) * 2 }, (_, i) => {
  const m = DAY_START_HOUR * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
});

// Columns are a rolling 7 days starting today. Each column maps to a weekday
// (dayOfWeek 0..6) — edits are stored against the weekday, so the schedule
// repeats every week until the doctor changes it.
type Col = { dayOfWeek: number; weekday: string; dateLabel: string; isToday: boolean };
function buildColumns(): Col[] {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    return {
      dayOfWeek: d.getDay(),
      weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase(),
      dateLabel: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      isToday: i === 0,
    };
  });
}

const cellStyle = (v: CellState): React.CSSProperties => {
  if (v === 'off')
    return { background: 'var(--surface-sunk)', color: 'var(--ink-4)', border: '1px solid var(--line)' };
  if (v === 'both')
    return { background: 'var(--primary-tint)', color: 'var(--primary)', border: '1px solid transparent' };
  if (v === 'video')
    return { background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line-strong)' };
  return { background: 'var(--surface)', color: 'var(--ink-2)', border: '1px dashed var(--line-strong)' };
};

const cycle = (v: CellState): CellState => {
  if (v === 'off') return 'both';
  if (v === 'both') return 'video';
  if (v === 'video') return 'text';
  return 'off';
};

const toAllowedTypes = (v: CellState): ConsultationType[] => {
  if (v === 'both') return ['video', 'text'];
  if (v === 'video') return ['video'];
  if (v === 'text') return ['text'];
  return [];
};

const fromAllowedTypes = (types: ConsultationType[]): CellState => {
  if (types.includes('video') && types.includes('text')) return 'both';
  if (types.includes('video')) return 'video';
  if (types.includes('text')) return 'text';
  return 'off';
};

const cellLabel = (v: CellState) => (v === 'off' ? '' : v === 'both' ? 'BOTH' : v);

// Collapse a column of 30-min cells into contiguous blocks for storage.
function buildBlocks(cells: CellState[]): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;
  SLOTS.forEach((slot, rowIdx) => {
    const [hh, mm] = slot.split(':').map(Number);
    const startM = hh * 60 + mm;
    const endM = startM + 30;
    const allowed = toAllowedTypes(cells[rowIdx]);
    if (allowed.length === 0) {
      if (current) {
        blocks.push(current);
        current = null;
      }
      return;
    }
    if (
      current &&
      current.endMinute === startM &&
      JSON.stringify(current.allowedTypes) === JSON.stringify(allowed)
    ) {
      current.endMinute = endM;
    } else {
      if (current) blocks.push(current);
      current = { startMinute: startM, endMinute: endM, allowedTypes: allowed };
    }
  });
  if (current) blocks.push(current);
  return blocks;
}

// Map stored blocks back onto a column of cells.
function blocksToCells(blocks: Block[]): CellState[] {
  const cells = SLOTS.map(() => 'off' as CellState);
  blocks.forEach((b) => {
    SLOTS.forEach((slot, rowIdx) => {
      const [hh, mm] = slot.split(':').map(Number);
      const m = hh * 60 + mm;
      if (m >= b.startMinute && m < b.endMinute) cells[rowIdx] = fromAllowedTypes(b.allowedTypes);
    });
  });
  return cells;
}

export default function AvailabilityPage() {
  const doctor = useDoctor();
  const { user } = useAuth();
  const columns = useMemo(buildColumns, []);
  const [grid, setGrid] = useState<CellState[][]>(() => SLOTS.map(() => columns.map(() => 'off')));
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const gridRef = useRef(grid);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const materialize = useCallback(async (): Promise<string> => {
    if (!user) return 'Saved.';
    const token = await user.getIdToken();
    const res = await fetch('/api/availability/materialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ doctorId: doctor.id }),
    });
    if (!res.ok) return 'Saved, but publishing slots failed.';
    const r = (await res.json()) as { total: number };
    return `Saved · ${r.total} bookable slots published for the next 7 days.`;
  }, [user, doctor.id]);

  const save = useCallback(async () => {
    setSaving(true);
    setStatusMsg('Saving…');
    try {
      await Promise.all(
        columns.map(async (col, ci) => {
          const blocks = buildBlocks(SLOTS.map((_, ri) => gridRef.current[ri][ci]));
          await setDoc(doc(firestore(), 'availability_templates', `${doctor.id}_${col.dayOfWeek}`), {
            doctorId: doctor.id,
            dayOfWeek: col.dayOfWeek,
            blocks,
            slotDurationMinutes: 30,
            isActive: true,
            updatedAt: serverTimestamp(),
          });
        }),
      );
      setStatusMsg(await materialize());
    } catch {
      setStatusMsg('Save failed — check your connection.');
    } finally {
      setSaving(false);
    }
  }, [columns, doctor.id, materialize]);

  // Debounced auto-save — fires ~800ms after the last edit.
  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setStatusMsg('Saving…');
    saveTimer.current = setTimeout(() => void save(), 800);
  }, [save]);

  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(
        query(
          collection(firestore(), 'availability_templates'),
          where('doctorId', '==', doctor.id),
        ),
      );
      const docs: AvailabilityTemplateDoc[] = [];
      snap.forEach((d) => docs.push({ id: d.id, ...(d.data() as Omit<AvailabilityTemplateDoc, 'id'>) }));
      const next = SLOTS.map(() => columns.map(() => 'off' as CellState));
      docs.forEach((t) => {
        const ci = columns.findIndex((c) => c.dayOfWeek === t.dayOfWeek);
        if (ci === -1) return;
        blocksToCells(t.blocks).forEach((c, ri) => (next[ri][ci] = c));
      });
      gridRef.current = next;
      setGrid(next);
    };
    load().catch(() => {});
  }, [doctor.id, columns]);

  const click = (r: number, c: number) => {
    setGrid((g) => {
      const next = g.map((row, ri) => row.map((cell, ci) => (ri === r && ci === c ? cycle(cell) : cell)));
      gridRef.current = next;
      return next;
    });
    scheduleSave();
  };

  return (
    <div data-screen-label="Availability">
      <div className="admin-header">
        <div>
          <h1>Availability</h1>
          <div className="sub">
            Rolling week starting today. Changes save automatically and repeat every week — next
            Monday keeps last Monday&apos;s schedule unless you change it.
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span
            className="row"
            style={{ gap: 6, fontSize: 12, color: saving ? 'var(--ink-2)' : 'var(--ink-3)' }}
          >
            {saving && (
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'var(--warn, #d98a00)',
                  display: 'inline-block',
                }}
              />
            )}
            {statusMsg || 'All changes saved automatically.'}
          </span>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 18, gap: 8 }}>
        <div className="spacer" />
        <div className="row" style={{ gap: 14, fontSize: 12, color: 'var(--ink-3)', flexWrap: 'wrap' }}>
          <div className="row" style={{ gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--primary-tint)' }} />
            Both (patient picks video or text)
          </div>
          <div className="row" style={{ gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--surface)', border: '1px solid var(--line-strong)' }} />
            Video only
          </div>
          <div className="row" style={{ gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--surface)', border: '1px dashed var(--line-strong)' }} />
            Text only
          </div>
          <div className="row" style={{ gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--surface-sunk)', border: '1px solid var(--line)' }} />
            Closed
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(7, 1fr)', gap: 6 }}>
          <div />
          {columns.map((col) => (
            <div key={col.dayOfWeek} style={{ textAlign: 'center', paddingBottom: 6 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: col.isToday ? 600 : 500,
                  color: col.isToday ? 'var(--primary)' : 'var(--ink-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {col.isToday ? 'TODAY' : col.weekday}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                {col.isToday ? col.weekday : ''} {col.dateLabel}
              </div>
            </div>
          ))}
          {SLOTS.map((s, ri) => (
            <Fragment key={ri}>
              <div className="mono" style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8 }}>
                {s}
              </div>
              {columns.map((col, ci) => (
                <button
                  key={col.dayOfWeek}
                  onClick={() => click(ri, ci)}
                  style={{ height: 34, borderRadius: 6, fontSize: 11, fontWeight: 500, display: 'grid', placeItems: 'center', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em', ...cellStyle(grid[ri][ci]) }}
                >
                  {cellLabel(grid[ri][ci])}
                </button>
              ))}
            </Fragment>
          ))}
        </div>
        <p style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 14 }}>
          Click a cell to cycle: Closed → Both → Video only → Text only → Closed. Save when done.{' '}
          <Icon name="check" size={12} />
        </p>
      </div>
    </div>
  );
}
