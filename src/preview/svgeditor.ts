//
// previewHtmlにsvgの後に挿入されるjsの元になるts
//

/// <reference path="svgutils.ts" />
/// <reference path="utils.ts" />

let editorRoot = document.getElementById("svgeditor-root");
let svgroot = editorRoot.firstElementChild;
let expandVertexesGroupId = uuid();
svgroot.insertAdjacentHTML("beforeend", `<g class="svgeditor-others" id="${expandVertexesGroupId}"></g>`);
let expandVertexesGroup = document.getElementById(expandVertexesGroupId);

type DragMode = "free" | "vertical" | "horizontal";

/**
 * 編集ノードの移動用
 */
let dragTargets: {
  target: SVGElement;
  targetFromCursor: Point;
  targetInit: Point;
  dragMode: DragMode;
  expandVertexes?: {
    target: SVGElement;
    vertexes: SVGElement[];
  }
}[] | undefined = undefined;

document.onmouseup = (ev) => {
  // 変更されたHTML（のSVG部分）をエディタに反映させる
  if (dragTargets !== undefined) {
    let args = [svgroot.outerHTML];
    window.parent.postMessage({
      command: 'did-click-link',
      data: `command:extension.reflectToEditor?${encodeURIComponent(JSON.stringify(args))}`
    }, 'file://');
  }
  dragTargets = undefined;
}

document.onmousemove = (ev) => {
  if (dragTargets !== undefined) {
    let x = ev.clientX;
    let y = ev.clientY;
    dragTargets.forEach(dragTarget => {
      let newPosition = Point.of(x, y).add(dragTarget.targetFromCursor);
      if (dragTarget.dragMode === "vertical") {
        newPosition.x = dragTarget.targetInit.x;
      } else if (dragTarget.dragMode === "horizontal") {
        newPosition.y = dragTarget.targetInit.y;
      }

      // 拡大用頂点がdragTargetなら拡大適用先があるので、それの属性をいじる
      if (dragTarget.expandVertexes) {
        let oldPosition = deform(dragTarget.target).getPosition();
        let dirs = <Direction[]>dragTarget.target.getAttribute("direction").split(" ");
        // 拡大の中心
        let center = deform(
          dragTarget.expandVertexes.vertexes.find(vertex => equals(deform(vertex).geta("direction").split(" "), dirs.map(reverse)))
        ).getPosition();
        // 拡大率ベクトル
        let scale = newPosition.sub(center).div(oldPosition.sub(center));
        if (Number.isNaN(scale.x)) scale.x = 1;
        if (Number.isNaN(scale.y)) scale.y = 1;
        deform(dragTarget.expandVertexes.target).expand(center, scale);

        // 拡大用頂点すべてを移動
        deform(dragTarget.expandVertexes.target).setExpandVertexes(expandVertexesGroup, dragTarget.expandVertexes.vertexes);
      }

      deform(dragTarget.target).setPosition(newPosition);
    });
  }
}

const moveElems: SVGElement[] = [];

// 前処理として circle をすべて ellipse にする
let circles = document.getElementsByTagName("circle");
for (let i = 0; i < circles.length; i++) {
  circles.item(i).outerHTML = circles.item(i).outerHTML.replace("circle", "ellipse");
}
let ellipses = document.getElementsByTagName("ellipse");
for (let i = 0; i < ellipses.length; i++) {
  let ellipse = ellipses.item(i);
  if (ellipse.hasAttribute("r")) {
    ellipse.setAttribute("rx", ellipse.getAttribute("r"));
    ellipse.setAttribute("ry", ellipse.getAttribute("r"));
    ellipse.removeAttribute("r");
  }
}

traverse(svgroot, node => {
  // svgrootは除く
  if (node instanceof SVGElement && node.tagName !== "svg") {
    moveElems.push(node);
  }
});

moveElems.forEach((moveElem, i) => {
  moveElem.onmousedown = (ev: MouseEvent) => {
    // イベント伝搬の終了
    ev.stopPropagation();
    // 既存の拡大用頂点を消す
    let vertexes = document.getElementsByClassName("svgeditor-vertex");
    while (vertexes.length !== 0) {
      vertexes.item(0).remove();
    }

    let mainTarget = moveElem;
    // 拡大用頂点を出す
    let ids = deform(mainTarget).setExpandVertexes(expandVertexesGroup);
    let targets: SVGElement[] = [mainTarget];
    let expandVertexes = ids.map(id => <SVGElement><any>document.getElementById(id));
    for (let vertex of expandVertexes) {
      targets.push(vertex);
      // 拡大用頂点のクリック時のdragTargets登録
      vertex.onmousedown = (ev: MouseEvent) => {
        // イベント伝搬の終了
        ev.stopPropagation();

        let dirs = vertex.getAttribute("direction").split(" ");
        let mode: DragMode = "free";
        if (dirs.length === 1) {
          if (dirs.indexOf(<Direction>"left") !== -1 || dirs.indexOf(<Direction>"right") !== -1) {
            mode = "horizontal";
          } else {
            mode = "vertical";
          }
        }
        dragTargets = [{
          target: vertex,
          targetFromCursor: deform(vertex).getPosition().sub(Point.of(ev.clientX, ev.clientY)),
          targetInit: deform(vertex).getPosition(),
          dragMode: mode,
          expandVertexes: {
            target: mainTarget,
            vertexes: expandVertexes
          }
        }];
      };
    }
    dragTargets = targets.map(target => {
      return {
        target: target,
        targetFromCursor: deform(target).getPosition().sub(Point.of(ev.clientX, ev.clientY)),
        targetInit: deform(target).getPosition(),
        dragMode: <DragMode>"free"
      };
    });
  };
});

function traverse(node: Element, fn: (node: Element) => void): void {
  fn(node);
  for(let i = 0; i < node.children.length; i++) {
    fn(node.children.item(i));
  }
}
