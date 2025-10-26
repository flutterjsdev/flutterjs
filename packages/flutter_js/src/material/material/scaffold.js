// src/widgets/material/scaffold.js
export function Scaffold({ appBar, body, floatingActionButton }) {
  return {
    type: 'scaffold',
    props: { appBar, body, floatingActionButton },
    render() {
      const container = document.createElement('div');
      container.className = 'flutter-scaffold';
      
      if (appBar) {
        container.appendChild(appBar.render());
      }
      
      const bodyContainer = document.createElement('main');
      bodyContainer.className = 'flutter-scaffold-body';
      bodyContainer.appendChild(body.render());
      container.appendChild(bodyContainer);
      
      if (floatingActionButton) {
        const fab = floatingActionButton.render();
        fab.className += ' flutter-fab';
        container.appendChild(fab);
      }
      
      return container;
    }
  };
}

// src/widgets/layout/center.js
export function Center({ child }) {
  return {
    type: 'center',
    props: { child },
    render() {
      const div = document.createElement('div');
      div.className = 'flutter-center';
      div.style.display = 'flex';
      div.style.justifyContent = 'center';
      div.style.alignItems = 'center';
      div.appendChild(child.render());
      return div;
    }
  };
}

// src/widgets/material/text.js
export function Text(data, { style } = {}) {
  return {
    type: 'text',
    props: { data, style },
    render() {
      const span = document.createElement('span');
      span.className = 'flutter-text';
      span.textContent = data;
      
      if (style) {
        if (style.fontSize) span.style.fontSize = style.fontSize;
        if (style.color) span.style.color = style.color;
        if (style.fontWeight) span.style.fontWeight = style.fontWeight;
      }
      
      return span;
    }
  };
}