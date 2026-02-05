// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function u(e,{time:r,sequenceNumber:c,level:l=0,name:n="",zone:s,error:t,stackTrace:o}={}){const i=`[${r?new Date(r).toLocaleTimeString():new Date().toLocaleTimeString()}] ${n?n+": ":""}`;t?(console.error(i+e,t),o&&console.error(o)):console.log(i+e)}function g(e){return console.dir(e),e}function a({message:e,when:r=!0}={}){if(r){e&&console.log(`Debugger triggered: ${e}`);debugger;return!0}return!1}class p{static startSync(r,{arguments:c}={}){typeof performance<"u"&&performance.mark(r)}static finishSync(){}}export{p as Timeline,a as debugger_,g as inspect,u as log};
//# sourceMappingURL=index.js.map
