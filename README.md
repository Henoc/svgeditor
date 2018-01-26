# SVG Editor

![sample](images/out.gif)

Now your VSCode can mutate to an interactive visual & literal SVG editor 😎

You can create shapes using the SVG's coder or directly creating shapes with the shaping tool.

## Commands

- New File with SVG Editor
  - Open untitled file with SVG template.
- Open SVG Editor
  - Target active SVG tab to edit with SVG Editor.

## Kinds of operation

- Select mode
  - Scale and translate.
- Node mode
  - Edit node of polyline, polygon.
- Rectangle, ellipse, polygon, path mode
  - Make new objects.
- Gradient mode
  - Define linear or radial gradients.

## Future plans

- [x] Reimplement rotation
- [x] Reimplement path mode
- [ ] Reimplement text mode
- [ ] Reimplement group and ungroup
- [x] Reflect embedded CSS in SVG
- [ ] Attributes output style options
- [ ] Scale objects with fixed aspect ratio mode
- [x] `defs` tag
- [ ] `use` tag
- [ ] `marker` tag
- [ ] unit
- [x] Gradation colors
- [ ] Transform attribute
- [x] Zoom
- [ ] Handle images

## ChangeLog

- 0.15.0 Add node increment and decrement operation
- 0.14.1 Fix a bug text disappears
- 0.14.0 Support scale-up and scale-down
- 0.13.0 Support align
- 0.12.0 Implement rotation again
- 0.11.0 Support "object to path" operation
- 0.10.2 Fix path bug
- 0.10.1 Fix opacity bug
- 0.10.0 Introduce SVGO for each output
- 0.9.0 Support some stroke attributes
- 0.8.1 Get better
- 0.8.0 Renewal gradient features as gradient mode
- 0.7.0 Support linear and radial gradients
- 0.6.0 Use elm-mdl
- 0.5.3 Fix display size
- 0.5.2 Fix color in hand mode
- 0.5.1 Get better
- 0.5.0 Enable to resolve reference. Elements filled with linearGradient are recognized correct for example.
- 0.4.5 Fix bug of new file command
- 0.4.4 Add path mode again
- 0.4.3 Add opacity adjustment button and fix style bugs
- 0.4.2 Enable to select path element again
- 0.4.1 Support embedded CSS again
- 0.4.0 Reimplement with Elm. Many things have improved, but some functions are temporary unavailable 😥
- 0.3.0 Added group and ungroup button, improved right click menu
- 0.2.0 Affected embedded CSS in SVG
- 0.1.0 Released

## License

MIT
