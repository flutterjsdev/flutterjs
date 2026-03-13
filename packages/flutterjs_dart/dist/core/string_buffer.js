class n{constructor(t=""){this._buffer=String(t)}write(t){this._buffer+=String(t??"")}writeAll(t,e=""){const f=String(e);for(let r=0;r<t.length;r++)r>0&&(this._buffer+=f),this._buffer+=String(t[r]??"")}writeln(t=""){this._buffer+=String(t??"")+`
`}writeCharCode(t){this._buffer+=String.fromCharCode(t)}clear(){this._buffer=""}toString(){return this._buffer}get length(){return this._buffer.length}get isEmpty(){return this._buffer.length===0}get isNotEmpty(){return this._buffer.length>0}}export{n as StringBuffer};
//# sourceMappingURL=string_buffer.js.map
