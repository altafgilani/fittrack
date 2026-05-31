import { type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flame, Dumbbell, Target, TrendingUp, Plus, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { useAuth } from "../contexts/AuthContext";
import { formatDate } from "../lib/utils";

interface DashboardData {
  todayCalories: { caloriesConsumed: number; caloriesBurned: number; calorieBudget: number };
  recentWorkouts: { id: string; name: string; date: string; durationMins: number | null; exercises: unknown[] }[];
  activeGoals: { id: string; title: string; targetValue: number; currentValue: number; unit: string }[];
  weeklyActivity: { date: string; hasWorkout: boolean }[];
  streak: number;
}

export function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<DashboardData>("/dashboard/summary")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
    );
  }

  const net = (data?.todayCalories.caloriesConsumed ?? 0) - (data?.todayCalories.caloriesBurned ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good {getTimeOfDay()}, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Here's your fitness overview for today.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            to="/workouts"
            className="inline-flex items-center gap-2 bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus size={16} /> Log workout
          </Link>
          <Link
            to="/goals"
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Target size={16} /> Set goal
          </Link>
          <Link
            to="/food"
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowRight size={16} /> Log food
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Flame size={20} className="text-orange-500" />}
          label="Calories consumed"
          value={data?.todayCalories.caloriesConsumed.toLocaleString() ?? "0"}
          sub={`of ${data?.todayCalories.calorieBudget.toLocaleString()} goal`}
        />
        <StatCard
          icon={<TrendingUp size={20} className="text-blue-500" />}
          label="Net calories"
          value={net.toLocaleString()}
          sub="consumed − burned"
        />
        <StatCard
          icon={<Dumbbell size={20} className="text-emerald-600" />}
          label="Streak"
          value={`${data?.streak ?? 0} days`}
          sub="in a row"
        />
        <StatCard
          icon={<Target size={20} className="text-purple-500" />}
          label="Active goals"
          value={String(data?.activeGoals.length ?? 0)}
          sub="in progress"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Weekly activity */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900 text-sm">This week</h2>
          </CardHeader>
          <CardBody>
            <div className="flex gap-2">
              {data?.weeklyActivity.map((day) => (
                <div key={day.date} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`w-full aspect-square rounded-md ${
                      day.hasWorkout ? "bg-emerald-500" : "bg-gray-100"
                    }`}
                  />
                  <span className="text-xs text-gray-400">
                    {new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1)}
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Active goals */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Active goals</h2>
            <Link to="/goals" className="text-xs text-emerald-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardBody className="space-y-4">
            {data?.activeGoals.length === 0 && (
              <p className="text-sm text-gray-400">No active goals yet.</p>
            )}
            {data?.activeGoals.map((goal) => {
              const pct = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
              return (
                <div key={goal.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{goal.title}</span>
                    <span className="text-gray-400">
                      {goal.currentValue} / {goal.targetValue} {goal.unit}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        {/* Recent workouts */}
        <Card className="md:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Recent workouts</h2>
            <Link to="/workouts" className="text-xs text-emerald-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardBody>
            {data?.recentWorkouts.length === 0 && (
              <p className="text-sm text-gray-400">No workouts logged yet.</p>
            )}
            <div className="divide-y divide-gray-50">
              {data?.recentWorkouts.map((w) => (
                <div key={w.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{w.name}</p>
                    <p className="text-xs text-gray-400">{formatDate(w.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{w.exercises.length} exercises</p>
                    {w.durationMins && (
                      <p className="text-xs text-gray-400">{w.durationMins} min</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs text-gray-500 font-medium">{label}</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </CardBody>
    </Card>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
