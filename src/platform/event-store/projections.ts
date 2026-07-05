import type { AppEvent } from './eventStore';

export interface DashboardReadModel {
  waterLoggedToday: number;
  focusSessionsToday: number;
  focusMinutesToday: number;
  lastUpdated: number;
}

export interface AnalyticsReadModel {
  weeklyWaterHistory: Record<string, number>;
  weeklyFocusMinutes: Record<string, number>;
}

class ProjectionRegistryImpl {
  private dashboardModel: DashboardReadModel = {
    waterLoggedToday: 0,
    focusSessionsToday: 0,
    focusMinutesToday: 0,
    lastUpdated: 0,
  };

  private analyticsModel: AnalyticsReadModel = {
    weeklyWaterHistory: {},
    weeklyFocusMinutes: {},
  };

  /**
   * Resets read models and projects entire event log.
   */
  public projectAll(events: AppEvent[]): void {
    // Reset models
    this.dashboardModel = {
      waterLoggedToday: 0,
      focusSessionsToday: 0,
      focusMinutesToday: 0,
      lastUpdated: Date.now(),
    };
    this.analyticsModel = {
      weeklyWaterHistory: {},
      weeklyFocusMinutes: {},
    };

    events.forEach(event => this.project(event));
  }

  /**
   * Projects a single incoming event asynchronously to update the read models.
   */
  public project(event: AppEvent): void {
    const eventDateStr = new Date(event.timestamp).toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    // Project to DashboardReadModel
    if (eventDateStr === todayStr) {
      if (event.type === 'water.logged') {
        const payload = event.payload as { amountMl?: number } || {};
        this.dashboardModel.waterLoggedToday += payload.amountMl || 0;
      } else if (event.type === 'focus.completed') {
        const payload = event.payload as { durationMinutes?: number } || {};
        this.dashboardModel.focusSessionsToday += 1;
        this.dashboardModel.focusMinutesToday += payload.durationMinutes || 0;
      }
      this.dashboardModel.lastUpdated = Date.now();
    }

    // Project to AnalyticsReadModel
    if (event.type === 'water.logged') {
      const payload = event.payload as { amountMl?: number } || {};
      if (!this.analyticsModel.weeklyWaterHistory[eventDateStr]) {
        this.analyticsModel.weeklyWaterHistory[eventDateStr] = 0;
      }
      this.analyticsModel.weeklyWaterHistory[eventDateStr] += payload.amountMl || 0;
    } else if (event.type === 'focus.completed') {
      const payload = event.payload as { durationMinutes?: number } || {};
      if (!this.analyticsModel.weeklyFocusMinutes[eventDateStr]) {
        this.analyticsModel.weeklyFocusMinutes[eventDateStr] = 0;
      }
      this.analyticsModel.weeklyFocusMinutes[eventDateStr] += payload.durationMinutes || 0;
    }
  }

  public getDashboardModel(): DashboardReadModel {
    return { ...this.dashboardModel };
  }

  public getAnalyticsModel(): AnalyticsReadModel {
    return { ...this.analyticsModel };
  }
}

export const projectionRegistry = new ProjectionRegistryImpl();
