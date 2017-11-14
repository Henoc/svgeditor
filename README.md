# SVG Editor

Now your VSCode mutate to interactive visual & literal SVG editor 😎

You can draw shapes in SVG Editor **visually** and also write the SVG **literally**.

## Commands

- New File with SVG Editor
- Open SVG Editor

## Kinds of operation

- Hand mode
  - Scale and rotate.
    - Rotation uses the transform attribute. Transform property order is now fixed, `translate, rotate, scale, translate`. If shape doesn't follow it, the property is ignored.
- Node mode
  - Edit node of line, polyline, polygon and path object.
- Rectangle, ellipse, polygon, path, text mode
  - Make new object.

## Future plans

- [ ] Reflect embedded CSS in SVG
- [ ] Attributes output style options
- [ ] Line cap, marker
- [ ] Scale objects with fixed aspect ratio mode
- [ ] `g` tag
- [ ] Gradation colors
- [ ] No fixed transform attribute
- [ ] Zoom
- [ ] Handle `defs`, `use`
- [ ] Handle images

## License

MIT
