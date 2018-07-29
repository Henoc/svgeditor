import { editMode } from "./main";
import * as selectMode from "./selectMode";

export function onShapeMouseDown(event: MouseEvent, uu: string) {
    if (editMode === "select") {
        selectMode.onShapeMouseDown(event, uu);
    }
}

export function onAaaMouseDown(event: MouseEvent) {

}

export function onDocumentMouseMove(event: MouseEvent) {
    if (editMode === "select") {
        selectMode.onDocumentMouseMove(event);
    }
}

export function onDocumentMouseUp(event: MouseEvent) {
    if (editMode === "select") {
        selectMode.onDocumentMouseUp(event);
    }
}
