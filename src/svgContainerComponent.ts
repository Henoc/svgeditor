import { Component } from "./component";
import { construct } from "./svgConstructor";
import { svgdata, configuration, editMode } from "./main";
import { SvgTag } from "./svg";
import { el } from "./utils";
import { cssVar } from "./styleHelpers";

/**
```xml
( <svg(wrapper)>                  // for insert outer WebView environment (ex. font)
    <svg(written by user) />
  </svg> )

<svg(container)>
  <image href="data:image svg(wrapper)" />   // to deal with unresolving url scheme in iframe problem
  <svg(transparent) />            // shapes with opacity 0 for mouse detection
  <svg(shapeHandler) />           // draw handler objects
</svg>
```
 */
export class SvgContainerComponent implements Component {

    render() {
        const svgtag = construct(svgdata, {all: configuration.showAll, setRootSvgXYtoOrigin: true});
        const transparentSvgtag = construct(svgdata, {putRootAttribute: true, setRootSvgXYtoOrigin: true, putUUIDAttribute: true, setListeners: true, transparent: true, insertSvgSizeRect: true, insertRectForGroup: true, all: configuration.showAll});
        if (svgtag && transparentSvgtag) {
            const width = svgdata.tag === "svg" && svgdata.attrs.width && svgdata.attrs.width.unit !== "%" && `${svgdata.attrs.width.value}${svgdata.attrs.width.unit || "px"}` || "400px";
            const height = svgdata.tag === "svg" && svgdata.attrs.height && svgdata.attrs.height.unit !== "%" && `${svgdata.attrs.height.value}${svgdata.attrs.height.unit || "px"}` || "400px";
            const outerFontEnv = getComputedStyle(document.body).font || "";
            const wrapper = new SvgTag("svg").attr("width", width).attr("height", height).attr("style", `font:${outerFontEnv}`).children(svgtag);
            el`svg :key="svgcontainer" *class="svgeditor-svgcontainer" *xmlns="http://www.w3.org/2000/svg" *xmlns:xlink="http://www.w3.org/1999/xlink" width=${width} height=${height}`;
                el`image width=${width} height=${height} xlink:href=${`data:image/svg+xml,${encodeURIComponent(wrapper.build().outerHTML)}`} /`;
                transparentSvgtag.render();
                el`svg :key="shapeHandler" width=${width} height=${height}`;
                    editMode.mode.render();
                el`/svg`;
            el`/svg`
        }
    }
}
