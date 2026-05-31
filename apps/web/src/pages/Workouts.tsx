import { useEffect, useState } from "react";
import { Plus, Dumbbell, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../lib/api";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
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

const exerciseSchema = z.object({
  name: z.string().min(1, "Required"),
  category: z.enum(["strength", "cardio", "flexibility"]),
  sets: z.coerce.number().positive().optional().or(z.literal("")),
  reps: z.coerce.number().positive().optional().or(z.literal("")),
  weightKg: z.coerce.number().positive().optional().or(z.literal("")),
  distanceKm: z.coerce.number().positive().optional().or(z.literal("")),
  durationSecs: z.coerce.number().positive().optional().or(z.literal("")),
  orderIndex: z.number().default(0),
});

const workoutSchema = z.object({
  name: z.string().min(1, "Workout name required"),
  date: z.string().optional(),
  durationMins: z.coerce.number().positive().optional().or(z.literal("")),
  notes: z.string().optional(),
  effort: z.coerce.number().min(1).max(10).optional().or(z.literal("")),
  exercises: z.array(exerciseSchema).default([]),
});

type WorkoutForm = z.infer<typeof workoutSchema>;

export function Workouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<WorkoutForm>({
    resolver: zodResolver(workoutSchema),
    defaultValues: { exercises: [{ name: "", category: "strength", orderIndex: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "exercises" });

  useEffect(() => {
    loadWorkouts();
  }, []);

  async function loadWorkouts() {
    try {
      const data = await api.get<{ workouts: Workout[]; total: number }>("/workouts");
      setWorkouts(data.workouts);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = async (data: WorkoutForm) => {
    setSubmitting(true);
    try {
      const cleaned = {
        ...data,
        durationMins: data.durationMins || undefined,
        effort: data.effort || undefined,
        exercises: data.exercises.map((e, i) => ({
          ...e,
          sets: e.sets || undefined,
          reps: e.reps || undefined,
          weightKg: e.weightKg || undefined,
          distanceKm: e.distanceKm || undefined,
          durationSecs: e.durationSecs || undefined,
          orderIndex: i,
        })),
      };
      await api.post("/workouts", cleaned);
      reset({ exercises: [{ name: "", category: "strength", orderIndex: 0 }] });
      setShowForm(false);
      loadWorkouts();
    } finally {
      setSubmitting(false);
    }
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
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ backgroundColor: "#059669", color: "#fff" }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          Log workout
        </button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">New workout</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Workout name"
                  placeholder="e.g. Push Day"
                  error={errors.name?.message}
                  {...register("name")}
                />
                <Input label="Date" type="date" {...register("date")} />
                <Input label="Duration (mins)" type="number" placeholder="45" {...register("durationMins")} />
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Effort (1–10)</label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    className="accent-emerald-600"
                    {...register("effort")}
                  />
                </div>
              </div>

              <Input label="Notes" placeholder="How did it go?" {...register("notes")} />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-800">Exercises</h3>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => append({ name: "", category: "strength", orderIndex: fields.length })}
                  >
                    <Plus size={14} /> Add exercise
                  </Button>
                </div>

                <div className="space-y-4">
                  {fields.map((field, i) => (
                    <div key={field.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Exercise name"
                          className="flex-1"
                          {...register(`exercises.${i}.name`)}
                        />
                        <select
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                          {...register(`exercises.${i}.category`)}
                        >
                          <option value="strength">Strength</option>
                          <option value="cardio">Cardio</option>
                          <option value="flexibility">Flexibility</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => remove(i)}
                          className="text-gray-400 hover:text-red-500 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <Input placeholder="Sets" type="number" {...register(`exercises.${i}.sets`)} />
                        <Input placeholder="Reps" type="number" {...register(`exercises.${i}.reps`)} />
                        <Input placeholder="Weight (kg)" type="number" step="0.5" {...register(`exercises.${i}.weightKg`)} />
                        <Input placeholder="Duration (s)" type="number" {...register(`exercises.${i}.durationSecs`)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : "Save workout"}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : workouts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Dumbbell size={40} className="mx-auto mb-3 opacity-30" />
          <p>No workouts yet. Log your first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workouts.map((w) => (
            <Card key={w.id}>
              <CardBody className="py-3">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
                >
                  <div>
                    <p className="font-semibold text-gray-900">{w.name}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(w.date)}
                      {w.durationMins && ` · ${w.durationMins} min`}
                      {` · ${w.exercises.length} exercises`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteWorkout(w.id); }}
                      className="text-gray-400 hover:text-red-500 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                    {expandedId === w.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>

                {expandedId === w.id && w.exercises.length > 0 && (
                  <div className="mt-4 border-t border-gray-100 pt-4 space-y-2">
                    {w.exercises.map((ex) => (
                      <div key={ex.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 font-medium">{ex.name}</span>
                        <span className="text-gray-400">
                          {ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ""}
                          {ex.weightKg ? ` @ ${ex.weightKg}kg` : ""}
                          {ex.distanceKm ? `${ex.distanceKm}km` : ""}
                          {ex.durationSecs ? `${ex.durationSecs}s` : ""}
                        </span>
                      </div>
                    ))}
                    {w.notes && <p className="text-sm text-gray-500 italic mt-2">{w.notes}</p>}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
