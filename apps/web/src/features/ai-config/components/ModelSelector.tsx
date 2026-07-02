import { BrainCircuit, Cpu, Zap } from 'lucide-react';
import { clsx } from 'clsx';

export function ModelSelector({ model, setModel, temperature, setTemperature }: { model: string, setModel: (v: string) => void, temperature: number, setTemperature: (v: number) => void }) {
  return (
    <div className="space-y-6 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Model Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={() => setModel('gemini-1.5-pro')}
            className={clsx("p-4 rounded-xl border text-left transition-colors", model === 'gemini-1.5-pro' ? "bg-blue-600/10 border-blue-500/50" : "bg-slate-900 border-slate-700 hover:border-slate-600")}
          >
            <div className="flex items-center gap-3 mb-2">
              <BrainCircuit className={model === 'gemini-1.5-pro' ? "text-blue-400" : "text-slate-500"} size={20} />
              <span className={clsx("font-medium", model === 'gemini-1.5-pro' ? "text-white" : "text-slate-300")}>Gemini 1.5 Pro</span>
            </div>
            <p className="text-xs text-slate-500">Best for complex multi-step reasoning and massive context windows.</p>
          </button>

          <button 
            onClick={() => setModel('gemini-1.5-flash')}
            className={clsx("p-4 rounded-xl border text-left transition-colors", model === 'gemini-1.5-flash' ? "bg-emerald-600/10 border-emerald-500/50" : "bg-slate-900 border-slate-700 hover:border-slate-600")}
          >
            <div className="flex items-center gap-3 mb-2">
              <Zap className={model === 'gemini-1.5-flash' ? "text-emerald-400" : "text-slate-500"} size={20} />
              <span className={clsx("font-medium", model === 'gemini-1.5-flash' ? "text-white" : "text-slate-300")}>Gemini 1.5 Flash</span>
            </div>
            <p className="text-xs text-slate-500">Optimized for speed and high-volume, lower-latency SQL generation.</p>
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800">
        <div className="flex justify-between items-end mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-300">Temperature</label>
            <p className="text-xs text-slate-500 mt-1">Controls determinism. Lower values are more precise for SQL.</p>
          </div>
          <span className="font-mono text-sm bg-slate-800 px-2 py-1 rounded text-blue-400 font-bold">{temperature.toFixed(2)}</span>
        </div>
        <input 
          type="range" 
          min="0" max="1" step="0.05" 
          value={temperature} 
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer outline-none"
          style={{ background: `linear-gradient(to right, #3b82f6 ${temperature * 100}%, #1e293b ${temperature * 100}%)` }}
        />
        <div className="flex justify-between text-xs text-slate-500 mt-2">
          <span>0.0 (Precise)</span>
          <span>1.0 (Creative)</span>
        </div>
      </div>
    </div>
  );
}
