import type React from 'react';
import { useState } from 'react';
import { Plus, Database } from 'lucide-react';
import { motion } from 'framer-motion';
import { ConnectionCard, AddConnectionModal } from '../features/connections/components';
import { useConnections } from '../features/connections/hooks/useConnections';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';

export function ConnectionsPage(): React.JSX.Element {
  const { connections, isLoading } = useConnections();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Connections</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your live database and warehouse connections.
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
          New Connection
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size={24} />
        </div>
      ) : connections.length === 0 ? (
        <EmptyState
          icon={<Database size={28} />}
          title="No connections yet"
          description="Connect to your external data sources to begin querying with Altzor AI."
          action={{ label: 'Add Connection', onClick: () => setIsModalOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {connections.map((conn, i) => (
            <motion.div
              key={conn.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
            >
              <ConnectionCard connection={conn} />
            </motion.div>
          ))}
        </div>
      )}

      <AddConnectionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
