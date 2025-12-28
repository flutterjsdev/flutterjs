class t{constructor(s=0){this.ms=s}get seconds(){return this.ms/1e3}get minutes(){return this.ms/6e4}get inMilliseconds(){return this.ms}static fromMilliseconds(s){return new t(s)}static fromSeconds(s){return new t(s*1e3)}static fromMinutes(s){return new t(s*6e4)}compareTo(s){return this.ms-s.ms}toString(){return`Duration(${this.ms}ms)`}}export{t as Duration};
//# sourceMappingURL=duration.js.map
