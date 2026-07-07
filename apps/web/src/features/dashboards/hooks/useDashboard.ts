import { useQuery, type UseQueryResult } from '@tanstack/react-query';

export const useDashboard = (
  dashboardId: string,
): UseQueryResult<{ id: string; name: string }, Error> => {
  return useQuery({
    queryKey: ['dashboard', dashboardId],
    queryFn: () => {
      // Normally calls api.get(`/dashboards/${dashboardId}`)
      return { id: dashboardId, name: 'Executive Overview' };
    },
  });
};
