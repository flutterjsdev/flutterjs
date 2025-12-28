class n{constructor(t=0,i=0){this.dx=t,this.dy=i}static zero(){return new n(0,0)}static infinite(){return new n(1/0,1/0)}get distance(){return Math.sqrt(this.dx*this.dx+this.dy*this.dy)}translate(t,i){return new n(this.dx+t,this.dy+i)}scale(t,i=t){return new n(this.dx*t,this.dy*i)}toString(){return`Offset(${this.dx}, ${this.dy})`}}export{n as Offset};
//# sourceMappingURL=offset.js.map
