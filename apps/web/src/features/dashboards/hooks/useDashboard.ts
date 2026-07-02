import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';

export const useDashboard = (dashboardId: string) => {
  return useQuery({
    queryKey: ['dashboard', dashboardId],
    queryFn: async () => {
      // Normally calls api.get(`/dashboards/${dashboardId}`)
      return { id: dashboardId, name: 'Executive Overview' };
    },
  });
};
