// Flutter services/deferred_component.dart → JS

export class DeferredComponent {
  static async installDeferredComponent({ componentName }) {
    // No-op on web — deferred loading handled by JS bundler
    return;
  }
  static async uninstallDeferredComponent({ componentName }) {
    return;
  }
}
