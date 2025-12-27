class p{static render(t,e={}){return this.renderVNode(t,e)}static renderVNode(t,e={}){if(t==null)return"";if(Array.isArray(t))return t.map(i=>this.renderVNode(i,e)).join("");if(typeof t=="string"||typeof t=="number")return this.escapeHTML(String(t));if(typeof t=="boolean"||!t.tag)return"";const r=this.serializeAttributes(t),s=`<${t.tag}${r?" "+r:""}>`;if(this.isVoidTag(t.tag))return s;const a=(t.children||[]).map(i=>this.renderVNode(i,e)).join(""),n=`</${t.tag}>`;return`${s}${a}${n}`}static serializeAttributes(t){const e=[];if(t.props&&Object.entries(t.props).forEach(([r,s])=>{if(!(s==null||s===!1)){if(r==="className"){e.push(`class="${this.escapeAttribute(String(s))}"`);return}if(s===!0){e.push(r);return}e.push(`${r}="${this.escapeAttribute(String(s))}"`)}}),t.style&&typeof t.style=="object"){const r=this.serializeStyles(t.style);r&&e.push(`style="${this.escapeAttribute(r)}"`)}return t.metadata&&t.metadata.widgetType&&e.push(`data-widget-type="${this.escapeAttribute(t.metadata.widgetType)}"`),t.key!==null&&t.key!==void 0&&e.push(`data-key="${this.escapeAttribute(String(t.key))}"`),e.join(" ")}static serializeStyles(t){return Object.entries(t).filter(([r,s])=>s!=null).map(([r,s])=>`${r.replace(/([A-Z])/g,"-$1").toLowerCase()}: ${s}`).join("; ")}static isVoidTag(t){return["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"].includes(t.toLowerCase())}static escapeHTML(t){const e={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};return String(t).replace(/[&<>"']/g,r=>e[r])}static escapeAttribute(t){return this.escapeHTML(t)}static renderDocument(t,e={}){const{title:r="FlutterJS App",meta:s={},styles:a=[],scripts:n=[],lang:i="en"}=e,c=this.renderVNode(t);return`<!DOCTYPE html>
<html lang="${this.escapeAttribute(i)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHTML(r)}</title>
  ${this.renderMetaTags(s)}
  ${this.renderStyleLinks(a)}
</head>
<body>
  <div id="root">${c}</div>
  ${this.renderScriptTags(n)}
</body>
</html>`}static renderMetaTags(t){const e=[];return Object.entries(t).forEach(([r,s])=>{r.startsWith("og:")?e.push(`<meta property="${this.escapeAttribute(r)}" content="${this.escapeAttribute(s)}">`):e.push(`<meta name="${this.escapeAttribute(r)}" content="${this.escapeAttribute(s)}">`)}),e.join(`
  `)}static renderStyleLinks(t){return t.map(e=>`<link rel="stylesheet" href="${this.escapeAttribute(e)}">`).join(`
  `)}static renderScriptTags(t){return t.map(e=>`<script src="${this.escapeAttribute(e)}" defer></script>`).join(`
  `)}}export{p as SSRRenderer};
//# sourceMappingURL=ssr_renderer.js.map
