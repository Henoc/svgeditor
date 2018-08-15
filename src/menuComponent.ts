import {Component} from "./component";
import { elementOpen, text, elementClose } from "incremental-dom";
import { editMode, refleshContent } from "./main";
import { SelectMode } from "./selectMode";
import { NodeMode } from "./nodeMode";
import { RectMode } from "./rectMode";
import { EllipseMode } from "./ellipseMode";
import { PolylineMode } from "./polylineMode";
import { PathMode } from "./pathMode";
import { assertNever, el } from "./utils";

export type ModeName = "select" | "node" | "rect" | "ellipse" | "polyline" | "path";

class MenuComponent implements Component {

    constructor(public name: ModeName, public modeChangeHandler: (name: ModeName) => void, public isSelected: boolean = false) {
    }

    render() {
        el`li :key=${this.name} *id=${`svgeditor-menu-${this.name}`} *onclick=${() => this.changeMode(this.name)} class=${this.isSelected ? "svgeditor-selected" : ""}`;
        text(this.name);
        el`/li`;
    }

    changeMode(name: ModeName, initialUuid?: string) {
        switch (name) {
            case "select":
            editMode.mode = new SelectMode(initialUuid);
            break;
            case "node":
            editMode.mode = new NodeMode(initialUuid);
            break;
            case "rect":
            editMode.mode = new RectMode((uu: string | null) => this.changeMode("select", uu || undefined));
            break;
            case "ellipse":
            editMode.mode = new EllipseMode((uu: string | null) => this.changeMode("select", uu || undefined));
            break;
            case "polyline":
            editMode.mode = new PolylineMode((uu: string | null) => this.changeMode("node", uu || undefined));
            break;
            case "path":
            editMode.mode = new PathMode((uu: string | null) => this.changeMode("node", uu || undefined));
            break;
            default:
            assertNever(name);
        }
        this.modeChangeHandler(name);
        refleshContent();
    }
}

export class MenuListComponent implements Component {

    select = new MenuComponent("select", (name) => this.changeSelectedMode(name), true)
    node = new MenuComponent("node", (name) => this.changeSelectedMode(name))
    rect = new MenuComponent("rect", (name) => this.changeSelectedMode(name))
    ellipse = new MenuComponent("ellipse", (name) => this.changeSelectedMode(name))
    polyline = new MenuComponent("polyline", (name) => this.changeSelectedMode(name))
    path = new MenuComponent("path", (name) => this.changeSelectedMode(name))

    render() {
        el`ul`;
        this.select.render();
        this.node.render();
        this.rect.render();
        this.ellipse.render();
        this.polyline.render();
        this.path.render();
        el`/ul`;
    }

    changeSelectedMode(mode: ModeName) {
        this.select.isSelected = false;
        this.node.isSelected = false;
        this.rect.isSelected = false;
        this.ellipse.isSelected = false;
        this.polyline.isSelected = false;
        this.path.isSelected = false;
        this[mode].isSelected = true;
    }
}
