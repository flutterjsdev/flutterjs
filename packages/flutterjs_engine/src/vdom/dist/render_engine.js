import{VNodeRenderer as d}from"./vnode_renderer.js";import{SSRRenderer as h}from"./ssr_renderer.js";class u{static render(t,e=null,s={}){return this.detectEnvironment()==="server"?this.renderServer(t,s):this.renderClient(t,e,s)}static detectEnvironment(){return typeof window<"u"&&typeof window.document<"u"?"client":typeof process<"u"&&process.versions&&process.versions.node?"server":"client"}static renderServer(t,e={}){const{title:s="FlutterJS App",includeHydration:r=!0,includeCriticalCSS:i=!0,includeRuntime:n=!0,meta:a={},scripts:c=[],styles:o=[]}=e,l=h.renderVNode(t),f=r?this.generateHydrationData(t):null,p=i?this.extractCriticalCSS(t):"";return this.buildHTMLDocument({title:s,meta:a,criticalCSS:p,bodyHTML:l,hydrationData:f,scripts:c,styles:o,includeRuntime:n})}static renderClient(t,e,s={}){if(!e)throw new Error("Target element is required for client-side rendering");const{clear:r=!0,measurePerformance:i=!1}=s,n=i?performance.now():0,a=d.render(t,e,{clear:r});if(i){const c=performance.now();console.log(`Render time: ${(c-n).toFixed(2)}ms`)}return a}static buildHTMLDocument({title:t,meta:e,criticalCSS:s,bodyHTML:r,hydrationData:i,scripts:n,styles:a,includeRuntime:c}){const o=this.generateMetaTags(e),l=this.generateStyleTags(a,s),f=this.generateScriptTags(n,c),p=i?`<script id="__FLUTTERJS_HYDRATION_DATA__" type="application/json">${JSON.stringify(i)}</script>`:"";return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHTML(t)}</title>
  ${o}
  ${l}
</head>
<body>
  <div id="root">${r}</div>
  ${p}
  ${f}
</body>
</html>`}static generateMetaTags(t){const e=[];return t.description&&e.push(`<meta name="description" content="${this.escapeHTML(t.description)}">`),t.keywords&&e.push(`<meta name="keywords" content="${this.escapeHTML(t.keywords)}">`),t.author&&e.push(`<meta name="author" content="${this.escapeHTML(t.author)}">`),t.ogTitle&&e.push(`<meta property="og:title" content="${this.escapeHTML(t.ogTitle)}">`),t.ogDescription&&e.push(`<meta property="og:description" content="${this.escapeHTML(t.ogDescription)}">`),t.ogImage&&e.push(`<meta property="og:image" content="${this.escapeHTML(t.ogImage)}">`),t.twitterCard&&e.push(`<meta name="twitter:card" content="${this.escapeHTML(t.twitterCard)}">`),t.custom&&t.custom.forEach(({name:s,content:r,property:i})=>{i?e.push(`<meta property="${this.escapeHTML(i)}" content="${this.escapeHTML(r)}">`):e.push(`<meta name="${this.escapeHTML(s)}" content="${this.escapeHTML(r)}">`)}),e.join(`
  `)}static generateStyleTags(t,e){const s=[];return e&&s.push(`<style id="critical-css">${e}</style>`),t.forEach(r=>{s.push(`<link rel="stylesheet" href="${this.escapeHTML(r)}">`)}),s.push(`<style id="md-base">
:root {
  --md-sys-color-primary: #6750a4;
  --md-sys-color-on-primary: #ffffff;
  --md-sys-color-primary-container: #eaddff;
  --md-sys-color-on-primary-container: #21005e;
  --md-sys-color-surface: #fffbfe;
  --md-sys-color-on-surface: #1c1b1f;
  --md-sys-color-outline: #79747e;
  --md-sys-color-outline-variant: #cac7cf;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>`),s.join(`
  `)}static generateScriptTags(t,e){const s=[];return e&&s.push('<script src="/flutterjs-runtime.js" defer></script>'),t.forEach(r=>{s.push(`<script src="${this.escapeHTML(r)}" defer></script>`)}),s.join(`
  `)}static generateHydrationData(t){const e={version:"1.0.0",timestamp:Date.now(),widgets:[],stateBindings:[],events:[],refs:[]};return this.traverseVNode(t,(s,r)=>{s.metadata&&s.metadata.widgetType&&e.widgets.push({path:r,type:s.metadata.widgetType,props:s.metadata.flutterProps||{},key:s.key}),s.isStateBinding&&e.stateBindings.push({path:r,widgetId:s.statefulWidgetId,property:s.stateProperty}),s.events&&Object.keys(s.events).length>0&&e.events.push({path:r,events:Object.keys(s.events)}),s.ref&&e.refs.push({path:r,hasRef:!0})}),e}static traverseVNode(t,e,s="0"){!t||typeof t!="object"||!t.tag||(e(t,s),t.children&&Array.isArray(t.children)&&t.children.forEach((r,i)=>{r&&typeof r=="object"&&r.tag&&this.traverseVNode(r,e,`${s}.${i}`)}))}static extractCriticalCSS(t){const e=new Set,s=[];this.traverseVNode(t,i=>{i.props&&i.props.className&&i.props.className.split(" ").forEach(n=>{n&&e.add(n)}),i.style&&Object.keys(i.style).length>0&&s.push(i.style)});const r=[];return e.size>0&&e.forEach(i=>{i.startsWith("fjs-")&&r.push(this.getWidgetCSS(i))}),r.filter(Boolean).join(`
`)}static getWidgetCSS(t){return{"fjs-text":".fjs-text { display: inline; }","fjs-container":".fjs-container { display: block; }","fjs-column":".fjs-column { display: flex; flex-direction: column; }","fjs-row":".fjs-row { display: flex; flex-direction: row; }","fjs-center":".fjs-center { display: flex; justify-content: center; align-items: center; }","fjs-scaffold":".fjs-scaffold { min-height: 100vh; display: flex; flex-direction: column; }","fjs-app-bar":".fjs-app-bar { display: flex; align-items: center; padding: 16px; min-height: 56px; }","fjs-card":".fjs-card { border-radius: 12px; overflow: hidden; }","fjs-list-view":".fjs-list-view { overflow-y: auto; display: flex; flex-direction: column; }","fjs-grid-view":".fjs-grid-view { display: grid; gap: 16px; }"}[t]||""}static hydrate(t,e,s=null){if(this.detectEnvironment()==="server")throw new Error("Hydration can only run on the client");if(!s){const r=document.getElementById("__FLUTTERJS_HYDRATION_DATA__");if(r)try{s=JSON.parse(r.textContent)}catch(i){console.error("Failed to parse hydration data:",i)}}return e&&e.hydrate?e.hydrate(t):this.hydrateManual(t,e,s)}static hydrateManual(t,e,s){return this.matchAndHydrate(t,e),s&&s.events&&this.restoreEventListeners(t,e,s.events),s&&s.refs&&this.restoreRefs(t,e,s.refs),t}static matchAndHydrate(t,e){if(!(!t||!e||typeof e!="object")&&t.nodeType===Node.ELEMENT_NODE&&(t._vnode=e,e._element=t,e.children&&Array.isArray(e.children))){const s=Array.from(t.childNodes);let r=0;s.forEach(i=>{const n=e.children[r];n&&typeof n=="object"&&(this.matchAndHydrate(i,n),r++)})}}static restoreEventListeners(t,e,s){s.forEach(({path:r,events:i})=>{const n=this.findElementByPath(t,r);n&&e.events&&d.applyEvents(n,e.events)})}static restoreRefs(t,e,s){s.forEach(({path:r})=>{const i=this.findElementByPath(t,r);i&&e.ref&&typeof e.ref=="function"&&e.ref(i)})}static findElementByPath(t,e){const s=e.split(".").map(Number).slice(1);let r=t;for(const i of s){const n=Array.from(r.childNodes);if(i>=n.length)return null;r=n[i]}return r}static escapeHTML(t){if(!t)return"";const e={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};return String(t).replace(/[&<>"']/g,s=>e[s])}static getStats(t){const e={totalNodes:0,elementNodes:0,textNodes:0,depth:0,classes:new Set,events:0,stateBindings:0},s=(r,i=0)=>{if(e.totalNodes++,e.depth=Math.max(e.depth,i),!r||typeof r!="object"||!r.tag){e.textNodes++;return}e.elementNodes++,r.props&&r.props.className&&r.props.className.split(" ").forEach(n=>{n&&e.classes.add(n)}),r.events&&(e.events+=Object.keys(r.events).length),r.isStateBinding&&e.stateBindings++,r.children&&Array.isArray(r.children)&&r.children.forEach(n=>{s(n,i+1)})};return s(t),{...e,classes:e.classes.size}}}export{u as RenderEngine};
//# sourceMappingURL=render_engine.js.map
