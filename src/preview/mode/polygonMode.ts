import { svgroot, reflection, editorRoot, refleshStyleAttribues, colorpickers, svgStyleAttrs, displayOn, displayOff, setStyleAttrEvent, buttons } from "../common";
import { Point, withDefault } from "../utils/utils";
import { svgof } from "../utils/svgjs/svgutils";
import * as SVG from "svgjs";
import * as jQuery from "jquery";
import { noneColor } from "../utils/tinycolorutils";

export function polygonMode() {

  let polyline: undefined | {
    elem: SVG.PolyLine
    points: Point[];
  } = undefined;

  // about color-picker
  let colorSample = editorRoot.group().id("svgeditor-temporals").rect().style({ fill: "none", "stroke-width": 10, stroke: "#999999" }).size(0, 0);
  refleshStyleAttribues(colorSample);

  let polygonCheckbox = <HTMLInputElement>document.getElementById("svgeditor-typicalproperties-enclosure")!;
  let rightClicked = false;

  svgroot.node.onmouseup = (ev: MouseEvent) => {
    ev.stopPropagation();

    if (rightClicked) {
      rightClicked = false;
      return;
    }

    let x = ev.clientX - svgroot.node.getBoundingClientRect().left;
    let y = ev.clientY - svgroot.node.getBoundingClientRect().top;
    if (polyline === undefined) {
      let seed = polygonCheckbox.checked ? svgroot.polygon([]) : svgroot.polyline([]);
      polyline = {
        elem: seed.style({
          "fill": svgof(colorSample).color("fill").toHexString(),
          "stroke": svgof(colorSample).color("stroke").toHexString(),
          "fill-opacity": svgof(colorSample).color("fill").getAlpha(),
          "stroke-opacity": svgof(colorSample).color("stroke").getAlpha(),
          "stroke-width": svgof(colorSample).style("stroke-width")
        }).attr("id", null),
        points: []
      };
    }
    polyline.points.push(Point.of(x, y));
    polyline.elem.plot(<any>polyline.points.map(p => [p.x, p.y]));
  };

  svgroot.node.onmousemove = (ev: MouseEvent) => {
    ev.stopPropagation();

    if (polyline) {
      let x = ev.clientX - svgroot.node.getBoundingClientRect().left;
      let y = ev.clientY - svgroot.node.getBoundingClientRect().top;

      let points = polyline.points.map(p => [p.x, p.y]).concat();
      points.push([x, y]);
      polyline.elem.plot(<any>points);
    }
  };

  svgroot.node.oncontextmenu = (ev: MouseEvent) => {
    ev.stopPropagation();

    if (polyline) {
      polyline.elem.plot(<any>polyline.points.map(p => [p.x, p.y]));
      colorSample.remove();
      reflection();
      buttons.hand.click();
    }
    polyline = undefined;
    rightClicked = true;
  };

  setStyleAttrEvent(() => [colorSample]);

  displayOn(document.getElementById("svgeditor-typicalproperties-enclosure-div")!);
}

export function polygonModeDestruct() {
  displayOff(document.getElementById("svgeditor-typicalproperties-enclosure-div")!);
  svgroot.node.onmousemove = () => undefined;
  svgroot.node.oncontextmenu = () => undefined;
  svgroot.node.onmouseup = () => undefined;
}
