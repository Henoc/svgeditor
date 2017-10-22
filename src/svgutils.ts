/// <reference path="utils.ts" />

class SvgDeformer {
  constructor(public elem: SVGElement) {
  }

  set(point: Point): void {
    switch (this.elem.tagName) {
      case "circle":
      case "ellipse":
        this.elem.setAttribute("cx", String(point.x));
        this.elem.setAttribute("cy", String(point.y));
        break;
      case "rect":
        this.elem.setAttribute("x", String(point.x));
        this.elem.setAttribute("y", String(point.y));
        break;
      default:
        throw `not defined SVGElement: ${this.elem.tagName}`;
    }
  }
}

function deform(elem: SVGElement): SvgDeformer {
  return new SvgDeformer(elem);
}
