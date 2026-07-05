import { projectionRegistry } from '../event-store/projections';
import type { DashboardReadModel, AnalyticsReadModel } from '../event-store/projections';

export class QueryLayer {
  /**
   * Executes GetDashboardQuery. Returns projected Dashboard Read Model state.
   */
  public static getDashboardState(): DashboardReadModel {
    return projectionRegistry.getDashboardModel();
  }

  /**
   * Executes GetAnalyticsQuery. Returns projected Analytics Read Model state.
   */
  public static getAnalyticsState(): AnalyticsReadModel {
    return projectionRegistry.getAnalyticsModel();
  }
}
