import type React from 'react';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Database, Server, Hexagon, Cloud, HardDrive, ArrowLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ConnectionType } from '../types';
import { PostgresForm } from './forms/PostgresForm';
import { SnowflakeForm } from './forms/SnowflakeForm';
import { BigQueryForm } from './forms/BigQueryForm';
import { Modal } from '../../../components/ui/Modal';

interface ConnectionTypeDefinition {
  id: ConnectionType;
  name: string;
  icon: LucideIcon;
  description: string;
}

const CONNECTION_TYPES: ConnectionTypeDefinition[] = [
  {
    id: 'postgres',
    name: 'PostgreSQL',
    icon: Database,
    description: 'Connect to Postgres or compatible databases',
  },
  { id: 'mysql', name: 'MySQL', icon: Server, description: 'MySQL and MariaDB databases' },
  {
    id: 'sqlserver',
    name: 'SQL Server',
    icon: HardDrive,
    description: 'Microsoft SQL Server (MSSQL)',
  },
  {
    id: 'snowflake',
    name: 'Snowflake',
    icon: Hexagon,
    description: 'Snowflake cloud data warehouse',
  },
  {
    id: 'bigquery',
    name: 'BigQuery',
    icon: Cloud,
    description: 'Google BigQuery analytics warehouse',
  },
];

export function AddConnectionModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<ConnectionType | null>(null);

  const handleSelectType = (type: ConnectionType): void => {
    setSelectedType(type);
    setStep(2);
  };

  const handleClose = (): void => {
    setStep(1);
    setSelectedType(null);
    onClose();
  };

  const selectedDef = CONNECTION_TYPES.find((t) => t.id === selectedType);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 1 ? 'Add Data Connection' : `Connect to ${selectedDef?.name}`}
      subtitle={
        step === 1 ? 'Choose your data source type to get started.' : selectedDef?.description
      }
      size="lg"
    >
      <div className="p-6">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-2 sm:grid-cols-3 gap-3"
            >
              {CONNECTION_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => handleSelectType(type.id)}
                    className="flex flex-col items-center justify-center p-5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all gap-3 group text-left"
                  >
                    <Icon className="w-9 h-9 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700">
                      {type.name}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
            >
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5 transition-colors"
              >
                <ArrowLeft size={15} /> Back to connection types
              </button>
              {selectedType === 'postgres' ||
              selectedType === 'mysql' ||
              selectedType === 'sqlserver' ? (
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
    </Modal>
  );
}
