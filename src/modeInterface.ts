import { Component } from "./component";
import { SvgTag } from "./svg";
import { ParsedPresentationAttr, ParsedBaseAttr } from "./domParser";
import { drawState } from "./main";
import { OperatorName } from "./menuComponent";

export abstract class Mode {
    abstract onShapeMouseDownLeft(event: MouseEvent, uu: string): void;
    abstract onShapeMouseDownRight(event: MouseEvent, uu: string): void;
    abstract onDocumentMouseMove(event: MouseEvent): void;
    abstract onDocumentMouseUp(event: MouseEvent): void;
    abstract onDocumentMouseLeave(event: Event): void;
    abstract onOperatorClicked(name: OperatorName): void;
    abstract readonly shapeHandlers: SvgTag[];

    static baseAttrsDefaultImpl: () => ParsedBaseAttr = () => {
        return {
            class: null,
            id: null,
            unknown: {}
        }
    }

    static presentationAttrsDefaultImpl: () => ParsedPresentationAttr = () => {
        return {
            fill: drawState.fill,
            stroke: drawState.stroke,
            transform: null,
            "font-family": null,
            "font-size": null,
            "font-style": null,
            "font-weight": null
        }
    }
}
