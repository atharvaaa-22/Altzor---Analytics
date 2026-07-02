import { useState } from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { ConnectionCard, AddConnectionModal } from '../features/connections/components';
import { useConnections } from '../features/connections/hooks/useConnections';

export function ConnectionsPage() {
  const { connections, isLoading } = useConnections();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full h-full flex flex-col relative">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Data Connections</h1>
          <p className="text-slate-400">Manage your live database and warehouse connections.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20"
        >
          <Plus size={20} />
          New Connection
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="text-slate-500">Loading connections...</div>
        ) : connections.length === 0 ? (
          <div className="text-center py-16 border border-slate-800 rounded-2xl bg-slate-900/30">
            <h3 className="text-lg font-medium text-slate-300 mb-2">No connections found</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
              Connect to your external data sources to begin modeling your Semantic Layer.
            </p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Add your first connection &rarr;
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connections.map((conn, i) => (
              <motion.div
                key={conn.id}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <ConnectionCard connection={conn} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AddConnectionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
