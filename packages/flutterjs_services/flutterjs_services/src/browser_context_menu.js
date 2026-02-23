// Flutter services/browser_context_menu.dart → JS

export class BrowserContextMenu {
  static async enableContextMenu() {
    // Re-enable browser context menu (allow right-click)
    document.removeEventListener('contextmenu', BrowserContextMenu._prevent);
  }
  static async disableContextMenu() {
    document.addEventListener('contextmenu', BrowserContextMenu._prevent);
  }
  static _prevent(e) { e.preventDefault(); }
}
