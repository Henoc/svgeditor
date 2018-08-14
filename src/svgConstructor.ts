import { ParsedElement, ParsedBaseAttr } from "./domParser";
import { SvgTag } from "./svg";
import uuid from "uuid";
import { onShapeMouseDown } from "./triggers";
import { assertNever } from "./utils";

interface SvgConstructOptions {
    putRootAttribute?: boolean;
    putUUIDAttribute?: boolean;
    setListeners?: boolean;
    transparent?: boolean;
    all?: boolean;
}

/**
  Make elements only use recognized attributes and tags.
*/
export function construct(pe: ParsedElement, options?: SvgConstructOptions): SvgTag | null {
    const putRootAttribute = options && options.putRootAttribute || false;
    const putIndexAttribute = options && options.putUUIDAttribute || false;
    const setListeners = options && options.setListeners || false;
    const transparent = options && options.transparent || false;
    const all = options && options.all || false;

    const tag = new SvgTag(pe.tag);
    if (putRootAttribute) {
        tag.attr("data-root", "true");
        options && (options.putRootAttribute = false);
    }
    if (putIndexAttribute) {
        tag.attr("data-uuid", pe.uuid);
    }
    if (setListeners) {
        tag.listener("mousedown", event => onShapeMouseDown(<MouseEvent>event, pe.uuid));
    }
    if (transparent) {
        tag.importantAttr("opacity", 0);
    }

    if (pe.tag === "unknown") {
        if (all) {
            return tag.tag(pe.tag$real)
                .attrs(pe.attrs)
                .text(pe.text)
                .children(...pe.children.map(e => construct(e, options)!));
        } else {
            return null;
        }
    } else {
        if (all) tag.attrs(pe.attrs.unknown);
        switch (pe.tag) {
            case "svg":
            setBaseAttrs(pe.attrs, tag);
            makeChildren(pe.children, tag, options);
            const viewBoxAttrStr = pe.attrs.viewBox && pe.attrs.viewBox.map(p => `${p.x} ${p.y}`).join(" ");
            return tag.attr("xmlns", pe.attrs.xmlns)
                .attr("version", pe.attrs.version)
                .attr("xmlns:xlink", pe.attrs["xmlns:xlink"])
                .attr("viewBox", viewBoxAttrStr)
                .uattr("width", pe.attrs.width)
                .uattr("height", pe.attrs.height);
            case "circle":
            setBaseAttrs(pe.attrs, tag);
            return tag.uattr("r", pe.attrs.r)
                .uattr("cx", pe.attrs.cx)
                .uattr("cy", pe.attrs.cy)
                .pattr("fill", pe.attrs.fill)
                .pattr("stroke", pe.attrs.stroke);
            case "rect":
            setBaseAttrs(pe.attrs, tag);
            return tag.uattr("x", pe.attrs.x)
                .uattr("y", pe.attrs.y)
                .uattr("width", pe.attrs.width)
                .uattr("height", pe.attrs.height)
                .uattr("rx", pe.attrs.rx)
                .uattr("ry", pe.attrs.ry)
                .pattr("fill", pe.attrs.fill)
                .pattr("stroke", pe.attrs.stroke);
            case "ellipse":
            setBaseAttrs(pe.attrs, tag);
            return tag.uattr("cx", pe.attrs.cx)
                .uattr("cy", pe.attrs.cy)
                .uattr("rx", pe.attrs.rx)
                .uattr("ry", pe.attrs.ry)
                .pattr("fill", pe.attrs.fill)
                .pattr("stroke", pe.attrs.stroke);
            case "polyline":
            setBaseAttrs(pe.attrs, tag);
            const pointsStr = pe.attrs.points && pe.attrs.points.map(point => `${point.x},${point.y}`).join(" ");
            return tag.attr("points", pointsStr)
                .pattr("fill", pe.attrs.fill)
                .pattr("stroke", pe.attrs.stroke);
            case "path":
            setBaseAttrs(pe.attrs, tag);
            return tag.dattr("d", pe.attrs.d)
                .pattr("fill", pe.attrs.fill)
                .pattr("stroke", pe.attrs.stroke);
            default:
            assertNever(pe);
        }
        return null;    // unreachable
    }
}

function setBaseAttrs(baseAttr: ParsedBaseAttr, tag: SvgTag) {
    tag.attr("id", baseAttr.id);
    if (baseAttr.class) tag.class(...baseAttr.class);
}

function makeChildren(pc: ParsedElement[], tag: SvgTag, options?: SvgConstructOptions) {
    const c = [];
    for (let i = 0; i < pc.length; i++) {
        const elem = construct(pc[i], options);
        if (elem) c.push(elem);
    }
    tag.children(...c);
}

export function makeUuidVirtualMap(pe: ParsedElement): {[uu: string]: ParsedElement} {
    const acc: {[uu: string]: ParsedElement} = {};
    if (pe.uuid) acc[pe.uuid] = pe;
    if ("children" in pe) {
        pe.children.forEach(child => {
            Object.assign(acc, makeUuidVirtualMap(child));
        });
    }
    return acc;
}

export function makeUuidRealMap(e: Element): {[uu: string]: Element} {
    const acc: {[uu: string]: Element} = {};
    let tmp: string | null;
    if (tmp = e.getAttribute("data-uuid")) acc[tmp] = e;
    for (let i = 0; i < e.children.length; i++) {
        const child = e.children.item(i);
        Object.assign(acc, makeUuidRealMap(child));
    }
    return acc;
}
