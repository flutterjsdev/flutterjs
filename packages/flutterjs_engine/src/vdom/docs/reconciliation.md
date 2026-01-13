# Reconciliation & Diffing

The reconciliation process determines how to update the DOM efficiently when the widget tree changes.

## The Diffing Algorithm (`vnode_differ.js`)

We use a heuristic O(n) algorithm similar to React's.

1.  **Type Check**: If `tags` are different (e.g., `div` -> `span`), destroy the old tree and build a new one.
2.  **Prop Diff**: If tags match, diff `props`, `style`, and `events`.
3.  **Child Diff**: Recursively diff children.

### Patch Types

The differ generates a linear list of operations called `Patches`.

| Patch Type | Description |
| types | description |
| `CREATE` | Create a new node and insert it. |
| `REMOVE` | Remove an existing node. |
| `REPLACE` | Replace one node with another (different tag). |
| `UPDATE_PROPS` | Update HTML attributes (e.g., `id`, `class`). |
| `UPDATE_STYLE` | Update CSS styles (e.g., `color`, `display`). |
| `UPDATE_TEXT` | Update text content. |
| `UPDATE_EVENTS`| Update event listeners (detach old, attach new). |
| `REORDER` | Move existing children to new positions. |

## Keyed Reconciliation

When children are arrays (lists), we use `key` props to track identity.

```javascript
// Without keys: O(n) replacement if order changes
[A, B, C] -> [C, A, B] // Replaces A with C, B with A, C with B

// With keys: O(n) reorder
[A(key=1), B(key=2)] -> [B(key=2), A(key=1)] // Moves nodes
```

## Patch Application (`patch_applier.js`)

The patch applier executes updates in a specific safety order:
1.  **REMOVE**: Delete nodes first to clear space and avoid index collisions.
2.  **CREATE**: Add new nodes.
3.  **UPDATES**: Apply property/style/text changes.

This ensures that indices (like `0.1`) remain valid during the patching process.
