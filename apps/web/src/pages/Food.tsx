import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Camera, UtensilsCrossed, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { api, uploadFood } from "../lib/api";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { formatDate } from "../lib/utils";

interface FoodItem {
  name: string;
  portionDescription: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface AiResult {
  items: FoodItem[];
  total: { calories: number; protein: number; carbs: number; fat: number };
  confidence: string;
  notes?: string;
}

interface FoodLog {
  id: string;
  date: string;
  mealType: string;
  photoUrl?: string;
  confirmedCalories: number;
  confirmedProtein: number;
  confirmedCarbs: number;
  confirmedFat: number;
  notes?: string;
}

type AnalysisState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "done"; photoUrl: string; analysis: AiResult; mealType: string };

export function Food() {
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysisState, setAnalysisState] = useState<AnalysisState>({ status: "idle" });
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">("lunch");

  const loadLogs = async (date: string) => {
    setLoading(true);
    try {
      const data = await api.get<FoodLog[]>(`/food?date=${date}`);
      setLogs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(selectedDate);
  }, [selectedDate]);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setAnalysisState({ status: "uploading" });
    const formData = new FormData();
    formData.append("photo", file);

    try {
      const result = await uploadFood(formData);
      setAnalysisState({ status: "done", photoUrl: result.photoUrl, analysis: result.analysis, mealType });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Analysis failed");
      setAnalysisState({ status: "idle" });
    }
  }, [mealType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
    disabled: analysisState.status === "uploading",
  });

  const confirmLog = async () => {
    if (analysisState.status !== "done") return;
    setSaving(true);
    try {
      const { analysis, photoUrl } = analysisState;
      await api.post("/food", {
        date: selectedDate,
        mealType,
        photoUrl,
        aiResult: JSON.stringify(analysis),
        confirmedCalories: analysis.total.calories,
        confirmedProtein: analysis.total.protein,
        confirmedCarbs: analysis.total.carbs,
        confirmedFat: analysis.total.fat,
      });
      setAnalysisState({ status: "idle" });
      loadLogs(selectedDate);
    } finally {
      setSaving(false);
    }
  };

  const deleteLog = async (id: string) => {
    if (!confirm("Delete this food log?")) return;
    await api.delete(`/food/${id}`);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  };

  const totals = logs.reduce(
    (acc, l) => ({
      calories: acc.calories + l.confirmedCalories,
      protein: acc.protein + l.confirmedProtein,
      carbs: acc.carbs + l.confirmedCarbs,
      fat: acc.fat + l.confirmedFat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Food & Calories</h1>
        <p className="text-sm text-gray-500 mt-1">Take a photo of your meal to log it.</p>
      </div>

      {/* Date picker */}
      <div className="flex items-center gap-3">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
        />
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value as typeof mealType)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snack">Snack</option>
        </select>
      </div>

      {/* Photo upload zone */}
      {analysisState.status === "idle" && (
        <Card>
          <CardBody>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-emerald-400"
              }`}
            >
              <input {...getInputProps()} />
              <Camera size={36} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-600">
                {isDragActive ? "Drop your photo here" : "Drop a meal photo or click to upload"}
              </p>
              <p className="text-xs text-gray-400 mt-1">Claude AI will identify food items and estimate calories</p>
            </div>
          </CardBody>
        </Card>
      )}

      {analysisState.status === "uploading" && (
        <Card>
          <CardBody className="text-center py-12">
            <Loader2 size={32} className="mx-auto mb-3 text-emerald-500 animate-spin" />
            <p className="text-sm text-gray-600 font-medium">Analyzing your meal...</p>
            <p className="text-xs text-gray-400 mt-1">Claude is identifying food items</p>
          </CardBody>
        </Card>
      )}

      {analysisState.status === "done" && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Analysis result</h2>
            <span className="text-xs text-gray-400 capitalize">Confidence: {analysisState.analysis.confidence}</span>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex gap-4">
              {analysisState.photoUrl && (
                <img
                  src={analysisState.photoUrl}
                  alt="Meal"
                  className="w-32 h-32 object-cover rounded-lg shrink-0"
                />
              )}
              <div className="space-y-2 flex-1">
                {analysisState.analysis.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.name} <span className="text-gray-400">({item.portionDescription})</span></span>
                    <span className="text-gray-500">{item.calories} cal</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 py-3 border-t border-b border-gray-100">
              <MacroStat label="Calories" value={analysisState.analysis.total.calories} unit="kcal" />
              <MacroStat label="Protein" value={analysisState.analysis.total.protein} unit="g" />
              <MacroStat label="Carbs" value={analysisState.analysis.total.carbs} unit="g" />
              <MacroStat label="Fat" value={analysisState.analysis.total.fat} unit="g" />
            </div>

            {analysisState.analysis.notes && (
              <p className="text-xs text-gray-400 italic">{analysisState.analysis.notes}</p>
            )}

            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setAnalysisState({ status: "idle" })}>Retake</Button>
              <Button onClick={confirmLog} disabled={saving}>
                <CheckCircle2 size={16} />
                {saving ? "Saving..." : "Confirm & save"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Daily summary */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900 text-sm">
              Daily totals · {formatDate(selectedDate)}
            </h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-4 gap-3 mb-6">
              <MacroStat label="Calories" value={Math.round(totals.calories)} unit="kcal" />
              <MacroStat label="Protein" value={Math.round(totals.protein)} unit="g" />
              <MacroStat label="Carbs" value={Math.round(totals.carbs)} unit="g" />
              <MacroStat label="Fat" value={Math.round(totals.fat)} unit="g" />
            </div>

            {loading ? (
              <div className="text-center text-gray-400 py-4">Loading...</div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-2 border-t border-gray-50">
                    <div className="flex items-center gap-3">
                      {log.photoUrl && (
                        <img src={log.photoUrl} alt="meal" className="w-10 h-10 rounded-lg object-cover" />
                      )}
                      {!log.photoUrl && (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <UtensilsCrossed size={16} className="text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-800 capitalize">{log.mealType}</p>
                        <p className="text-xs text-gray-400">{log.confirmedCalories} kcal</p>
                      </div>
                    </div>
                    <button onClick={() => deleteLog(log.id)} className="text-gray-300 hover:text-red-500 p-1">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {!loading && logs.length === 0 && analysisState.status === "idle" && (
        <div className="text-center py-12 text-gray-400">
          <UtensilsCrossed size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No food logged for this day yet.</p>
        </div>
      )}
    </div>
  );
}

function MacroStat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400">{unit}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
