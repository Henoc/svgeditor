import { svgroot, reflection, editorRoot, refleshStyleAttribues, colorpickers, svgStyleAttrs, displayOn, displayOff } from "../common";
import { Point } from "../utils/utils";
import { svgof } from "../utils/svgutils";
import * as SVG from "svgjs";
import * as jQuery from "jquery";

export function polygonMode() {

  let polyline: undefined | {
    elem: SVG.PolyLine
    points: Point[];
  } = undefined;

  // about color-picker
  let colorSample = editorRoot.defs().rect().fill("none").stroke({ width: 10, color: "#999999" });
  refleshStyleAttribues(colorSample);

  let polygonCheckbox = <HTMLInputElement>document.getElementById("svgeditor-typicalproperties-enclosure")!;

  svgroot.node.onmousedown = (ev: MouseEvent) => {
    ev.stopPropagation();

    let x = ev.clientX - svgroot.node.getBoundingClientRect().left;
    let y = ev.clientY - svgroot.node.getBoundingClientRect().top;
    if (polyline === undefined) {
      let seed = polygonCheckbox.checked ? svgroot.polygon([]) : svgroot.polyline([]);
      polyline = {
        elem: seed
          .attr("fill", svgof(colorSample).getColor("fill").toHexString())
          .attr("stroke", svgof(colorSample).getColor("stroke").toHexString())
          .attr("fill-opacity", svgof(colorSample).getColorWithOpacity("fill").getAlpha())
          .attr("stroke-opacity", svgof(colorSample).getColorWithOpacity("stroke").getAlpha())
          .attr("stroke-width", svgof(colorSample).getStyleAttr("stroke-width")),
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
      reflection();
    }
    polyline = undefined;
  };

  // colorpicker event
  jQuery($ => {
    $(colorpickers.fill).off("change.spectrum");
    $(colorpickers.fill).on("change.spectrum", (e, color) => {
      svgof(colorSample).setColorWithOpacity("fill", color, "indivisual");
    });
    $(colorpickers.stroke).off("change.spectrum");
    $(colorpickers.stroke).on("change.spectrum", (e, color) => {
      svgof(colorSample).setColorWithOpacity("stroke", color, "indivisual");
    });
  });

  // style attributes event
  svgStyleAttrs.strokewidth.oninput = e => {
    svgof(colorSample).setStyleAttr("stroke-width", svgStyleAttrs.strokewidth.value, "indivisual");
  };

  displayOn(document.getElementById("svgeditor-typicalproperties-enclosure-div")!);
}

export function polygonModeDestruct() {
  displayOff(document.getElementById("svgeditor-typicalproperties-enclosure-div")!);
  svgroot.node.onmousemove = () => undefined;
  svgroot.node.oncontextmenu = () => undefined;
}
