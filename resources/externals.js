const app =  Elm.Main.fullscreen();

app.ports.getSvgData.subscribe(function(){
  app.ports.getSvgDataFromJs.send(`{{svg}}`);
});

app.ports.sendSvgData.subscribe(function(svgData) {
  const name = "svgeditor.reflectToEditor";
  const args = [svgData];
  window.parent.postMessage(
    {
      command: "did-click-link",
      data: `command:${name}?${encodeURIComponent(JSON.stringify(args))}`
    },
    "file://"
  );
});

app.ports.getBoundingClientRect.subscribe(function(id){
  const elem = document.getElementById(id);
  app.ports.getBoundingClientRectFromJs.send(elem.getBoundingClientRect());
});

app.ports.getStyle.subscribe(function(id){
  const elem = document.getElementById(id);
  if (elem == null) {
    app.ports.getStyleFromJs.send(null);
  } else {
    app.ports.getStyleFromJs.send(window.getComputedStyle(elem));
  }
});

app.ports.encodeURIComponent.subscribe(function(str){
  const encoded = encodeURIComponent(str);
  app.ports.encodeURIComponentFromJs.send(encoded);
});

document.addEventListener("mousedown", mouseEvent => {
  if (mouseEvent.button === 0) {
    app.ports.getMouseDownLeftFromJs.send([mouseEvent.clientX, mouseEvent.clientY]);
  }
  if (mouseEvent.button === 2) {
    app.ports.getMouseDownRightFromJs.send([mouseEvent.clientX, mouseEvent.clientY]);
  }
});

document.addEventListener("mouseup", mouseEvent => {
  app.ports.getMouseUpFromJs.send([mouseEvent.clientX, mouseEvent.clientY]);
});
document.addEventListener("mousemove", mouseEvent => {
  app.ports.getMouseMoveFromJs.send([mouseEvent.clientX, mouseEvent.clientY]);
});