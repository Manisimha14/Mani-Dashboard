/**
 * Plugin Registry for capability discovery.
 */

export interface PluginCapabilities {
  commands: boolean;
  events: boolean;
  dashboard: boolean;
  reports: boolean;
  voice: boolean;
  insights: boolean;
}

export interface AIPPlugin {
  id: string;
  name: string;
  version: string;
  capabilities: PluginCapabilities;
}

class PluginRegistryImpl {
  private plugins: Map<string, AIPPlugin> = new Map();

  constructor() {
    this.registerDefaults();
  }

  /**
   * Registers a plugin module dynamically.
   */
  public register(plugin: AIPPlugin): void {
    this.plugins.set(plugin.id, plugin);
    console.log(`[PluginRegistry] Registered: ${plugin.name} v${plugin.version}`);
  }

  /**
   * Get all registered plugins.
   */
  public getPlugins(): AIPPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Check if a specific plugin is enabled and registered.
   */
  public hasCapability(pluginId: string, capability: keyof PluginCapabilities): boolean {
    const plugin = this.plugins.get(pluginId);
    return plugin ? plugin.capabilities[capability] : false;
  }

  private registerDefaults(): void {
    this.register({
      id: 'hydration-plugin',
      name: 'Hydration Core Domain',
      version: '1.0.0',
      capabilities: {
        commands: true,
        events: true,
        dashboard: true,
        reports: true,
        voice: true,
        insights: true,
      }
    });

    this.register({
      id: 'focus-plugin',
      name: 'Focus Core Domain',
      version: '1.0.0',
      capabilities: {
        commands: true,
        events: true,
        dashboard: true,
        reports: true,
        voice: true,
        insights: true,
      }
    });
  }
}

export const pluginRegistry = new PluginRegistryImpl();
