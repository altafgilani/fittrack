import { useEffect, useState } from "react";
import { Plus, Dumbbell, ChevronDown, ChevronUp, Trash2, ChevronLeft } from "lucide-react";
import { api } from "../lib/api";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { formatDate } from "../lib/utils";

interface Exercise {
  id: string;
  name: string;
  category: string;
  sets?: number;
  reps?: number;
  weightKg?: number;
  distanceKm?: number;
  durationSecs?: number;
}

interface Workout {
  id: string;
  name: string;
  date: string;
  durationMins?: number;
  notes?: string;
  effort?: number;
  exercises: Exercise[];
}

// ─── Workout type definitions ────────────────────────────────────────────────

type WorkoutKind =
  | "run" | "walk" | "cycle" | "swim"
  | "strength" | "yoga" | "custom";

const KINDS: { kind: WorkoutKind; label: string; emoji: string; category: "cardio" | "strength" | "flexibility" }[] = [
  { kind: "run",      label: "Run",       emoji: "🏃",  category: "cardio" },
  { kind: "walk",     label: "Walk",      emoji: "🚶",  category: "cardio" },
  { kind: "cycle",    label: "Cycle",     emoji: "🚴",  category: "cardio" },
  { kind: "swim",     label: "Swim",      emoji: "🏊",  category: "cardio" },
  { kind: "strength", label: "Strength",  emoji: "💪",  category: "strength" },
  { kind: "yoga",     label: "Yoga",      emoji: "🧘",  category: "flexibility" },
  { kind: "custom",   label: "Other",     emoji: "⚡",  category: "strength" },
];

const CARDIO_KINDS = new Set<WorkoutKind>(["run", "walk", "cycle", "swim"]);
const FLEX_KINDS   = new Set<WorkoutKind>(["yoga"]);

// ─── Cardio form ─────────────────────────────────────────────────────────────

interface CardioForm {
  date: string;
  distanceKm: string;
  durationMins: string;
  durationSecs: string;
  notes: string;
  effort: number;
}

function CardioWorkoutForm({
  kind,
  onSave,
  onCancel,
}: {
  kind: WorkoutKind;
  onSave: (data: object) => Promise<void>;
  onCancel: () => void;
}) {
  const label = KINDS.find((k) => k.kind === kind)!.label;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CardioForm>({
    date: new Date().toISOString().split("T")[0],
    distanceKm: "",
    durationMins: "",
    durationSecs: "",
    notes: "",
    effort: 5,
  });

  const set = (patch: Partial<CardioForm>) => setForm((f) => ({ ...f, ...patch }));

  const handleSave = async () => {
    if (!form.distanceKm && !form.durationMins) {
      alert("Enter at least distance or duration.");
      return;
    }
    setSaving(true);
    const totalSecs =
      (parseInt(form.durationMins || "0") * 60) +
      parseInt(form.durationSecs || "0");
    const totalMins = form.durationMins ? parseInt(form.durationMins) : undefined;

    await onSave({
      name: label,
      date: form.date,
      durationMins: totalMins,
      notes: form.notes || undefined,
      effort: form.effort,
      exercises: [
        {
          name: label,
          category: "cardio",
          distanceKm: form.distanceKm ? parseFloat(form.distanceKm) : undefined,
          durationSecs: totalSecs || undefined,
          orderIndex: 0,
        },
      ],
    });
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Date" type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
        <Input
          label="Distance (km)"
          type="number"
          step="0.01"
          placeholder="e.g. 5.2"
          value={form.distanceKm}
          onChange={(e) => set({ distanceKm: e.target.value })}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Duration</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              placeholder="mins"
              min={0}
              value={form.durationMins}
              onChange={(e) => set({ durationMins: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
            <span className="text-gray-400 text-sm shrink-0">min</span>
            <input
              type="number"
              placeholder="secs"
              min={0}
              max={59}
              value={form.durationSecs}
              onChange={(e) => set({ durationSecs: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
            <span className="text-gray-400 text-sm shrink-0">sec</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Effort — <span className="text-emerald-600 font-bold">{form.effort}/10</span>
          </label>
          <input
            type="range" min={1} max={10}
            value={form.effort}
            onChange={(e) => set({ effort: parseInt(e.target.value) })}
            className="accent-emerald-600 mt-1"
          />
        </div>
      </div>
      <Input
        label="Notes (optional)"
        placeholder="How did it feel?"
        value={form.notes}
        onChange={(e) => set({ notes: e.target.value })}
      />
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{ backgroundColor: "#059669", color: "#fff" }}
          className="px-4 py-2 text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : `Save ${label}`}
        </button>
      </div>
    </div>
  );
}

// ─── Flexibility form ─────────────────────────────────────────────────────────

function FlexWorkoutForm({
  kind,
  onSave,
  onCancel,
}: {
  kind: WorkoutKind;
  onSave: (data: object) => Promise<void>;
  onCancel: () => void;
}) {
  const label = KINDS.find((k) => k.kind === kind)!.label;
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [durationMins, setDurationMins] = useState("");
  const [notes, setNotes] = useState("");
  const [effort, setEffort] = useState(5);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      name: label,
      date,
      durationMins: durationMins ? parseInt(durationMins) : undefined,
      notes: notes || undefined,
      effort,
      exercises: [
        { name: label, category: "flexibility", durationSecs: durationMins ? parseInt(durationMins) * 60 : undefined, orderIndex: 0 },
      ],
    });
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label="Duration (mins)" type="number" placeholder="e.g. 30" value={durationMins} onChange={(e) => setDurationMins(e.target.value)} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Effort — <span className="text-emerald-600 font-bold">{effort}/10</span></label>
          <input type="range" min={1} max={10} value={effort} onChange={(e) => setEffort(parseInt(e.target.value))} className="accent-emerald-600 mt-1" />
        </div>
      </div>
      <Input label="Notes (optional)" placeholder="What did you work on?" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
        <button type="button" onClick={handleSave} disabled={saving} style={{ backgroundColor: "#059669", color: "#fff" }} className="px-4 py-2 text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50">
          {saving ? "Saving…" : `Save ${label}`}
        </button>
      </div>
    </div>
  );
}

// ─── Strength exercise row ────────────────────────────────────────────────────

interface ExerciseRow {
  name: string;
  sets: string;
  reps: string;
  weightKg: string;
}

function StrengthWorkoutForm({
  kind,
  onSave,
  onCancel,
}: {
  kind: WorkoutKind;
  onSave: (data: object) => Promise<void>;
  onCancel: () => void;
}) {
  const defaultName = kind === "strength" ? "Strength Training" : kind === "custom" ? "" : KINDS.find((k) => k.kind === kind)!.label;
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(defaultName);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [effort, setEffort] = useState(5);
  const [exercises, setExercises] = useState<ExerciseRow[]>([
    { name: "", sets: "3", reps: "10", weightKg: "" },
  ]);

  const updateEx = (i: number, patch: Partial<ExerciseRow>) =>
    setExercises((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const addEx = () => setExercises((r) => [...r, { name: "", sets: "3", reps: "10", weightKg: "" }]);
  const removeEx = (i: number) => setExercises((r) => r.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!name) { alert("Enter a workout name."); return; }
    if (exercises.some((e) => !e.name)) { alert("Fill in all exercise names."); return; }
    setSaving(true);
    await onSave({
      name,
      date,
      notes: notes || undefined,
      effort,
      exercises: exercises.map((e, i) => ({
        name: e.name,
        category: "strength",
        sets: e.sets ? parseInt(e.sets) : undefined,
        reps: e.reps ? parseInt(e.reps) : undefined,
        weightKg: e.weightKg ? parseFloat(e.weightKg) : undefined,
        orderIndex: i,
      })),
    });
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Session name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Push Day" />
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-sm font-medium text-gray-700">Effort — <span className="text-emerald-600 font-bold">{effort}/10</span></label>
          <input type="range" min={1} max={10} value={effort} onChange={(e) => setEffort(parseInt(e.target.value))} className="accent-emerald-600" />
        </div>
      </div>

      {/* Exercise rows */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Exercises</h3>
          <button type="button" onClick={addEx} className="text-xs text-emerald-600 hover:underline font-medium flex items-center gap-1">
            <Plus size={13} /> Add exercise
          </button>
        </div>
        <div className="space-y-3">
          {exercises.map((ex, i) => (
            <div key={i} className="flex gap-2 items-center bg-gray-50 rounded-lg p-3">
              <div className="flex-1 min-w-0">
                <input
                  placeholder="Exercise name (e.g. Bench Press)"
                  value={ex.name}
                  onChange={(e) => updateEx(i, { name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 mb-2"
                />
                <div className="flex gap-2">
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      type="number"
                      placeholder="Sets"
                      value={ex.sets}
                      onChange={(e) => updateEx(i, { sets: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-xs text-gray-400 shrink-0">sets</span>
                  </div>
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      type="number"
                      placeholder="Reps"
                      value={ex.reps}
                      onChange={(e) => updateEx(i, { reps: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-xs text-gray-400 shrink-0">reps</span>
                  </div>
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      type="number"
                      placeholder="Weight"
                      step="0.5"
                      value={ex.weightKg}
                      onChange={(e) => updateEx(i, { weightKg: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-xs text-gray-400 shrink-0">kg</span>
                  </div>
                </div>
              </div>
              {exercises.length > 1 && (
                <button type="button" onClick={() => removeEx(i)} className="text-gray-300 hover:text-red-500 p-1 shrink-0">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <Input label="Notes (optional)" placeholder="How did it go?" value={notes} onChange={(e) => setNotes(e.target.value)} />

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
        <button type="button" onClick={handleSave} disabled={saving} style={{ backgroundColor: "#059669", color: "#fff" }} className="px-4 py-2 text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50">
          {saving ? "Saving…" : "Save workout"}
        </button>
      </div>
    </div>
  );
}

// ─── Format exercise summary for history ─────────────────────────────────────

function formatExercise(ex: Exercise): string {
  if (ex.category === "cardio") {
    const parts: string[] = [];
    if (ex.distanceKm) parts.push(`${ex.distanceKm} km`);
    if (ex.durationSecs) {
      const m = Math.floor(ex.durationSecs / 60);
      const s = ex.durationSecs % 60;
      parts.push(s > 0 ? `${m}m ${s}s` : `${m} min`);
    }
    if (ex.distanceKm && ex.durationSecs) {
      const pace = ex.durationSecs / 60 / ex.distanceKm;
      parts.push(`${pace.toFixed(1)} min/km`);
    }
    return parts.join(" · ");
  }
  if (ex.category === "flexibility") {
    if (ex.durationSecs) return `${Math.round(ex.durationSecs / 60)} min`;
    return "";
  }
  const parts: string[] = [];
  if (ex.sets && ex.reps) parts.push(`${ex.sets}×${ex.reps}`);
  else if (ex.sets) parts.push(`${ex.sets} sets`);
  if (ex.weightKg) parts.push(`${ex.weightKg} kg`);
  return parts.join(" @ ");
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Workouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedKind, setSelectedKind] = useState<WorkoutKind | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadWorkouts(); }, []);

  async function loadWorkouts() {
    try {
      const data = await api.get<{ workouts: Workout[]; total: number }>("/workouts");
      setWorkouts(data.workouts);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (data: object) => {
    await api.post("/workouts", data);
    setSelectedKind(null);
    setShowPicker(false);
    loadWorkouts();
  };

  const handleCancel = () => {
    setSelectedKind(null);
    setShowPicker(false);
  };

  const deleteWorkout = async (id: string) => {
    if (!confirm("Delete this workout?")) return;
    await api.delete(`/workouts/${id}`);
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    setTotal((t) => t - 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workouts</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total logged</p>
        </div>
        {!showPicker && !selectedKind && (
          <button
            onClick={() => setShowPicker(true)}
            style={{ backgroundColor: "#059669", color: "#fff" }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={16} /> Log workout
          </button>
        )}
      </div>

      {/* Step 1: workout type picker */}
      {showPicker && !selectedKind && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">What type of workout?</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
              {KINDS.map(({ kind, label, emoji }) => (
                <button
                  key={kind}
                  onClick={() => setSelectedKind(kind)}
                  className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-emerald-400 hover:bg-emerald-50 transition-all"
                >
                  <span className="text-3xl">{emoji}</span>
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </button>
              ))}
            </div>
            <button onClick={handleCancel} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <ChevronLeft size={14} /> Cancel
            </button>
          </CardBody>
        </Card>
      )}

      {/* Step 2: type-specific form */}
      {selectedKind && (
        <Card>
          <CardHeader className="flex items-center gap-3">
            <button onClick={() => setSelectedKind(null)} className="text-gray-400 hover:text-gray-700">
              <ChevronLeft size={18} />
            </button>
            <span className="text-xl">{KINDS.find((k) => k.kind === selectedKind)!.emoji}</span>
            <h2 className="font-semibold text-gray-900">
              Log {KINDS.find((k) => k.kind === selectedKind)!.label}
            </h2>
          </CardHeader>
          <CardBody>
            {CARDIO_KINDS.has(selectedKind) && (
              <CardioWorkoutForm kind={selectedKind} onSave={handleSave} onCancel={handleCancel} />
            )}
            {FLEX_KINDS.has(selectedKind) && (
              <FlexWorkoutForm kind={selectedKind} onSave={handleSave} onCancel={handleCancel} />
            )}
            {!CARDIO_KINDS.has(selectedKind) && !FLEX_KINDS.has(selectedKind) && (
              <StrengthWorkoutForm kind={selectedKind} onSave={handleSave} onCancel={handleCancel} />
            )}
          </CardBody>
        </Card>
      )}

      {/* Workout history */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading…</div>
      ) : workouts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Dumbbell size={40} className="mx-auto mb-3 opacity-30" />
          <p>No workouts yet. Log your first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workouts.map((w) => {
            const kindMeta = KINDS.find((k) => k.label === w.name) ?? KINDS.find((k) => k.kind === "custom")!;
            return (
              <Card key={w.id}>
                <CardBody className="py-3">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{kindMeta?.emoji ?? "⚡"}</span>
                      <div>
                        <p className="font-semibold text-gray-900">{w.name}</p>
                        <p className="text-xs text-gray-400">
                          {formatDate(w.date)}
                          {w.durationMins && ` · ${w.durationMins} min`}
                          {w.effort && ` · effort ${w.effort}/10`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteWorkout(w.id); }}
                        className="text-gray-300 hover:text-red-500 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                      {expandedId === w.id
                        ? <ChevronUp size={16} className="text-gray-400" />
                        : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </div>

                  {expandedId === w.id && (
                    <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
                      {w.exercises.map((ex) => (
                        <div key={ex.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 font-medium">{ex.name}</span>
                          <span className="text-gray-400">{formatExercise(ex)}</span>
                        </div>
                      ))}
                      {w.notes && <p className="text-sm text-gray-500 italic pt-1">{w.notes}</p>}
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
