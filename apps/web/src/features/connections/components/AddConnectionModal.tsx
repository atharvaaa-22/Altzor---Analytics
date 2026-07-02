import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Database, Server, Hexagon, Cloud, HardDrive, ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';
import type { ConnectionType } from '../types';
import { PostgresForm } from './forms/PostgresForm';
import { SnowflakeForm } from './forms/SnowflakeForm';
import { BigQueryForm } from './forms/BigQueryForm';

const CONNECTION_TYPES: { id: ConnectionType; name: string; icon: any; color: string }[] = [
  { id: 'postgres', name: 'PostgreSQL', icon: Database, color: 'text-blue-400' },
  { id: 'mysql', name: 'MySQL', icon: Server, color: 'text-orange-400' },
  { id: 'sqlserver', name: 'SQL Server', icon: HardDrive, color: 'text-red-400' },
  { id: 'snowflake', name: 'Snowflake', icon: Hexagon, color: 'text-cyan-400' },
  { id: 'bigquery', name: 'BigQuery', icon: Cloud, color: 'text-blue-500' },
];

export function AddConnectionModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<ConnectionType | null>(null);

  const handleSelectType = (type: ConnectionType) => {
    setSelectedType(type);
    setStep(2);
  };

  const handleClose = () => {
    setStep(1);
    setSelectedType(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button onClick={() => setStep(1)} className="text-slate-400 hover:text-white transition-colors">
                <ArrowLeft size={20} />
              </button>
            )}
            <h2 className="text-xl font-bold text-white">
              {step === 1 ? 'Add Data Connection' : `Connect to ${CONNECTION_TYPES.find(t => t.id === selectedType)?.name}`}
            </h2>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-4"
              >
                {CONNECTION_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => handleSelectType(type.id)}
                      className="flex flex-col items-center justify-center p-6 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-xl transition-all gap-3 group"
                    >
                      <Icon className={clsx("w-10 h-10 transition-transform group-hover:scale-110", type.color)} />
                      <span className="text-sm font-medium text-slate-200">{type.name}</span>
                    </button>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {selectedType === 'postgres' || selectedType === 'mysql' || selectedType === 'sqlserver' ? (
                  <PostgresForm type={selectedType} onClose={handleClose} />
                ) : selectedType === 'snowflake' ? (
                  <SnowflakeForm onClose={handleClose} />
                ) : selectedType === 'bigquery' ? (
                  <BigQueryForm onClose={handleClose} />
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
