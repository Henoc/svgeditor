import { svgroot, editorRoot, refleshStyleAttribues, colorpickers, svgStyleAttrs, displayOn, displayOff } from "../common";
import { svgof } from "../utils/svgutils";
import * as SVG from "svgjs";
import * as jQuery from "jquery";
import { getValueOfTags, addValueOfTags } from "../gadget/tags";

export function textMode() {

  let attributeElems = {
    text: <HTMLInputElement>document.getElementById("svgeditor-typicalproperties-text"),
    font: <HTMLInputElement>document.getElementById("svgeditor-typicalproperties-fontfamily"),
    size: <HTMLInputElement>document.getElementById("svgeditor-typicalproperties-fontsize")
  };
  addValueOfTags(attributeElems.font, "Helvetica", "Arial", "sans-serif");
  let sampleText = makeSampleText();
  refleshStyleAttribues(sampleText);

  svgroot.node.onmousedown = (ev: MouseEvent) => {
    ev.stopPropagation();

    let x = ev.clientX - svgroot.node.getBoundingClientRect().left;
    let y = ev.clientY - svgroot.node.getBoundingClientRect().top;

    sampleText.clone().attr("id", undefined);
  };

  svgroot.node.onmousemove = (ev: MouseEvent) => {
    ev.stopPropagation();

    let x = ev.clientX - svgroot.node.getBoundingClientRect().left;
    let y = ev.clientY - svgroot.node.getBoundingClientRect().top;
    sampleText.move(x, y);
  };

    // colorpicker event
  jQuery($ => {
    $(colorpickers.fill).off("change.spectrum");
    $(colorpickers.fill).on("change.spectrum", (e, color) => {
      svgof(sampleText).setColorWithOpacity("fill", color, "indivisual");
    });
    $(colorpickers.stroke).off("change.spectrum");
    $(colorpickers.stroke).on("change.spectrum", (e, color) => {
      svgof(sampleText).setColorWithOpacity("stroke", color, "indivisual");
    });
  });

  // style attributes event
  svgStyleAttrs.strokewidth.oninput = e => {
    svgof(sampleText).setStyleAttr("stroke-width", svgStyleAttrs.strokewidth.value, "indivisual");
  };

  attributeElems.text.onchange = (ev) => {
    sampleText.plain(attributeElems.text.value);
  };

  attributeElems.font.onchange = (ev) => {
    sampleText.attr("font-family", getValueOfTags(attributeElems.font).map(t => `'${t}'`).join(" "));
  };

  attributeElems.size.onchange = (ev) => {
    sampleText.attr("font-size", attributeElems.size.value);
  };

  displayOn(document.getElementById("svgeditor-typicalproperties-textmode")!);

  function makeSampleText(): SVG.Text {
    return editorRoot.plain(attributeElems.text.value)
    .attr("font-family", getValueOfTags(attributeElems.font).map(t => `'${t}'`).join(" "))
    .attr("fill", "#663300")
    .attr("font-size", 12)
    .id("svgeditor-sampletext");
  }
}

export function textModeDestruct() {
  let sampleText = document.getElementById("svgeditor-sampletext");
  if (sampleText) sampleText.remove();
  displayOff(document.getElementById("svgeditor-typicalproperties-textmode")!);
  document.onmousedown = () => undefined;
}
