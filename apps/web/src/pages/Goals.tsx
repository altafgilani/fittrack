import { useEffect, useState } from "react";
import { Plus, Target, CheckCircle2, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../lib/api";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { formatDate } from "../lib/utils";

interface Goal {
  id: string;
  title: string;
  type: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline?: string;
  completed: boolean;
  completedAt?: string;
}

const goalSchema = z.object({
  title: z.string().min(1, "Required"),
  type: z.enum(["weight", "strength", "cardio", "body_measurement", "habit"]),
  targetValue: z.coerce.number({ required_error: "Required" }),
  currentValue: z.coerce.number().default(0),
  unit: z.string().min(1, "Required"),
  deadline: z.string().optional(),
});

type GoalForm = z.infer<typeof goalSchema>;

const goalTypeLabels: Record<string, string> = {
  weight: "Weight",
  strength: "Strength",
  cardio: "Cardio",
  body_measurement: "Body measurement",
  habit: "Habit",
};

export function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [progressValues, setProgressValues] = useState<Record<string, string>>({});

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<GoalForm>({
    resolver: zodResolver(goalSchema),
    defaultValues: { type: "strength", currentValue: 0 },
  });

  useEffect(() => {
    loadGoals();
  }, []);

  async function loadGoals() {
    try {
      const data = await api.get<Goal[]>("/goals");
      setGoals(data);
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = async (data: GoalForm) => {
    await api.post("/goals", data);
    reset({ type: "strength", currentValue: 0 });
    setShowForm(false);
    loadGoals();
  };

  const updateProgress = async (goal: Goal) => {
    const val = parseFloat(progressValues[goal.id] ?? String(goal.currentValue));
    if (isNaN(val)) return;
    setUpdatingId(goal.id);
    try {
      const updated = await api.patch<Goal>(`/goals/${goal.id}/progress`, { currentValue: val });
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)));
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteGoal = async (id: string) => {
    if (!confirm("Delete this goal?")) return;
    await api.delete(`/goals/${id}`);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const active = goals.filter((g) => !g.completed);
  const completed = goals.filter((g) => g.completed);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
          <p className="text-sm text-gray-500 mt-1">{active.length} active · {completed.length} completed</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ backgroundColor: "#059669", color: "#fff" }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> Set goal
        </button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><h2 className="font-semibold text-gray-900">New goal</h2></CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Goal title" placeholder="e.g. Bench press 100kg" error={errors.title?.message} {...register("title")} />
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Type</label>
                  <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" {...register("type")}>
                    <option value="strength">Strength</option>
                    <option value="cardio">Cardio</option>
                    <option value="weight">Weight</option>
                    <option value="body_measurement">Body measurement</option>
                    <option value="habit">Habit</option>
                  </select>
                </div>
                <Input label="Target value" type="number" step="any" placeholder="100" error={errors.targetValue?.message} {...register("targetValue")} />
                <Input label="Unit" placeholder="kg, km, lbs, days..." error={errors.unit?.message} {...register("unit")} />
                <Input label="Current value" type="number" step="any" placeholder="0" {...register("currentValue")} />
                <Input label="Deadline (optional)" type="date" {...register("deadline")} />
              </div>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save goal"}</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : goals.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Target size={40} className="mx-auto mb-3 opacity-30" />
          <p>No goals set yet. Start with one!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">In progress</h2>
              <div className="space-y-3">
                {active.map((goal) => {
                  const pct = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
                  return (
                    <Card key={goal.id}>
                      <CardBody>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-gray-900">{goal.title}</p>
                            <p className="text-xs text-gray-400">
                              {goalTypeLabels[goal.type]}
                              {goal.deadline && ` · Due ${formatDate(goal.deadline)}`}
                            </p>
                          </div>
                          <button onClick={() => deleteGoal(goal.id)} className="text-gray-300 hover:text-red-500 p-1">
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <div className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{goal.currentValue} {goal.unit}</span>
                            <span className="text-gray-400">{goal.targetValue} {goal.unit} · {pct}%</span>
                          </div>
                          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            step="any"
                            placeholder={String(goal.currentValue)}
                            value={progressValues[goal.id] ?? ""}
                            onChange={(e) => setProgressValues((p) => ({ ...p, [goal.id]: e.target.value }))}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                          />
                          <span className="text-sm text-gray-400">{goal.unit}</span>
                          <Button
                            size="sm"
                            onClick={() => updateProgress(goal)}
                            disabled={updatingId === goal.id}
                          >
                            {updatingId === goal.id ? "..." : "Update"}
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Completed</h2>
              <div className="space-y-2">
                {completed.map((goal) => (
                  <Card key={goal.id} className="opacity-70">
                    <CardBody className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <div>
                          <p className="font-medium text-gray-700 text-sm">{goal.title}</p>
                          {goal.completedAt && (
                            <p className="text-xs text-gray-400">Completed {formatDate(goal.completedAt)}</p>
                          )}
                        </div>
                      </div>
                      <button onClick={() => deleteGoal(goal.id)} className="text-gray-300 hover:text-red-500 p-1">
                        <Trash2 size={15} />
                      </button>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
