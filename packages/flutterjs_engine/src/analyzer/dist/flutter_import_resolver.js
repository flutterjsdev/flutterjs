import i from"fs";import l from"path";class n{constructor(e={}){this.options={projectRoot:process.cwd(),frameworkType:"flutter-js",ignoreUnresolved:!1,cacheEnabled:!1,...e},this.frameworkPackages={"@flutterjs/runtime":"file:../../../../../src/runtime","@flutterjs/vdom":"file:../../../../../src/vdom","@flutterjs/analyzer":"file:../../../../analyzer","@flutterjs:material":"file:../../../../../package/material"},this.customPackageMappings={},this.resolvedCache=new Map,this.unresolvedCache=new Map,this.localSearchPaths=["src","lib","packages","modules","."],this.results={resolved:[],unresolved:[],errors:[]}}resolve(e,t=[],a={}){const r=`${e}:${JSON.stringify(t)}`;if(this.resolvedCache.has(r))return this.resolvedCache.get(r);if(this.unresolvedCache.has(r))return this.unresolvedCache.get(r);const s={original:e,items:t,resolved:null,actualPath:null,type:null,source:null,isValid:!1,reason:null,fallbacks:[]};if(e.startsWith("@package:")){const o=this.resolveFrameworkPackage(e,t);if(o.isValid)return s.resolved=o.resolved,s.actualPath=o.actualPath,s.type="framework",s.source="framework",s.isValid=!0,s.reason="Resolved from framework mappings",this.resolvedCache.set(r,s),this.results.resolved.push(s),s;s.fallbacks.push({step:1,tried:"framework-package",found:!1,reason:o.reason})}if(!e.startsWith("@")){const o=this.resolveLocalImport(e,t);if(o.isValid)return s.resolved=o.resolved,s.actualPath=o.actualPath,s.type="local",s.source="local",s.isValid=!0,s.reason=`Found in local project at ${o.actualPath}`,this.resolvedCache.set(r,s),this.results.resolved.push(s),s;s.fallbacks.push({step:2,tried:"local-code",locations:o.searchedLocations,found:!1,reason:o.reason})}if(this.options.cacheEnabled){const o=this.resolveFromCache(e,t);if(o.isValid)return s.resolved=o.resolved,s.actualPath=o.actualPath,s.type="cache",s.source="cache",s.isValid=!0,s.reason=`Found in package cache at ${o.actualPath}`,this.resolvedCache.set(r,s),this.results.resolved.push(s),s;s.fallbacks.push({step:3,tried:"package-cache",found:!1,reason:o.reason})}return s.isValid=!1,s.source="error",s.reason=this.generateErrorMessage(e,s.fallbacks),this.options.ignoreUnresolved||this.results.errors.push(s),this.unresolvedCache.set(r,s),this.results.unresolved.push(s),s}resolveFrameworkPackage(e,t){return this.frameworkPackages[e]?{isValid:!0,resolved:this.frameworkPackages[e],actualPath:this.frameworkPackages[e],reason:"Found in framework package mappings"}:this.customPackageMappings[e]?{isValid:!0,resolved:this.customPackageMappings[e],actualPath:this.customPackageMappings[e],reason:"Found in custom package mappings"}:{isValid:!1,reason:`Framework package "${e}" not found in mappings`}}resolveLocalImport(e,t){const a=[];if(e.startsWith("./")||e.startsWith("../")){const r=l.resolve(this.options.projectRoot,e);return a.push(r),this.fileExists(r)?{isValid:!0,resolved:e,actualPath:r,reason:"Relative import found"}:this.fileExists(`${r}.js`)?{isValid:!0,resolved:e,actualPath:`${r}.js`,reason:"Relative import found (with .js)"}:{isValid:!1,searchedLocations:a,reason:`Relative import not found: ${e}`}}for(const r of this.localSearchPaths){const s=l.resolve(this.options.projectRoot,r,e);a.push(s);const o=l.join(s,"index.js");if(this.fileExists(o))return{isValid:!0,resolved:e,actualPath:o,reason:`Found in ${r}/${e}/index.js`};if(this.fileExists(`${s}.js`))return{isValid:!0,resolved:e,actualPath:`${s}.js`,reason:`Found in ${r}/${e}.js`};if(this.fileExists(`${s}.fjs`))return{isValid:!0,resolved:e,actualPath:`${s}.fjs`,reason:`Found in ${r}/${e}.fjs`}}return{isValid:!1,searchedLocations:a,reason:`Local import not found in: ${this.localSearchPaths.join(", ")}`}}resolveFromCache(e,t){return{isValid:!1,reason:"Package cache resolution not yet implemented"}}fileExists(e){try{return i.existsSync(e)}catch{return!1}}generateErrorMessage(e,t){let a=`\u274C Import not found: "${e}"

Resolution chain:
`;return t.forEach(r=>{a+=`  ${r.step}. Checked ${r.tried}: NOT FOUND
`,r.locations&&(a+=`     Locations searched:
`,r.locations.forEach(s=>{a+=`       - ${s}
`})),r.reason&&(a+=`     (${r.reason})
`)}),a+=`
Suggestions:
`,a+=`  \u2022 Verify the import path is correct
`,a+=`  \u2022 Check that the file exists in your project
`,a+=`  \u2022 Add a custom package mapping if needed: addPackageMapping()
`,a}resolveImports(e){return this.results={resolved:[],unresolved:[],errors:[]},e.forEach(t=>{this.resolve(t.source,t.items)}),{imports:this.results,summary:this.getSummary()}}addPackageMapping(e,t){e.startsWith("@package:")?(this.customPackageMappings[e]=t,console.log(`\u2713 Added mapping: ${e} \u2192 ${t}`)):console.warn("\u26A0 Custom mappings should start with @package:")}addPackageMappings(e){Object.entries(e).forEach(([t,a])=>{this.addPackageMapping(t,a)})}getPackageMappings(){return{framework:this.frameworkPackages,custom:this.customPackageMappings}}setLocalSearchPaths(e){this.localSearchPaths=e,console.log(`\u2713 Set local search paths: ${e.join(", ")}`)}getSummary(){const e=this.results.resolved.length+this.results.unresolved.length,t=this.results.resolved.length,a=this.results.unresolved.length;return{total:e,resolved:t,unresolved:a,errors:this.results.errors.length,resolutionRate:e>0?(t/e*100).toFixed(2)+"%":"N/A",bySource:{framework:this.results.resolved.filter(r=>r.source==="framework").length,local:this.results.resolved.filter(r=>r.source==="local").length,cache:this.results.resolved.filter(r=>r.source==="cache").length}}}generateReport(){const e=this.getSummary();return`
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551         IMPORT RESOLUTION REPORT                           \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

\u{1F4CA} Summary
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  Total Imports:    ${e.total}
  \u2713 Resolved:       ${e.resolved} (${e.resolutionRate})
  \u2717 Unresolved:     ${e.unresolved}
  \u26A0 Errors:         ${e.errors}

\u{1F4CD} Resolution Sources
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  Framework:        ${e.bySource.framework}
  Local Code:       ${e.bySource.local}
  Package Cache:    ${e.bySource.cache}

${this.results.unresolved.length>0?`
\u26A0\uFE0F  UNRESOLVED IMPORTS
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
${this.results.unresolved.map(a=>`  \u274C ${a.original}
     Reason: ${a.reason}`).join(`
`)}
`:""}

${this.results.errors.length>0?`
\u{1F534} ERRORS
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
${this.results.errors.map(a=>`  \u2022 ${a.reason}`).join(`
`)}
`:""}
`}clearCache(){this.resolvedCache.clear(),this.unresolvedCache.clear(),console.log("\u2713 Resolution cache cleared")}}export{n as ImportResolver};
//# sourceMappingURL=flutter_import_resolver.js.map
