import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dumbbell, Target, Utensils, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

type FitnessGoalType = "lose_weight" | "build_muscle" | "improve_cardio" | "general_fitness";

interface WizardState {
  fitnessGoal: FitnessGoalType | null;
  currentWeight: string;
  targetWeight: string;
  calorieBudget: string;
  customGoalTitle: string;
  customGoalTarget: string;
  customGoalUnit: string;
}

const goalOptions: { value: FitnessGoalType; label: string; description: string; icon: string }[] = [
  { value: "lose_weight", label: "Lose weight", description: "Reduce body weight through diet and cardio", icon: "🏃" },
  { value: "build_muscle", label: "Build muscle", description: "Gain strength and increase muscle mass", icon: "💪" },
  { value: "improve_cardio", label: "Improve cardio", description: "Run longer, breathe easier, boost endurance", icon: "❤️" },
  { value: "general_fitness", label: "General fitness", description: "Stay active and maintain a healthy lifestyle", icon: "⚡" },
];

const defaultCalories: Record<FitnessGoalType, string> = {
  lose_weight: "1800",
  build_muscle: "2500",
  improve_cardio: "2200",
  general_fitness: "2000",
};

export function Onboarding() {
  const { user, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<WizardState>({
    fitnessGoal: null,
    currentWeight: "",
    targetWeight: "",
    calorieBudget: "2000",
    customGoalTitle: "",
    customGoalTarget: "",
    customGoalUnit: "",
  });

  const update = (patch: Partial<WizardState>) => setState((s) => ({ ...s, ...patch }));

  const totalSteps = 4;

  const handleGoalSelect = (goal: FitnessGoalType) => {
    update({
      fitnessGoal: goal,
      calorieBudget: defaultCalories[goal],
    });
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const goalsToCreate: { title: string; type: string; targetValue: number; currentValue: number; unit: string }[] = [];

      if (state.fitnessGoal === "lose_weight" && state.targetWeight) {
        goalsToCreate.push({
          title: "Reach target weight",
          type: "weight",
          targetValue: parseFloat(state.targetWeight),
          currentValue: state.currentWeight ? parseFloat(state.currentWeight) : 0,
          unit: "kg",
        });
      } else if (state.fitnessGoal === "build_muscle") {
        goalsToCreate.push({
          title: "Track muscle-building progress",
          type: "strength",
          targetValue: 10,
          currentValue: 0,
          unit: "workouts/month",
        });
      } else if (state.fitnessGoal === "improve_cardio") {
        goalsToCreate.push({
          title: "Run 5km without stopping",
          type: "cardio",
          targetValue: 5,
          currentValue: 0,
          unit: "km",
        });
      } else if (state.fitnessGoal === "general_fitness") {
        goalsToCreate.push({
          title: "Work out consistently",
          type: "habit",
          targetValue: 12,
          currentValue: 0,
          unit: "workouts/month",
        });
      }

      if (state.customGoalTitle && state.customGoalTarget) {
        goalsToCreate.push({
          title: state.customGoalTitle,
          type: "strength",
          targetValue: parseFloat(state.customGoalTarget),
          currentValue: 0,
          unit: state.customGoalUnit || "units",
        });
      }

      // A first goal is required to finish onboarding.
      if (goalsToCreate.length === 0) {
        alert("Please pick a goal before continuing.");
        setStep(1);
        setSaving(false);
        return;
      }

      await Promise.all(goalsToCreate.map((g) => api.post("/goals", g)));

      await completeOnboarding();
      navigate("/");
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return state.fitnessGoal !== null;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>Step {step + 1} of {totalSteps}</span>
            <span>{Math.round(((step + 1) / totalSteps) * 100)}% complete</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Dumbbell size={28} className="text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome, {user?.name?.split(" ")[0]}!
              </h1>
              <p className="text-gray-500 mb-6">
                Let's take 60 seconds to set up your FitTrack profile so we can tailor the experience to your goals.
              </p>
              <div className="grid grid-cols-3 gap-4 mb-8 text-center">
                {[
                  { icon: <Dumbbell size={20} className="text-emerald-600" />, label: "Log workouts" },
                  { icon: <Target size={20} className="text-emerald-600" />, label: "Track goals" },
                  { icon: <Utensils size={20} className="text-emerald-600" />, label: "Monitor food" },
                ].map((f) => (
                  <div key={f.label} className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex justify-center mb-1">{f.icon}</div>
                    <p className="text-xs text-gray-600 font-medium">{f.label}</p>
                  </div>
                ))}
              </div>
              <Button size="lg" className="w-full" onClick={() => setStep(1)}>
                Get started <ChevronRight size={16} />
              </Button>
            </div>
          )}

          {/* Step 1: Fitness goal */}
          {step === 1 && (
            <div className="p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-1">What's your main goal?</h2>
              <p className="text-gray-500 text-sm mb-6">We'll set up your first goal and calorie target based on this.</p>
              <div className="space-y-3 mb-8">
                {goalOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleGoalSelect(opt.value)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                      state.fitnessGoal === opt.value
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{opt.label}</p>
                      <p className="text-sm text-gray-500">{opt.description}</p>
                    </div>
                    {state.fitnessGoal === opt.value && (
                      <CheckCircle2 size={20} className="text-emerald-500 ml-auto shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(0)}>
                  <ChevronLeft size={16} /> Back
                </Button>
                <Button className="flex-1" disabled={!canProceed()} onClick={() => setStep(2)}>
                  Continue <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Stats & targets */}
          {step === 2 && (
            <div className="p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Your details</h2>
              <p className="text-gray-500 text-sm mb-6">All fields are optional — you can update these later.</p>
              <div className="space-y-4 mb-8">
                {state.fitnessGoal === "lose_weight" && (
                  <>
                    <Input
                      label="Current weight (kg)"
                      type="number"
                      placeholder="e.g. 85"
                      value={state.currentWeight}
                      onChange={(e) => update({ currentWeight: e.target.value })}
                    />
                    <Input
                      label="Target weight (kg)"
                      type="number"
                      placeholder="e.g. 75"
                      value={state.targetWeight}
                      onChange={(e) => update({ targetWeight: e.target.value })}
                    />
                  </>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Daily calorie target
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1200}
                      max={4000}
                      step={50}
                      value={state.calorieBudget}
                      onChange={(e) => update({ calorieBudget: e.target.value })}
                      className="flex-1 accent-emerald-600"
                    />
                    <span className="text-sm font-bold text-emerald-700 w-20 text-right">
                      {parseInt(state.calorieBudget).toLocaleString()} kcal
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Suggested for your goal: {defaultCalories[state.fitnessGoal!]} kcal
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  <ChevronLeft size={16} /> Back
                </Button>
                <Button className="flex-1" onClick={() => setStep(3)}>
                  Continue <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Custom goal (optional) + finish */}
          {step === 3 && (
            <div className="p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Any specific milestone?</h2>
              <p className="text-gray-500 text-sm mb-6">
                Add a personal target like "Bench press 100kg" or "Run 10km". Skip if you want to add goals later.
              </p>
              <div className="space-y-4 mb-8">
                <Input
                  label="Goal title (optional)"
                  placeholder='e.g. "Bench press 100kg"'
                  value={state.customGoalTitle}
                  onChange={(e) => update({ customGoalTitle: e.target.value })}
                />
                {state.customGoalTitle && (
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Target value"
                      type="number"
                      placeholder="100"
                      value={state.customGoalTarget}
                      onChange={(e) => update({ customGoalTarget: e.target.value })}
                    />
                    <Input
                      label="Unit"
                      placeholder="kg, km, reps…"
                      value={state.customGoalUnit}
                      onChange={(e) => update({ customGoalUnit: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-emerald-50 rounded-xl p-4 mb-6">
                <p className="text-sm font-semibold text-emerald-800 mb-2">Your setup summary</p>
                <ul className="text-sm text-emerald-700 space-y-1">
                  <li>Goal: {goalOptions.find((g) => g.value === state.fitnessGoal)?.label}</li>
                  <li>Daily calories: {parseInt(state.calorieBudget).toLocaleString()} kcal</li>
                  {state.customGoalTitle && <li>Milestone: {state.customGoalTitle}</li>}
                </ul>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(2)}>
                  <ChevronLeft size={16} /> Back
                </Button>
                <Button className="flex-1" onClick={handleFinish} disabled={saving}>
                  {saving ? "Setting up..." : "Start tracking"} {!saving && <CheckCircle2 size={16} />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
