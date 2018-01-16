module ViewBuilder exposing (..)

import Types exposing (..)
import Html exposing (..)
import Html.Attributes exposing (attribute, value)
import Html.Events exposing (..)
import Svg exposing (svg, ellipse, rect, circle, polygon, polyline, path)
import Svg.Attributes exposing (..)
import Material.Toggles as Toggles
import Material.Slider as Slider
import Material.Options as Options
import Material.Typography as Typo
import Material.Elevation as Elevation
import Material.Grid exposing (grid, noSpacing, cell, size, Device(..))
import Color.Convert exposing (..)
import Vec2 exposing (..)
import Utils
import Set exposing (Set)
import ShapeList exposing (..)
import Tuple exposing (first, second)
import Dict exposing (Dict)
import Shape
import Color

-- モデル所有のSVGモデルのDOMを構築する
build : LayerType -> Model -> StyledSVGElement -> Html Msg
build layerType model svg =
  let
    layerPrefix = case layerType of
      ColorLayer -> "c"
      PhysicsLayer -> "p"
    rdomId = "svgeditor" ++ (toString svg.id) ++ layerPrefix
    -- 元からあったunknownな属性はそのまま入れる
    -- idだけは一時的に上書きする
    attrList = Dict.insert "id" rdomId svg.attr |> Dict.toList |> List.map (\(x, y) -> attribute x y)
    styleStr =
      Dict.insert "opacity" "0" svg.style |>
      (
        case layerType of
          ColorLayer -> \x -> x                         -- 色レイヤでは透明だが色を保持する
          PhysicsLayer -> Dict.insert "fill" "#000000"  -- 物理レイヤでは黒色かつ透明にする
      ) |>
      Dict.toList |> List.map (\(x, y) -> x ++ ":" ++ y) |> String.join ";"
    -- 物理レイヤでは HandMode, NodeModeのときだけ図形にクリック判定を与える
    itemClick = case layerType of
      ColorLayer -> []
      PhysicsLayer ->
        case model.mode of
          HandMode ->
            [Utils.onItemMouseDown <| \(shift, pos) -> OnSelect svg.id shift pos]
          NodeMode ->
            [Utils.onItemMouseDown <| \(shift, pos) -> OnSelect svg.id shift pos]
          _ -> []
  in
  case svg.shape of
  Rectangle {leftTop, size} ->
    let left = leftTop -# size /# (2, 2) in
    rect (attrList ++ itemClick ++ [
      x (toString  <| Tuple.first leftTop ),
      y (toString <| Tuple.second leftTop),
      width (toString <| Tuple.first size),
      height (toString <| Tuple.second size),
      style styleStr
    ]) []
  Ellipse {center, size} ->
    let centx = Tuple.first center in
    let centy = Tuple.second center in
    let sizex = Tuple.first size in
    let sizey = Tuple.second size in
    ellipse (attrList ++ itemClick ++ [
      cx (toString centx),
      cy (toString centy),
      rx (toString (sizex / 2)),
      ry (toString (sizey / 2)),
      style styleStr
    ]) []
  Polygon pgn ->
    (if pgn.enclosed then polygon else polyline) (attrList ++ itemClick ++ [
      points (String.join "," (List.map (\(x,y) -> (toString x ++ " " ++ toString y)) pgn.points)),
      style styleStr
    ]) []
  Path {operators} ->
    let
      opstr: PathOperator -> String
      opstr op = op.kind ++ " " ++ (String.join "," (List.map (\(x,y) -> (toString x ++ " " ++ toString y)) op.points))
      pathopstr = List.map opstr (List.reverse operators) |> String.join " "
    in
    Svg.path (attrList ++ itemClick ++ [
      d pathopstr,
      style styleStr   
    ]) []
  Stop ->
    Svg.stop (attrList ++ [
      style styleStr
    ]) []
  SVG {elems, size} ->
    Svg.svg (attrList ++ [
      width (toString <| Tuple.first size),
      height (toString <| Tuple.second size)
    ]) (List.map (build layerType model) elems)
  Defs {elems} ->
    Svg.defs attrList (List.map (build layerType model) elems)
  LinearGradient {stops} ->
    Svg.linearGradient attrList (List.map (build layerType model) stops)
  RadialGradient {stops} ->
    Svg.radialGradient attrList (List.map (build layerType model) stops)
  Unknown {name, elems} ->
    node name attrList (List.map (build layerType model) elems) -- unknownは編集できないのでstyleStrはいらないはずである

-- handModeでの選択頂点などを与える
buildVertexes : Model -> List (Html Msg)
buildVertexes model = 
  let
    svglst : List StyledSVGElement
    svglst = List.map (\k -> Utils.getById k model) (Set.toList model.selected) |> Utils.flatten

    box : Box
    box = getMergedBBox svglst

    left = first box.leftTop
    top = second box.leftTop
    right = first box.rightBottom
    bottom = second box.rightBottom

    positions = [
      (left, top),
      ((left + right) / 2, top),
      (right, top),
      (left, (top + bottom) / 2),
      (right, (top + bottom) / 2),
      (left, bottom),
      ((left + right) / 2, bottom),
      (right, bottom)
    ]
  in
  if List.length svglst == 0 then [] else
  List.map2
    (\pos -> \anti -> circle [
        cx <| toString (first pos),
        cy <| toString (second pos),
        r "5",
        fill "#AA5533",
        stroke "#553311",
        Utils.onItemMouseDown <| \(shift, pos) -> OnVertex anti pos
      ] [])
    positions (List.reverse positions)

-- ノードモードでのノードを表示する
buildNodes: Model -> List (Html Msg)
buildNodes model =
  let
    svglst : List StyledSVGElement
    svglst = List.map (\k -> Utils.getById k model) (Set.toList model.selected) |> Utils.flatten
    positions = case List.head svglst of
      Just selected -> Shape.getPoints selected
      Nothing -> []
    nodeIds = List.range 0 (List.length positions - 1)
  in
  List.map2
    (\pos -> \nodeId -> circle [
        cx <| toString (first pos),
        cy <| toString (second pos),
        r "5",
        fill "#AA5533",
        stroke "#553311",
        Utils.onItemMouseDown <| \(shift, pos) -> OnNode pos nodeId
      ] [])
    positions nodeIds

colorPicker: String -> Model -> List (Html Msg)
colorPicker sty model =
  let
    colorPickerState = Maybe.withDefault {isOpen = False, colorMode = NoneColor, singleColor = Color.black} <| Dict.get sty model.colorPicker
    noneInserted = Dict.insert sty {colorPickerState | colorMode = NoneColor} model.colorPicker
    singleInserted = Dict.insert sty {colorPickerState | colorMode = SingleColor} model.colorPicker
    anyInserted url = Dict.insert sty {colorPickerState | colorMode = AnyColor url} model.colorPicker
    isOpenToggled = Dict.insert sty {colorPickerState | isOpen = not colorPickerState.isOpen} model.colorPicker
    hsl = Utils.toHsl2 colorPickerState.singleColor
    cgHue hue = Dict.insert sty {colorPickerState | singleColor = Color.hsla hue hsl.saturation hsl.lightness hsl.alpha} model.colorPicker
    cgSat sat = Dict.insert sty {colorPickerState | singleColor = Color.hsla hsl.hue sat hsl.lightness hsl.alpha} model.colorPicker
    cgLig lig = Dict.insert sty {colorPickerState | singleColor = Color.hsla hsl.hue hsl.saturation lig hsl.alpha} model.colorPicker
    cgAlp alp = Dict.insert sty {colorPickerState | singleColor = Color.hsla hsl.hue hsl.saturation hsl.lightness alp} model.colorPicker
    gradients = Utils.getGradients model
    gradientUrls = List.map .attr gradients |> List.map (Dict.get "id") |> Utils.flatten |> List.map (\x -> "#" ++ x)
    flex = "display: flex"
  in
  [
    div [style flex] ([
      Options.styled p [Typo.subhead, Options.css "width" "60px"] [text <| sty ++ ":"],
      Options.div [
        if colorPickerState.isOpen then Elevation.e0 else Elevation.e4,
        Elevation.transition 300,
        Options.css "width" "48px",
        Options.css "height" "48px",
        Options.css "background" (case colorPickerState.colorMode of    -- 色表示の四角形
          NoneColor -> "hsla(0, 0%, 100%, 0.1)"
          SingleColor -> Utils.colorToCssHsla2 colorPickerState.singleColor
          AnyColor url -> "hsla(0, 0%, 100%, 0.1)"
        ),
        Options.center,
        Options.onClick <| ColorPickerMsg isOpenToggled
      ] (
        case colorPickerState.colorMode of
          NoneColor -> [text "none"]
          SingleColor -> []
          AnyColor url -> [text "other"]
      )
    ] ++ (
      case colorPickerState.isOpen of
        False -> []
        True ->
          [
              (
                div [style "display: flex; flex-direction: column; margin: 0px 10px"] ([
                  Toggles.radio Mdl [0] model.mdl [
                    Options.onToggle <| ColorPickerMsg noneInserted,
                    Toggles.value (colorPickerState.colorMode == NoneColor)
                  ] [text "none"],
                  Toggles.radio Mdl [1] model.mdl [
                    Options.onToggle <| ColorPickerMsg singleInserted,
                    Toggles.value (colorPickerState.colorMode == SingleColor)
                  ] [text "single"]
                ] ++ List.indexedMap
                  (
                    \index -> \url ->
                      Toggles.radio Mdl [2 + index] model.mdl [
                        Options.onToggle <| ColorPickerMsg <| anyInserted url, Toggles.value (colorPickerState.colorMode == AnyColor url)
                      ] [text url]
                  )
                  gradientUrls
                )
              )
          ]
        ++ (
          case colorPickerState.colorMode of
            NoneColor -> []
            AnyColor url -> []
            SingleColor -> [
              div [] [
                div [ style flex ] [
                  Options.styled p [Typo.body1] [text "H: "],
                  Slider.view [Slider.value (hsl.hue * 180 / pi), Slider.min 0, Slider.max 359, Slider.step 1, Slider.onChange (\f -> ColorPickerMsg <| cgHue (degrees f))]
                ],
                div [ style flex ] [
                    Options.styled p [Typo.body1] [text "S: "],
                    Slider.view [Slider.value (hsl.saturation * 100), Slider.min 0, Slider.max 100, Slider.step 1, Slider.onChange (\f -> ColorPickerMsg <| cgSat (f / 100))]
                ],
                div [ style flex ] [
                    Options.styled p [Typo.body1] [text "L: "],
                    Slider.view [Slider.value (hsl.lightness * 100), Slider.min 0, Slider.max 100, Slider.step 1, Slider.onChange (\f -> ColorPickerMsg <| cgLig (f / 100))]
                ],
                div [ style flex ] [
                    Options.styled p [Typo.body1] [text "A: "],
                    Slider.view [Slider.value hsl.alpha, Slider.min 0, Slider.max 1, Slider.step 0.01, Slider.onChange (\f -> ColorPickerMsg <| cgAlp f)]
                ]
              ]
            ]
        )))
  ]
