import { svgVirtualMap, drawState, refleshContent } from "./main";
import uuidStatic from "uuid";
import { ParsedElement } from "./domParser";
import { v } from "./utils";
import { Mode } from "./modeInterface";
import { SvgTag } from "./svg";
import { applyToPoint, inverse } from "transformation-matrix";
import { shaper } from "./shapes";

export class PathMode implements Mode {

    isDragging: boolean = false;
    makeTargetUuid: string | null = null;
    readonly shapeHandlers: SvgTag[] = [];

    constructor(public finished?: (uu: string | null) => void) {}

    onShapeMouseDownLeft(event: MouseEvent, uu: string): void {
        if (svgVirtualMap[uu].isRoot) {
            let {x: cx, y: cy} = this.inTargetCoordinate({x: event.offsetX, y: event.offsetY}, uu);
            const root = svgVirtualMap[uu];
            event.stopPropagation();
            this.isDragging = true;
            if (root.tag === "svg") {
                if (this.makeTargetUuid === null) {
                    this.makeTargetUuid = uuidStatic.v4();
                    const pe: ParsedElement = {
                        uuid: this.makeTargetUuid,
                        isRoot: false,
                        parent: uu,
                        tag: "path",
                        attrs: {
                            d: [
                                ["M", cx, cy],
                                ["S",
                                    /* end ctrl point */ cx, cy,
                                    /* end point */ cx, cy
                                ]
                            ],
                            ...Mode.baseAttrsDefaultImpl(),
                            ...Mode.presentationAttrsDefaultImpl()
                        }
                    };
                    root.children.push(pe);
                    refleshContent();
                } else {
                    const pe = svgVirtualMap[this.makeTargetUuid];
                    if (pe.tag === "path" && pe.attrs.d) {
                        // insert new S command in second of the d
                        pe.attrs.d.splice(1, 0, ["S", cx, cy, cx, cy]);
                        refleshContent();
                    }
                }
            }
        }
    }
    onShapeMouseDownRight(event: MouseEvent, uu: string): void {
        const root = svgVirtualMap[uu];
        if (this.makeTargetUuid && root.isRoot && root.tag === "svg") {
            const pe = svgVirtualMap[this.makeTargetUuid];
            if (pe.tag === "path" && pe.attrs.d) {
                // delete second S command and modify new second S command to C command if exists
                const secondS = 1;
                const secondSEndCtrl = v(pe.attrs.d[secondS][1], pe.attrs.d[secondS][2]);
                const secondSEnd = v(pe.attrs.d[secondS][3], pe.attrs.d[secondS][4]);
                const newCStartCtrl = secondSEndCtrl.symmetry(secondSEnd);
                pe.attrs.d.splice(1, 1);
                if (pe.attrs.d.length <= 1) {
                    root.children.pop();
                } else {
                    const [preCmdName, ...preArgs] = pe.attrs.d[1];
                    pe.attrs.d[1] = ["C", newCStartCtrl.x, newCStartCtrl.y, ...preArgs];
                    pe.attrs.d[0] = ["M", secondSEnd.x, secondSEnd.y];
                }
                this.finished && this.finished(this.makeTargetUuid);
            }
        }
    }
    onDocumentMouseMove(event: MouseEvent): void {
        if (this.makeTargetUuid) {
            let {x: cx, y: cy} = this.inTargetCoordinate({x: event.offsetX, y: event.offsetY}, this.makeTargetUuid);
            const pe = svgVirtualMap[this.makeTargetUuid];
            if (pe.tag === "path" && pe.attrs.d) {
                const topM = 0;
                const secondS = 1;
                if (this.isDragging) {
                    // modify M and second S command args (end ctrl point) while dragging
                    pe.attrs.d[topM][1] = cx;
                    pe.attrs.d[topM][2] = cy;
                    pe.attrs.d[secondS][1] = cx;
                    pe.attrs.d[secondS][2] = cy;
                } else {
                    // modify M while dragging
                    pe.attrs.d[topM][1] = cx;
                    pe.attrs.d[topM][2] = cy;
                }
                refleshContent();
            }
        }
    }
    onDocumentMouseUp(event: MouseEvent): void {
        this.isDragging = false;
    }
    onDocumentMouseLeave(event: Event): void {
        this.isDragging = false;
    }
    onOperatorClicked() {
        
    }

    /**
     * Transform a (mouse) point into that in coordinate of a target shape by inverse mapping.
     */
    private inTargetCoordinate(point: Point, targetUuid: string): Point {
        return applyToPoint(inverse(shaper(targetUuid).allTransform()), point);
    }
}
