import { map } from "./utils";
import { Length, Paint, PathCommand } from "./domParser";
import tinycolor from "tinycolor2";
import { svgPathManager } from "./pathHelpers";
import { elementOpenStart, elementOpenEnd, attr, text, elementClose } from "incremental-dom";
import { Component } from "./component";

const ns = "http://www.w3.org/2000/svg";

interface SvgOptions {
    isSvg?: boolean;
}

/**
 * Build SVG element or render for incremental-dom.
 */
export class SvgTag implements Component {
    public options: SvgOptions = {
        isSvg: true
    };
    public data: {
        tag?: string;
        attrs: {[key: string]: string | number}
        class: string[]
        children: SvgTag[]
        text?: string
        listeners: {[key: string]: (event: Event) => void}
        important: string[]
    } = {attrs: {}, class: [], children: [], listeners: {}, important: []};

    constructor(name?: string) {
        if (name) this.data.tag = name;
    }
    setOptions(options: SvgOptions): SvgTag {
        if (options.isSvg !== undefined) this.options.isSvg = options.isSvg;
        return this;
    }
    tag(name: string): SvgTag {
        this.data.tag = name;
        return this;
    }
    rmAttr(key: string): SvgTag {
        delete this.data.attrs[key];
        return this;
    }
    attr(key: string, value: string | number | null): SvgTag {
        if (value !== null && this.data.important.indexOf(key) === -1) {
            this.data.attrs[key] = value;
        }
        return this;
    }
    importantAttr(key: string, value: string | number): SvgTag {
        this.attr(key, value);
        this.data.important.push(key);
        return this;
    }
    uattr(key: string, value: Length | null): SvgTag {
        if (value !== null && this.data.important.indexOf(key) === -1) {
            this.data.attrs[key] = `${value.value}${value.unit || ""}`;
        }
        return this;
    }
    pattr(key: string, value: Paint | null): SvgTag {
        if (value !== null && this.data.important.indexOf(key) === -1) {
            const tcolor = tinycolor(value);
            if (value.format === "none" || value.format === "currentColor" || value.format === "inherit") {
                this.data.attrs[key] = value.format;
            } else {
                this.data.attrs[key] = tcolor.toString(value.format);
            }
        }
        return this;
    }
    dattr(key: string, value: PathCommand[] | null): SvgTag {
        if (value !== null && this.data.important.indexOf(key) === -1) {
            const parsedDAttr = svgPathManager(value);
            this.data.attrs[key] = parsedDAttr.toString();
        }
        return this;
    }
    attrs(assoc: {[key: string]: string | number | null}): SvgTag {
        map(assoc, (key, value) => {
            if (this.data.important.indexOf(key) === -1) this.data.attrs[key] = value;            
        });
        return this;
    }
    class(...classNames: string[]): SvgTag {
        this.data.class.push(...classNames);
        return this;
    }
    children(...children: SvgTag[]) {
        this.data.children.push(...children);
        return this;
    }
    text(text: string | null): SvgTag {
        if (text !== null) this.data.text = text;
        return this;
    }
    listener(name: string, action: (event: Event) => void): SvgTag {
        this.data.listeners[name] = action;
        return this;
    }
    build(): Element {
        if (this.data.tag) {
            const elem = this.options.isSvg ? document.createElementNS(ns, this.data.tag) : document.createElement(this.data.tag);
            map(this.data.attrs, (key, value) => {
                if (value !== null) elem.setAttribute(key, String(value));
            });
            elem.classList.add(...this.data.class);
            this.data.children.forEach(c => {
                elem.insertAdjacentElement("beforeend", c.build());
            });
            if (this.data.text) elem.textContent = this.data.text;
            map(this.data.listeners, (key, value) => {
                elem.addEventListener(key, value);
            });
            return elem;
        } else {
            throw new Error("In class Tag, no tag name found when build.");
        }
    }

    /**
     * For incremental-dom
     */
    render = () => {
        if (this.data.tag) {
            elementOpenStart(this.data.tag);
            map(this.data.attrs, (key, value) => {
                if (value !== null) attr(key, value);
            });
            map(this.data.listeners, (key, value) => {
                attr(`on${key}`, value);
            });
            attr("class", this.data.class.join(" "));
            elementOpenEnd();
            this.data.children.forEach(c => c.render());
            if (this.data.text) text(this.data.text);
            elementClose(this.data.tag);
        }
        else {
            throw new Error("In class Tag, no tag name found when build.");
        }
    }
}

export type Assoc = {[key: string]: string};
