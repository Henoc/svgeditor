import { svgVirtualMap, refleshContent, configuration, svgRealMap, drawState } from "./main";
import uuidStatic from "uuid";
import { ParsedElement } from "./domParser";
import { v, vfp } from "./utils";
import { shaper } from "./shapes";
import { Mode } from "./modeInterface";
import { SvgTag } from "./svg";
import { applyToPoint, inverse } from "transformation-matrix";

export class PolylineMode extends Mode {

    makeTargetUuid: string | null = null;
    readonly shapeHandlers: SvgTag[] = [];

    constructor(public finished?: (uu: string | null) => void) {super()}

    onShapeMouseDownLeft(event: MouseEvent, uu: string): void {
        if (svgVirtualMap[uu].isRoot) {
            const root = svgVirtualMap[uu];
            event.stopPropagation();
            const cursor = vfp(this.inTargetCoordinate(this.cursor(event), [uu]));
            if (root.tag === "svg") {
                if (this.makeTargetUuid) {
                    const pe = svgVirtualMap[this.makeTargetUuid];
                    if (pe.tag === "polyline" && pe.attrs.points) {
                        pe.attrs.points.push(cursor);
                    }
                } else {
                    this.makeTargetUuid = uuidStatic.v4();
                    const pe: ParsedElement = {
                        uuid: this.makeTargetUuid,
                        isRoot: false,
                        parent: uu,
                        tag: "polyline",
                        attrs: {
                            points: [cursor, cursor],
                            ...Mode.baseAttrsDefaultImpl(),
                            ...Mode.presentationAttrsDefaultImpl()
                        }
                    }
                    root.children.push(pe);
                    refleshContent();
                    shaper(this.makeTargetUuid).center = cursor;
                }
                refleshContent();
            }
        }
    }
    onShapeMouseDownRight(event: MouseEvent, uu: string): void {
        if (this.makeTargetUuid) {
            const pe = svgVirtualMap[this.makeTargetUuid];
            if (pe.tag === "polyline" && pe.attrs.points) {
                pe.attrs.points.pop();
                this.finished && this.finished(this.makeTargetUuid);
            }
        }
    }
    onDocumentMouseMove(event: MouseEvent): void {
        if (this.makeTargetUuid) {
            const cursor = vfp(this.inTargetCoordinate(this.cursor(event), [this.makeTargetUuid]));
            const pe = svgVirtualMap[this.makeTargetUuid];
            if (pe.tag === "polyline" && pe.attrs.points) {
                const len = pe.attrs.points.length;
                pe.attrs.points[len - 1] = cursor;
                refleshContent();
            }
        }
    }
    onDocumentMouseUp(event: MouseEvent): void {

    }
    onDocumentMouseLeave(event: Event): void {
        
    }
}
