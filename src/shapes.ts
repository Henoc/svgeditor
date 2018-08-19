import { ParsedElement, Length, Transform, isLength } from "./domParser";
import { Vec2, v, vfp, StringPlus } from "./utils";
import {svgPathManager} from "./pathHelpers";
import { convertToPixel, convertFromPixel } from "./measureUnits";
import { svgVirtualMap, svgRealMap, configuration } from "./main";
import { identity, transform, scale, translate, rotate, rotateDEG, applyToPoint, inverse } from "transformation-matrix";
import { appendDescriptor, replaceLastDescriptor, descriptorToMatrix, equals } from "./transformHelpers";
import { font } from "./fontHelpers";

interface ShaperFunctions {
    center: (point?: Vec2) => undefined | Vec2;
    leftTop: (point?: Vec2) => undefined | Vec2;
    move: (diff: Vec2) => void;
    size: (wh?: Vec2) => Vec2 | undefined;
    size2: (newSize: Vec2, fixedPoint: Vec2) => void;
    transform: (matrix?: Matrix) => Matrix | undefined;
    allTransform: () => Matrix;
    rotate: (deg: number) => void;
}

/**
 * Transform some shapes. Need to set the shape into `svgVirtualMap` and `svgRealMap` before use.
 */
export function shaper(uuid: string): ShaperFunctions {
    const pe = svgVirtualMap[uuid];
    const re = svgRealMap[uuid];
    const styleDeclaration = getComputedStyle(re);

    const px = (unitValue: Length | null) => {
        return unitValue ? convertToPixel(unitValue, uuid) : 0;
    }
    const fromPx = (unitValue: Length | null, attrName: string, pxValue: number): Length => {
        return unitValue ?
            convertFromPixel({unit: "px", attrName, value: pxValue}, unitValue.unit, uuid) :
            {value: pxValue, unit: null, attrName};
    }
    const leftTop = (point?: Vec2) => {
        if (point) {
            const newCent = point.add(self().size()!.div(v(2, 2)));
            self().center(newCent);
        } else {
            const cent = self().center()!;
            const size = self().size()!;
            return cent.sub(size.div(v(2, 2)));
        }
    }
    const self = () => shaper(uuid);
    const size2 = (newSize: Vec2, fixedPoint: Vec2) => {
        let oldSize = self().size()!;
        let center = self().center()!;
        self().size(newSize);
        let diff = oldSize.sub(newSize).div(v(2, 2)).mul(v(fixedPoint.x - center.x > 0 ? 1 : -1, fixedPoint.y - center.y > 0 ? 1 : -1));
        self().move(diff);
    };
    const transformDefaultImpl = <T extends {transform: Transform | null}>(attrs: T) => (matrix?: Matrix) => {
        if (matrix) {
            if (!equals(matrix, identity())) attrs.transform = {descriptors: [{type: "matrix", ...matrix}], matrices: [matrix]};
        } else {
            return attrs.transform && transform(...attrs.transform.matrices) || identity();
        }
    }
    const allTransform = () => {
        if (pe.parent) {
            const past = shaper(pe.parent).allTransform();
            return transform(past, self().transform()!);
        } else {
            return self().transform()!;
        }
    }
    const rotateCenter = (deg: number) => {
        if (pe.tag !== "unknown" && "transform" in pe.attrs) {
            const center = self().center()!;
            const rotateDescriptor = {type: <"rotate">"rotate", angle: deg, cx: center.x, cy: center.y};
            if (pe.attrs.transform === null) pe.attrs.transform = {descriptors: [], matrices: []};
            appendDescriptor(pe.attrs.transform, rotateDescriptor);
        }
    }
    switch (pe.tag) {
        case "svg":
        return {
            center: (point?: Vec2) => {
                if (point) {
                    pe.attrs.x = fromPx(pe.attrs.x, "x",
                        point.x - px(pe.attrs.width) / 2
                    );
                    pe.attrs.y = fromPx(pe.attrs.y, "y",
                        point.y - px(pe.attrs.height) / 2
                    );
                } else {
                    return v(
                        px(pe.attrs.x) + px(pe.attrs.width) / 2,
                        px(pe.attrs.y) + px(pe.attrs.height) / 2
                    );
                }
            },
            move: (diff: Vec2) => {
                pe.attrs.x = fromPx(pe.attrs.x, "x",
                    px(pe.attrs.x) + diff.x
                );
                pe.attrs.y = fromPx(pe.attrs.y, "y",
                    px(pe.attrs.y) + diff.y
                );
            },
            size: (wh?: Vec2) => {
                if (wh) {
                    let center = self().center()!;
                    pe.attrs.width = fromPx(pe.attrs.width, "width", wh.x);
                    pe.attrs.height = fromPx(pe.attrs.height, "height", wh.y);
                    self().center(center);
                } else return v(px(pe.attrs.width), px(pe.attrs.height));
            },
            size2,
            leftTop,
            transform: () => {
                const w = pe.attrs.width && convertToPixel(pe.attrs.width, uuid);
                const h = pe.attrs.height && convertToPixel(pe.attrs.height, uuid);
                const viewBox = pe.attrs.viewBox;
                if (viewBox && w && h && w !== 0 && h !== 0) {
                    const vw = viewBox[1].x - viewBox[0].x;
                    const vh = viewBox[1].y - viewBox[0].y;
                    const vx = viewBox[0].x;
                    const vy = viewBox[0].y;
                    if (vw !== 0 && vh !== 0) {
                        return vh / h > vw / w ? transform(
                            scale(h / vh, h / vh),
                            translate((w - vw * h / vh) / 2 * h/vh - vx, -vy)
                        ) : transform(
                            scale(w / vw, w / vw),
                            translate(-vx, (h - vh * w / vw) / 2 * w/vw - vy)
                        );
                    }
                }
                return identity();
            },
            allTransform,
            rotate: () => undefined
        }
        case "circle":
        return {
            center: (point?: Vec2) => {
                if (point) {
                    pe.attrs.cx = fromPx(pe.attrs.cx, "cx", point.x);
                    pe.attrs.cy = fromPx(pe.attrs.cy, "cy", point.y);
                } else {
                    return v(px(pe.attrs.cx), px(pe.attrs.cy));
                }
            },
            move: (diff: Vec2) => {
                pe.attrs.cx = fromPx(pe.attrs.cx, "cx",
                    px(pe.attrs.cx) + diff.x
                );
                pe.attrs.cy = fromPx(pe.attrs.cy, "cy",
                    px(pe.attrs.cy) + diff.y
                );
            },
            size: (wh?: Vec2) => {
                if (wh && wh.x === wh.y) {
                    pe.attrs.r = fromPx(pe.attrs.r, "r", wh.x / 2);
                } else if (wh) {
                    // @ts-ignore
                    pe.tag = "ellipse";
                    delete pe.attrs.r;
                    // @ts-ignore
                    pe.attrs.rx = fromPx(pe.attrs.r, "rx", wh.x / 2);
                    // @ts-ignore
                    pe.attrs.ry = fromPx(pe.attrs.r, "ry", wh.y / 2);
                } else return v(px(pe.attrs.r) * 2, px(pe.attrs.r) * 2);
            },
            transform: transformDefaultImpl(pe.attrs),
            size2,
            leftTop,
            allTransform,
            rotate: rotateCenter
        }
        case "rect":
        return {
            center: (point?: Vec2) => {
                if (point) {
                    pe.attrs.x = fromPx(pe.attrs.x, "x",
                        point.x - px(pe.attrs.width) / 2
                    );
                    pe.attrs.y = fromPx(pe.attrs.y, "y",
                        point.y - px(pe.attrs.height) / 2
                    );
                } else {
                    return v(
                        px(pe.attrs.x) + px(pe.attrs.width) / 2,
                        px(pe.attrs.y) + px(pe.attrs.height) / 2
                    );
                }
            },
            move: (diff: Vec2) => {
                pe.attrs.x = fromPx(pe.attrs.x, "x",
                    px(pe.attrs.x) + diff.x
                );
                pe.attrs.y = fromPx(pe.attrs.y, "y",
                    px(pe.attrs.y) + diff.y
                );
            },
            size: (wh?: Vec2) => {
                if (wh) {
                    let center = self().center()!;
                    pe.attrs.width = fromPx(pe.attrs.width, "width", wh.x);
                    pe.attrs.height = fromPx(pe.attrs.height, "height", wh.y);
                    self().center(center);
                } else return v(px(pe.attrs.width), px(pe.attrs.height));
            },
            transform: transformDefaultImpl(pe.attrs),
            size2,
            leftTop,
            allTransform,
            rotate: rotateCenter
        }
        case "ellipse":
        return {
            center: (point?: Vec2) => {
                if (point) {
                    pe.attrs.cx = fromPx(pe.attrs.cx, "cx", point.x);
                    pe.attrs.cy = fromPx(pe.attrs.cy, "cy", point.y);
                } else {
                    return v(px(pe.attrs.cx), px(pe.attrs.cy));
                }
            },
            move: (diff: Vec2) => {
                pe.attrs.cx = fromPx(pe.attrs.cx, "cx",
                px(pe.attrs.cx) + diff.x
                );
                pe.attrs.cy = fromPx(pe.attrs.cy, "cy",
                    px(pe.attrs.cy) + diff.y
                );
            },
            size: (wh?: Vec2) => {
                if (wh) {
                    pe.attrs.rx = fromPx(pe.attrs.rx, "rx", wh.x / 2);
                    pe.attrs.ry = fromPx(pe.attrs.ry, "ry", wh.y / 2);
                } else {
                    return v(px(pe.attrs.rx) * 2, px(pe.attrs.ry) * 2);
                }
            },
            transform: transformDefaultImpl(pe.attrs),
            size2,
            leftTop,
            allTransform,
            rotate: rotateCenter
        }
        case "polyline":
        return {
            center: (point?: Vec2) => {
                if (point) {
                    const oldCenter = self().center()!;
                    self().move(point.sub(oldCenter));
                } else {
                    const minX = pe.attrs.points && Math.min(...pe.attrs.points.map(pair => pair.x)) || 0;
                    const maxX = pe.attrs.points && Math.max(...pe.attrs.points.map(pair => pair.x)) || 0;
                    const minY = pe.attrs.points && Math.min(...pe.attrs.points.map(pair => pair.y)) || 0;
                    const maxY = pe.attrs.points && Math.max(...pe.attrs.points.map(pair => pair.y)) || 0;
                    return v(maxX + minX, maxY + minY).div(v(2, 2));
                }
            },
            move: (diff: Vec2) => {
                if (pe.attrs.points) for(let i = 0; i < pe.attrs.points.length; i++) {
                    pe.attrs.points[i] = v(pe.attrs.points[i].x, pe.attrs.points[i].y).add(diff);
                }
            },
            size: (wh?: Vec2) => {
                if (wh) {
                    const oldCenter = self().center()!;
                    const leftTop = self().leftTop()!;
                    const oldSize = self().size()!;
                    const ratio = wh.div(oldSize, () => 1);
                    const acc: Vec2[] = [];
                    for (let point of pe.attrs.points || []) {
                        const newPoint = leftTop.add(v(point.x, point.y).sub(leftTop).mul(ratio));
                        acc.push(newPoint);
                    }
                    pe.attrs.points = acc;
                    self().center(oldCenter);
                } else {
                    const minX = pe.attrs.points && Math.min(...pe.attrs.points.map(pair => pair.x)) || 0;
                    const maxX = pe.attrs.points && Math.max(...pe.attrs.points.map(pair => pair.x)) || 0;
                    const minY = pe.attrs.points && Math.min(...pe.attrs.points.map(pair => pair.y)) || 0;
                    const maxY = pe.attrs.points && Math.max(...pe.attrs.points.map(pair => pair.y)) || 0;
                    return v(maxX - minX, maxY - minY);
                }
            },
            transform: transformDefaultImpl(pe.attrs),
            size2,
            leftTop,
            allTransform,
            rotate: rotateCenter
        }
        case "path":
        return {
            center: (point?: Vec2) => {
                if (point) {
                    const oldCenter = self().center()!;
                    self().move(point.sub(oldCenter));
                } else {
                    const parsedDAttr = svgPathManager(pe.attrs.d || []);
                    const vertexes = parsedDAttr.getVertexes();
                    const minX = Math.min(...vertexes.map(vec2 => vec2.x));
                    const maxX = Math.max(...vertexes.map(vec2 => vec2.x));
                    const minY = Math.min(...vertexes.map(vec2 => vec2.y));
                    const maxY = Math.max(...vertexes.map(vec2 => vec2.y));
                    return v(maxX + minX, maxY + minY).div(v(2, 2));
                }
            },
            move: (diff: Vec2) => {
                console.log(pe.attrs.d || []);
                const parsedDAttr = svgPathManager(pe.attrs.d || []);
                parsedDAttr.proceed(p => p.unarc()).safeIterate(([s, ...t], i, p) => {
                    if (s === "V") {
                        t[0] += diff.y;
                    } else if (s === "H") {
                        t[0] += diff.x;
                    } else {
                        for (let j = 0; j < t.length; j += 2) {
                            t[j] += diff.x;
                            t[j+1] += diff.y;
                        }
                    }
                    return [s, ...t];
                });
                pe.attrs.d = parsedDAttr.segments;
            },
            size: (wh?: Vec2) => {
                if (wh) {
                    const oldCenter = self().center()!;
                    const parsedDAttr = svgPathManager(pe.attrs.d || []).proceed(p => p.unarc());
                    const ratio = wh.div(self().size()!, () => 1);
                    const leftTop = self().leftTop()!;
                    parsedDAttr.safeIterate(([s, ...t], i, p) => {
                        if (s === "V") {
                            t[0] = v(p.x, t[0]).sub(leftTop).mul(ratio).add(leftTop).y;
                        } else if (s === "H") {
                            t[0] = v(t[0], p.y).sub(leftTop).mul(ratio).add(leftTop).x;
                        } else {
                            for (let j = 0; j < t.length; j += 2) {
                                const ctrlPoint = v(t[j], t[j + 1]).sub(leftTop).mul(ratio).add(leftTop);
                                t[j] = ctrlPoint.x;
                                t[j + 1] = ctrlPoint.y;
                            }
                        }
                        return [s, ...t];
                    });
                    pe.attrs.d = parsedDAttr.segments;
                    self().center(oldCenter);
                } else {
                    const parsedDAttr = svgPathManager(pe.attrs.d || []);
                    const vertexes = parsedDAttr.getVertexes();
                    const minX = Math.min(...vertexes.map(vec2 => vec2.x));
                    const maxX = Math.max(...vertexes.map(vec2 => vec2.x));
                    const minY = Math.min(...vertexes.map(vec2 => vec2.y));
                    const maxY = Math.max(...vertexes.map(vec2 => vec2.y));
                    return v(maxX - minX, maxY - minY);
                }
            },
            transform: transformDefaultImpl(pe.attrs),
            size2,
            leftTop,
            allTransform,
            rotate: rotateCenter
        }
        case "text":
        const fontInfo = font(pe.text || "", styleDeclaration.fontFamily || "", parseFloat(styleDeclaration.fontSize || "16"), styleDeclaration.fontWeight || "", styleDeclaration.fontStyle || "");
        return {
            center: (point?: Vec2) => {
                if (point) {
                    const oldCenter = self().center()!;
                    self().move(point.sub(oldCenter));
                } else {
                    const size = self().size()!;
                    const topX = px(pe.attrs.x);
                    const topY = px(pe.attrs.y) - fontInfo.height.baseline;
                    return v(topX + size.x / 2, topY + size.y / 2);
                }
            },
            move: (diff: Vec2) => {
                pe.attrs.x = fromPx(pe.attrs.x, "x",
                    px(pe.attrs.x) + diff.x
                );
                pe.attrs.y = fromPx(pe.attrs.y, "y",
                    px(pe.attrs.y) + diff.y
                );
            },
            size: (wh?: Vec2) => {
                if (wh) {
                    let center = self().center()!;
                    let fontSize = pe.attrs["font-size"];
                    pe.attrs["font-size"] = fromPx(fontSize !== null && isLength(fontSize) && fontSize || null, "font-size",
                        fontInfo.heightToSize("lineHeight", wh.y) || 1
                    );
                    pe.attrs.textLength = fromPx(pe.attrs.textLength, "textLength", wh.x);
                    self().center(center);
                } else {
                    const width = pe.attrs.textLength ? px(pe.attrs.textLength) : fontInfo.width;
                    const height = fontInfo.height.lineHeight;
                    return v(width, height);
                }
            },
            transform: transformDefaultImpl(pe.attrs),
            size2,
            leftTop,
            allTransform,
            rotate: rotateCenter
        }
        case "g":
        return {
            move: (diff: Vec2) => {
                const oldCenter = self().center()!;
                const newCenter = oldCenter.add(diff);
                for(let c of pe.children) {
                    const oldInC = intoTargetCoordinate(oldCenter, c.uuid);
                    const newInC = intoTargetCoordinate(newCenter, c.uuid);
                    shaper(c.uuid).move(newInC.sub(oldInC));
                }
            },
            center: (point?: Vec2) => {
                if (point) {
                    const oldCenter = self().center()!;
                    self().move(point.sub(oldCenter));
                } else {
                    let [minX, minY, maxX, maxY] = <(null | number)[]>[null, null, null, null];
                    for (let c of pe.children) {
                        const leftTop = shaper(c.uuid).leftTop()!;
                        const size = shaper(c.uuid).size()!;
                        for (let corner of [leftTop, leftTop.add(v(size.x, 0)), leftTop.add(v(0, size.y)), leftTop.add(size)]) {
                            const cornerInGroup = escapeFromTargetCoordinate(corner, c.uuid);
                            if (minX === null || minX > cornerInGroup.x) minX = cornerInGroup.x;
                            if (minY === null || minY > cornerInGroup.y) minY = cornerInGroup.y;
                            if (maxX === null || maxX < cornerInGroup.x) maxX = cornerInGroup.x;
                            if (maxY === null || maxY < cornerInGroup.y) maxY = cornerInGroup.y;
                        }
                    }
                    return v(minX || 0, minY || 0).add(v(maxX || 0, maxY || 0)).div(v(2, 2));
                }
            },
            size: (wh?: Vec2) => {
                if (wh) {
                    for (let c of pe.children) {
                        shaper(c.uuid).size(wh);
                    }
                } else {
                    let [minX, minY, maxX, maxY] = <(null | number)[]>[null, null, null, null];
                    for (let c of pe.children) {
                        const leftTop = shaper(c.uuid).leftTop()!;
                        const size = shaper(c.uuid).size()!;
                        for (let corner of [leftTop, leftTop.add(v(size.x, 0)), leftTop.add(v(0, size.y)), leftTop.add(size)]) {
                            const cornerInGroup = escapeFromTargetCoordinate(corner, c.uuid);
                            if (minX === null || minX > cornerInGroup.x) minX = cornerInGroup.x;
                            if (minY === null || minY > cornerInGroup.y) minY = cornerInGroup.y;
                            if (maxX === null || maxX < cornerInGroup.x) maxX = cornerInGroup.x;
                            if (maxY === null || maxY < cornerInGroup.y) maxY = cornerInGroup.y;
                        }
                    }
                    return v((maxX || 0) - (minX || 0), (maxY || 0) - (minY || 0));
                }
            },
            transform: transformDefaultImpl(pe.attrs),
            size2,
            leftTop,
            allTransform,
            rotate: rotateCenter
        }
        case "unknown":
        throw new Error("Unknown shape cannot move.");
    }
}

/**
 * @param uuids All shapes must have the same parent.
 */
export function multiShaper(uuids: StringPlus): ShaperFunctions {
    if (uuids.length === 1) {
        return shaper(uuids[0]);
    } else {
        const pes = uuids.map(uuid => svgVirtualMap[uuid]);
        const commonParent = pes[0].parent;
        const self = () => multiShaper(uuids);
        return {
            move: (diff: Vec2) => {
                const oldCenter = self().center()!;
                const newCenter = oldCenter.add(diff);
                for(let c of pes) {
                    const oldInC = intoTargetCoordinate(oldCenter, c.uuid);
                    const newInC = intoTargetCoordinate(newCenter, c.uuid);
                    shaper(c.uuid).move(newInC.sub(oldInC));
                }
            },
            center: (point?: Vec2) => {
                if (point) {
                    const oldCenter = self().center()!;
                    self().move(point.sub(oldCenter));
                } else {
                    let [minX, minY, maxX, maxY] = <(null | number)[]>[null, null, null, null];
                        for (let c of pes) {
                            const leftTop = shaper(c.uuid).leftTop()!;
                            const size = shaper(c.uuid).size()!;
                            for (let corner of [leftTop, leftTop.add(v(size.x, 0)), leftTop.add(v(0, size.y)), leftTop.add(size)]) {
                                const cornerInGroup = escapeFromTargetCoordinate(corner, c.uuid);
                                if (minX === null || minX > cornerInGroup.x) minX = cornerInGroup.x;
                                if (minY === null || minY > cornerInGroup.y) minY = cornerInGroup.y;
                                if (maxX === null || maxX < cornerInGroup.x) maxX = cornerInGroup.x;
                                if (maxY === null || maxY < cornerInGroup.y) maxY = cornerInGroup.y;
                            }
                        }
                        return v(minX || 0, minY || 0).add(v(maxX || 0, maxY || 0)).div(v(2, 2));
                }
            },
            size: (wh?: Vec2) => {
                if (wh) {
                    for (let c of pes) {
                        shaper(c.uuid).size(wh);
                    }
                } else {
                    let [minX, minY, maxX, maxY] = <(null | number)[]>[null, null, null, null];
                        for (let c of pes) {
                            const leftTop = shaper(c.uuid).leftTop()!;
                            const size = shaper(c.uuid).size()!;
                            for (let corner of [leftTop, leftTop.add(v(size.x, 0)), leftTop.add(v(0, size.y)), leftTop.add(size)]) {
                                const cornerInGroup = escapeFromTargetCoordinate(corner, c.uuid);
                                if (minX === null || minX > cornerInGroup.x) minX = cornerInGroup.x;
                                if (minY === null || minY > cornerInGroup.y) minY = cornerInGroup.y;
                                if (maxX === null || maxX < cornerInGroup.x) maxX = cornerInGroup.x;
                                if (maxY === null || maxY < cornerInGroup.y) maxY = cornerInGroup.y;
                            }
                        }
                        return v((maxX || 0) - (minX || 0), (maxY || 0) - (minY || 0));
                }
            },
            transform: (matrix?: Matrix) => {
                throw new Error("No define transform property of muliple selected shapes.");
            },
            allTransform: () => {
                return commonParent && shaper(commonParent).allTransform() || identity();
            },
            rotate: (deg: number) => {
                const center = self().center()!;
                const rotateDescriptor = {type: <"rotate">"rotate", angle: deg, cx: center.x, cy: center.y};
                for (let c of pes) {
                    if (c.tag !== "unknown" && "transform" in c.attrs) {
                        if (c.attrs.transform === null) c.attrs.transform = {descriptors: [], matrices: []};
                        appendDescriptor(c.attrs.transform, rotateDescriptor);
                    }
                }
            },
            leftTop: (point?: Vec2) => {
                if (point) {
                    const newCent = point.add(self().size()!.div(v(2, 2)));
                    self().center(newCent);
                } else {
                    const cent = self().center()!;
                    const size = self().size()!;
                    return cent.sub(size.div(v(2, 2)));
                }
            },
            size2: (newSize: Vec2, fixedPoint: Vec2) => {
                let oldSize = self().size()!;
                let center = self().center()!;
                self().size(newSize);
                let diff = oldSize.sub(newSize).div(v(2, 2)).mul(v(fixedPoint.x - center.x > 0 ? 1 : -1, fixedPoint.y - center.y > 0 ? 1 : -1));
                self().move(diff);
            }
        }
    }
}

function intoTargetCoordinate(point: Vec2, targetUuid: string) {
    return vfp(applyToPoint(inverse(shaper(targetUuid).transform()!), point));
}
function escapeFromTargetCoordinate (point: Vec2, targetUuid: string) {
    return vfp(applyToPoint(shaper(targetUuid).transform()!, point));
}
