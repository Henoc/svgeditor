// Common process through any modes.

import {deform} from "./svgutils";
import {handMode, handModeDestruct} from "./handMode";
import {rectangleMode} from "./rectangleMode";
import {ellipseMode} from "./ellipseMode";
import {polygonMode} from "./polygonMode";

import * as SVG from "svgjs";
import * as convert from "color-convert";
import * as jQuery from "jquery";
require("spectrum-colorpicker");

let erootNative = document.getElementById("svgeditor-root")!;
let svgContentText = "";
if (erootNative.firstElementChild) {
  svgContentText = erootNative.firstElementChild.innerHTML;
  erootNative.firstElementChild.remove();
}
export let editorRoot = SVG("svgeditor-root").size(400,400);
// 自動生成されるdefsを削除
editorRoot.select("defs").each((i, elems) => elems[i].remove());
export let svgroot = editorRoot.svg(svgContentText);

// 前処理として circle をすべて ellipse にする

let circles = editorRoot.select("circle");
circles.each((i, elems) => {
  elems[i].node.outerHTML = elems[i].node.outerHTML.replace("circle", "ellipse");
});
let ellipses = editorRoot.select("ellipse");
ellipses.each((i, elems) => {
  let ellipse = elems[i];
  if (ellipse.attr("r")) {
    ellipse.attr({
      rx: ellipse.attr("r"),
      ry: ellipse.attr("r"),
      r: undefined
    })
  }
});

/**
 * Execute registered extension command.
 */
export function command(name: string, args?: string[]): void {
  window.parent.postMessage({
    command: 'did-click-link',
    data: args ? `command:${name}?${encodeURIComponent(JSON.stringify(args))}` : `command:${name}`
  }, 'file://');
}

export function reflection(preprocess?: () => void, postprocess?: () => void): void {
  if (preprocess) preprocess();
  command("extension.reflectToEditor", [svgroot.node.outerHTML]);
  if (postprocess) postprocess();
}

/**
 * DOM of color pickers
 */
let colorpickers = {
  fill: "#svgeditor-colorpicker-fill",
  stroke: "#svgeditor-colorpicker-stroke"
};

/**
 * insert color data into the color-picker
 */
export function refleshColorPicker(target: SVG.Element): void {
  // show selected object color
  jQuery($ => {
    (<any>$(colorpickers.fill)).spectrum("set", deform(target).colorNormalize("fill"));
    (<any>$(colorpickers.stroke)).spectrum("set", deform(target).colorNormalize("stroke"));
  });
}

jQuery($ => {
  (<any>$("#svgeditor-colorpicker-fill")).spectrum({
    showAlpha: true,
    allowEmpty: true
  });
  (<any>$("#svgeditor-colorpicker-stroke")).spectrum({
    showAlpha: true,
    allowEmpty: true
  });
});

handMode();

document.getElementById("svgeditor-mode-hand")!.onclick = (ev: MouseEvent) => {
  handMode();
}

document.getElementById("svgeditor-mode-rectangle")!.onclick = (ev: MouseEvent) => {
  handModeDestruct();
  rectangleMode();
}

document.getElementById("svgeditor-mode-ellipse")!.onclick = (ev: MouseEvent) => {
  handModeDestruct();
  ellipseMode();
}

document.getElementById("svgeditor-mode-polygon")!.onclick = (ev: MouseEvent) => {
  handModeDestruct();
  polygonMode();
}
