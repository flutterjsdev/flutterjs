/**
 * FlutterJS Service Registry
 * 
 * Dependency injection container for framework services.
 * Services are accessible to all widgets via BuildContext.
 * 
 * Service Types:
 * 1. Singleton - Single instance shared across app
 * 2. Lazy - Created on first access
 * 3. Factory - New instance each time
 * 4. Scoped - Instance per scope
 * 
 * Built-in Services:
 * - theme: Theme data and colors
 * - mediaQuery: Screen size and orientation
 * - navigator: Routing and navigation
 * - logger: Logging utility
 * - analytics: Analytics tracking
 * 
 * Usage:
 * registry.register('theme', themeService);
 * const theme = registry.get('theme');
 * 
 * registry.registerFactory('logger', () => new Logger());
 * const logger = registry.get('logger');
 */

class ServiceRegistry {
  /**
   * Create service registry
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    // Service storage
    this.services = new Map();              // name → service instance
    this.factories = new Map();             // name → factory function
    this.lazyProviders = new Map();         // name → provider function
    this.singletons = new Map();            // name → singleton instance
    this.scopedServices = new Map();        // scope → Map(name → instance)
    
    // Service metadata
    this.metadata = new Map();              // name → ServiceMetadata
    this.dependencies = new Map();          // name → dependencies[]
    
    // Configuration
    this.config = {
      enableLogging: config.enableLogging !== false,
      enableValidation: config.enableValidation !== false,
      cacheInstances: config.cacheInstances !== false,
      debugMode: config.debugMode || false,
      allowOverride: config.allowOverride !== false,
      throwOnMissing: config.throwOnMissing || false
    };
    
    // Statistics
    this.stats = {
      servicesRegistered: 0,
      servicesRetrieved: 0,
      cacheHits: 0,
      cacheMisses: 0,
      factoryCalls: 0,
      lazyProviderCalls: 0,
      errors: 0
    };
    
    // Event tracking
    this.listeners = new Map();             // eventName → callbacks[]
  }
  
  /**
   * Register service instance (singleton)
   * @param {string} name - Service name
   * @param {*} service - Service instance
   * @param {Object} options - Registration options
   * @throws {Error} If service already registered
   */
  register(name, service, options = {}) {
    // Validate
    if (!name || typeof name !== 'string') {
      throw new Error('Service name must be a non-empty string');
    }
    
    if (service === null || service === undefined) {
      throw new Error(`Cannot register null/undefined service: ${name}`);
    }
    
    // Check if already registered
    if (this.has(name) && !this.config.allowOverride) {
      throw new Error(`Service '${name}' is already registered`);
    }
    
    // Store service
    this.services.set(name, service);
    this.singletons.set(name, service);
    
    // Store metadata
    this.metadata.set(name, {
      name: name,
      type: 'singleton',
      registered: Date.now(),
      service: service.constructor.name,
      lazy: false
    });
    
    // Clear factories/lazy if overriding
    this.factories.delete(name);
    this.lazyProviders.delete(name);
    
    this.stats.servicesRegistered++;
    
    this.emit('service-registered', { name, service, type: 'singleton' });
    
    if (this.config.debugMode) {
      this.log(`Registered singleton: ${name}`);
    }
    
    return this;
  }
  
  /**
   * Register factory function
   * Creates new instance each time
   * @param {string} name - Service name
   * @param {Function} factory - Factory function
   * @param {Object} options - Registration options
   */
  registerFactory(name, factory, options = {}) {
    // Validate
    if (!name || typeof name !== 'string') {
      throw new Error('Service name must be a non-empty string');
    }
    
    if (typeof factory !== 'function') {
      throw new Error(`Factory for '${name}' must be a function`);
    }
    
    // Check if already registered
    if (this.has(name) && !this.config.allowOverride) {
      throw new Error(`Service '${name}' is already registered`);
    }
    
    // Store factory
    this.factories.set(name, factory);
    
    // Store metadata
    this.metadata.set(name, {
      name: name,
      type: 'factory',
      registered: Date.now(),
      factory: factory.name || 'anonymous',
      lazy: false
    });
    
    // Clear singleton/lazy if overriding
    this.services.delete(name);
    this.singletons.delete(name);
    this.lazyProviders.delete(name);
    
    this.stats.servicesRegistered++;
    
    this.emit('service-registered', { name, factory, type: 'factory' });
    
    if (this.config.debugMode) {
      this.log(`Registered factory: ${name}`);
    }
    
    return this;
  }
  
  /**
   * Register lazy provider
   * Creates singleton on first access
   * @param {string} name - Service name
   * @param {Function} provider - Provider function
   * @param {Object} options - Registration options
   */
  registerLazy(name, provider, options = {}) {
    // Validate
    if (!name || typeof name !== 'string') {
      throw new Error('Service name must be a non-empty string');
    }
    
    if (typeof provider !== 'function') {
      throw new Error(`Provider for '${name}' must be a function`);
    }
    
    // Check if already registered
    if (this.has(name) && !this.config.allowOverride) {
      throw new Error(`Service '${name}' is already registered`);
    }
    
    // Store lazy provider
    this.lazyProviders.set(name, provider);
    
    // Store metadata
    this.metadata.set(name, {
      name: name,
      type: 'lazy',
      registered: Date.now(),
      provider: provider.name || 'anonymous',
      lazy: true
    });
    
    // Clear singleton/factory if overriding
    this.services.delete(name);
    this.singletons.delete(name);
    this.factories.delete(name);
    
    this.stats.servicesRegistered++;
    
    this.emit('service-registered', { name, provider, type: 'lazy' });
    
    if (this.config.debugMode) {
      this.log(`Registered lazy: ${name}`);
    }
    
    return this;
  }
  
  /**
   * Register scoped service
   * Instance per scope
   * @param {string} scope - Scope identifier
   * @param {string} name - Service name
   * @param {*} service - Service instance
   */
  registerScoped(scope, name, service) {
    if (!scope || typeof scope !== 'string') {
      throw new Error('Scope must be a non-empty string');
    }
    
    if (!name || typeof name !== 'string') {
      throw new Error('Service name must be a non-empty string');
    }
    
    if (service === null || service === undefined) {
      throw new Error(`Cannot register null/undefined service: ${name}`);
    }
    
    // Get or create scope
    if (!this.scopedServices.has(scope)) {
      this.scopedServices.set(scope, new Map());
    }
    
    const scopeServices = this.scopedServices.get(scope);
    scopeServices.set(name, service);
    
    if (this.config.debugMode) {
      this.log(`Registered scoped: ${scope}/${name}`);
    }
    
    return this;
  }
  
  /**
   * Get service
   * Retrieves instance, creating if needed (lazy/factory)
   * @param {string} name - Service name
   * @param {Object} options - Retrieval options
   * @returns {*} - Service instance or null
   */
  get(name, options = {}) {
    const { scope = null, throwOnMissing = this.config.throwOnMissing } = options;
    
    // Validate
    if (!name || typeof name !== 'string') {
      throw new Error('Service name must be a non-empty string');
    }
    
    this.stats.servicesRetrieved++;
    
    try {
      // Check scoped services first
      if (scope && this.scopedServices.has(scope)) {
        const scopeServices = this.scopedServices.get(scope);
        if (scopeServices.has(name)) {
          this.stats.cacheHits++;
          if (this.config.debugMode) {
            this.log(`Got scoped service: ${scope}/${name}`);
          }
          return scopeServices.get(name);
        }
      }
      
      // Check singleton cache
      if (this.singletons.has(name)) {
        this.stats.cacheHits++;
        if (this.config.debugMode) {
          this.log(`Got singleton: ${name} (cached)`);
        }
        return this.singletons.get(name);
      }
      
      // Check services map
      if (this.services.has(name)) {
        this.stats.cacheHits++;
        if (this.config.debugMode) {
          this.log(`Got service: ${name} (cached)`);
        }
        return this.services.get(name);
      }
      
      // Try factory
      if (this.factories.has(name)) {
        this.stats.cacheMisses++;
        this.stats.factoryCalls++;
        
        const factory = this.factories.get(name);
        const instance = factory();
        
        if (this.config.debugMode) {
          this.log(`Got service: ${name} (factory)`);
        }
        
        this.emit('service-created', { name, type: 'factory', instance });
        return instance;
      }
      
      // Try lazy provider
      if (this.lazyProviders.has(name)) {
        this.stats.cacheMisses++;
        this.stats.lazyProviderCalls++;
        
        const provider = this.lazyProviders.get(name);
        const instance = provider();
        
        // Cache singleton result
        if (this.config.cacheInstances) {
          this.singletons.set(name, instance);
        }
        
        if (this.config.debugMode) {
          this.log(`Got service: ${name} (lazy)`);
        }
        
        this.emit('service-created', { name, type: 'lazy', instance });
        return instance;
      }
      
      // Not found
      this.stats.cacheMisses++;
      
      if (throwOnMissing) {
        throw new Error(`Service not registered: ${name}`);
      }
      
      if (this.config.debugMode) {
        this.log(`Service not found: ${name}`);
      }
      
      this.emit('service-not-found', { name });
      return null;
    } catch (error) {
      this.stats.errors++;
      console.error(`[ServiceRegistry] Error getting service '${name}':`, error);
      
      if (this.config.throwOnMissing) {
        throw error;
      }
      
      return null;
    }
  }
  
  /**
   * Get scoped service
   * @param {string} scope - Scope identifier
   * @param {string} name - Service name
   * @returns {*} - Service instance or null
   */
  getScoped(scope, name) {
    return this.get(name, { scope });
  }
  
  /**
   * Check if service is registered
   * @param {string} name - Service name
   * @returns {boolean}
   */
  has(name) {
    if (!name || typeof name !== 'string') {
      return false;
    }
    
    return this.services.has(name) ||
           this.factories.has(name) ||
           this.lazyProviders.has(name) ||
           this.singletons.has(name);
  }
  
  /**
   * Check if scoped service exists
   * @param {string} scope - Scope identifier
   * @param {string} name - Service name
   * @returns {boolean}
   */
  hasScoped(scope, name) {
    if (!scope || !this.scopedServices.has(scope)) {
      return false;
    }
    
    return this.scopedServices.get(scope).has(name);
  }
  
  /**
   * Unregister service
   * @param {string} name - Service name
   */
  unregister(name) {
    if (!name || typeof name !== 'string') {
      return this;
    }
    
    this.services.delete(name);
    this.factories.delete(name);
    this.lazyProviders.delete(name);
    this.singletons.delete(name);
    this.metadata.delete(name);
    this.dependencies.delete(name);
    
    this.emit('service-unregistered', { name });
    
    if (this.config.debugMode) {
      this.log(`Unregistered: ${name}`);
    }
    
    return this;
  }
  
  /**
   * Unregister scoped service
   * @param {string} scope - Scope identifier
   * @param {string} name - Service name (optional, clear whole scope)
   */
  unregisterScoped(scope, name = null) {
    if (!scope || !this.scopedServices.has(scope)) {
      return this;
    }
    
    if (name) {
      this.scopedServices.get(scope).delete(name);
    } else {
      this.scopedServices.delete(scope);
    }
    
    return this;
  }
  
  /**
   * Set service dependency
   * For tracking dependencies
   * @param {string} name - Service name
   * @param {string[]} deps - Service names it depends on
   */
  setDependencies(name, deps = []) {
    if (!name || typeof name !== 'string') {
      throw new Error('Service name required');
    }
    
    this.dependencies.set(name, Array.isArray(deps) ? deps : []);
    return this;
  }
  
  /**
   * Get service dependencies
   * @param {string} name - Service name
   * @returns {string[]}
   */
  getDependencies(name) {
    return this.dependencies.get(name) || [];
  }
  
  /**
   * Get all registered service names
   * @returns {string[]}
   */
  getNames() {
    const names = new Set();
    
    this.services.forEach((_, name) => names.add(name));
    this.factories.forEach((_, name) => names.add(name));
    this.lazyProviders.forEach((_, name) => names.add(name));
    
    return Array.from(names);
  }
  
  /**
   * Get service metadata
   * @param {string} name - Service name
   * @returns {Object|null}
   */
  getMetadata(name) {
    return this.metadata.get(name) || null;
  }
  
  /**
   * Get all metadata
   * @returns {Object}
   */
  getAllMetadata() {
    const all = {};
    
    this.metadata.forEach((meta, name) => {
      all[name] = meta;
    });
    
    return all;
  }
  
  /**
   * Clear all scoped services for scope
   * @param {string} scope - Scope identifier
   */
  clearScope(scope) {
    this.scopedServices.delete(scope);
    
    if (this.config.debugMode) {
      this.log(`Cleared scope: ${scope}`);
    }
    
    return this;
  }
  
  /**
   * Clear all scopes
   */
  clearAllScopes() {
    this.scopedServices.clear();
    
    if (this.config.debugMode) {
      this.log('Cleared all scopes');
    }
    
    return this;
  }
  
  /**
   * Listen to registry events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  on(event, callback) {
    if (!event || typeof callback !== 'function') {
      return this;
    }
    
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    this.listeners.get(event).push(callback);
    return this;
  }
  
  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  off(event, callback) {
    if (!event || !this.listeners.has(event)) {
      return this;
    }
    
    const listeners = this.listeners.get(event);
    const index = listeners.indexOf(callback);
    
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    
    return this;
  }
  
  /**
   * Emit event
   * @private
   */
  emit(event, data) {
    if (!this.listeners.has(event)) {
      return;
    }
    
    const listeners = this.listeners.get(event);
    
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[ServiceRegistry] Event listener error for '${event}':`, error);
      }
    });
  }
  
  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      totalRegistered: this.getNames().length,
      singletons: this.singletons.size,
      factories: this.factories.size,
      lazyProviders: this.lazyProviders.size,
      scopes: this.scopedServices.size,
      hitRate: this.stats.servicesRetrieved > 0
        ? (this.stats.cacheHits / this.stats.servicesRetrieved * 100).toFixed(2)
        : '0.00'
    };
  }
  
  /**
   * Get detailed report
   * @returns {Object}
   */
  getDetailedReport() {
    return {
      stats: this.getStats(),
      services: this.getNames(),
      metadata: this.getAllMetadata(),
      scopes: Array.from(this.scopedServices.keys()),
      config: this.config,
      timestamp: Date.now()
    };
  }
  
  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      servicesRegistered: 0,
      servicesRetrieved: 0,
      cacheHits: 0,
      cacheMisses: 0,
      factoryCalls: 0,
      lazyProviderCalls: 0,
      errors: 0
    };
    
    return this;
  }
  
  /**
   * Clear all services
   */
  clear() {
    this.services.clear();
    this.factories.clear();
    this.lazyProviders.clear();
    this.singletons.clear();
    this.metadata.clear();
    this.dependencies.clear();
    this.clearAllScopes();
    this.listeners.clear();
    
    if (this.config.debugMode) {
      this.log('Registry cleared');
    }
    
    return this;
  }
  
  /**
   * Dispose registry
   */
  dispose() {
    this.clear();
    this.listeners.clear();
    
    if (this.config.debugMode) {
      this.log('Registry disposed');
    }
  }
  
  /**
   * Logging helper
   * @private
   */
  log(message) {
    if (this.config.enableLogging) {
      console.log(`[ServiceRegistry] ${message}`);
    }
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ServiceRegistry };
}
export {ServiceRegistry};
