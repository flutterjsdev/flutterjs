
const { VNodeDiffer } = require('../../packages/flutterjs_vdom/flutterjs_vdom/src/vnode_differ.js');
const { VNode } = require('../../packages/flutterjs_vdom/flutterjs_vdom/src/vnode.js');

// Mock VNode structure if VNode import fails (since we are running in node without full build)
const MockVNode = (tag, children) => ({
    tag,
    children,
    props: {},
    key: null
});

console.log("--- START VNODE DIFFER TEST ---");

// 1. Test Simple Text Diff
console.log("\n1. Testing Text Change 'Follow' -> 'Following'");
const oldVNode = MockVNode('span', ['Follow']);
const newVNode = MockVNode('span', ['Following']);

const patches = VNodeDiffer.diff(oldVNode, newVNode);

if (patches.length > 0) {
    console.log("✅ Success! Patches generated:");
    patches.forEach(p => console.log(`   Type: ${p.type}, Value: ${p.value}, Index: ${p.index}`));
} else {
    console.error("❌ FAILURE: No patches generated for text change!");
    console.log("   Old children:", oldVNode.children);
    console.log("   New children:", newVNode.children);
}

// 2. Test Array Text Diff
console.log("\n2. Testing Mixed Children");
const oldVNode2 = MockVNode('div', [MockVNode('span', ['Label']), 'Value 1']);
const newVNode2 = MockVNode('div', [MockVNode('span', ['Label']), 'Value 2']);

const patches2 = VNodeDiffer.diff(oldVNode2, newVNode2);

if (patches2.length > 0) {
    console.log("✅ Success! Patches generated for mixed children:");
    patches2.forEach(p => console.log(`   Type: ${p.type}, Value: ${p.value}, Index: ${p.index}`));
} else {
    console.error("❌ FAILURE: No patches generated for mixed children!");
}

console.log("\n--- END TEST ---");
