class b{constructor({thumbColor:t,trackColor:i,trackBorderColor:r,thickness:s=8,minThumbLength:o=18,radius:n=4,mainAxisMargin:h=0,crossAxisMargin:e=0,hoverThickness:a=12,isAlwaysShown:c=!1,interactive:l=!0,showTrackOnHover:u=!1}={}){this.thumbColor=t,this.trackColor=i,this.trackBorderColor=r,this.thickness=s,this.minThumbLength=o,this.radius=n,this.mainAxisMargin=h,this.crossAxisMargin=e,this.hoverThickness=a,this.isAlwaysShown=c,this.interactive=l,this.showTrackOnHover=u}getThumbStyle(t={}){return{width:`${this.thickness}px`,height:`${this.minThumbLength}px`,backgroundColor:this.thumbColor||t.outline+"80"||"#79747E80",borderRadius:`${this.radius}px`,transition:"all 0.3s ease",cursor:this.interactive?"pointer":"default"}}getThumbHoverStyle(t={}){return{...this.getThumbStyle(t),width:`${this.hoverThickness}px`,backgroundColor:this.thumbColor||t.outline+"CC"||"#79747ECC"}}getTrackStyle(t={}){return{width:`${this.thickness}px`,backgroundColor:this.trackColor||"transparent",borderRadius:`${this.radius}px`,border:this.trackBorderColor?`1px solid ${this.trackBorderColor}`:"none"}}getVerticalScrollbarStyle(){return{position:"absolute",right:`${this.crossAxisMargin}px`,top:`${this.mainAxisMargin}px`,bottom:`${this.mainAxisMargin}px`,width:`${this.thickness}px`,opacity:this.isAlwaysShown?1:0,transition:this.isAlwaysShown?"none":"opacity 0.3s ease"}}getHorizontalScrollbarStyle(){return{position:"absolute",bottom:`${this.crossAxisMargin}px`,left:`${this.mainAxisMargin}px`,right:`${this.mainAxisMargin}px`,height:`${this.thickness}px`,opacity:this.isAlwaysShown?1:0,transition:this.isAlwaysShown?"none":"opacity 0.3s ease"}}getHoverContainerStyle(){return{opacity:1}}getScrollableStyle(t="vertical",i={}){return t==="vertical"?{...this.getVerticalScrollbarStyle(),...this.getTrackStyle(i)}:{...this.getHorizontalScrollbarStyle(),...this.getTrackStyle(i)}}toWebkitCSS(t={}){const i=this.thumbColor||t.outline+"80"||"#79747E80",r=this.thumbColor||t.outline+"CC"||"#79747ECC",s=this.radius;return`
      ::-webkit-scrollbar {
        width: ${this.thickness}px;
        height: ${this.thickness}px;
      }
      
      ::-webkit-scrollbar-track {
        background: ${this.trackColor||"transparent"};
        border-radius: ${s}px;
      }
      
      ::-webkit-scrollbar-thumb {
        background: ${i};
        border-radius: ${s}px;
        border: 2px solid transparent;
        background-clip: content-box;
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background: ${r};
        background-clip: content-box;
      }
    `}toFirefoxCSS(t={}){return`
      * {
        scrollbar-color: ${this.thumbColor||t.outline+"80"||"#79747E80"} ${this.trackColor||"transparent"};
        scrollbar-width: ${this.thickness===8?"thin":"auto"};
      }
    `}copyWith({thumbColor:t,trackColor:i,trackBorderColor:r,thickness:s,minThumbLength:o,radius:n,mainAxisMargin:h,crossAxisMargin:e,hoverThickness:a,isAlwaysShown:c,interactive:l,showTrackOnHover:u}={}){return new b({thumbColor:t??this.thumbColor,trackColor:i??this.trackColor,trackBorderColor:r??this.trackBorderColor,thickness:s??this.thickness,minThumbLength:o??this.minThumbLength,radius:n??this.radius,mainAxisMargin:h??this.mainAxisMargin,crossAxisMargin:e??this.crossAxisMargin,hoverThickness:a??this.hoverThickness,isAlwaysShown:c??this.isAlwaysShown,interactive:l??this.interactive,showTrackOnHover:u??this.showTrackOnHover})}merge(t){return t?this.copyWith({thumbColor:t.thumbColor,trackColor:t.trackColor,trackBorderColor:t.trackBorderColor,thickness:t.thickness,minThumbLength:t.minThumbLength,radius:t.radius,mainAxisMargin:t.mainAxisMargin,crossAxisMargin:t.crossAxisMargin,hoverThickness:t.hoverThickness,isAlwaysShown:t.isAlwaysShown,interactive:t.interactive,showTrackOnHover:t.showTrackOnHover}):this}toString(){return`ScrollbarTheme(thickness: ${this.thickness}px, radius: ${this.radius}px)`}}export{b as ScrollbarTheme};
//# sourceMappingURL=scrollbar_theme.js.map
