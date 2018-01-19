module Main exposing (..)

import Material
import Material.Scheme
import Material.Button as Button
import Material.Toggles as Toggles
import Material.Options as Options
import Material.Slider as Slider
import Material.Typography as Typo
import Material.Elevation as Elevation
import Material.Grid exposing (grid, noSpacing, cell, size, Device(..))
import Ui.ColorPanel
import Ext.Color
import Html exposing (Html, button, div, text, node, p, img)
import Svg exposing (svg, ellipse, rect)
import Svg.Attributes exposing (..)
import Html.Events exposing (onClick, onInput, onMouseDown)
import Html.Attributes exposing (value, checked, src, attribute)
import Color
import Color.Convert exposing (..)
import Tuple exposing (first, second)
import Vec2 exposing (..)
import Set exposing (Set)
import Types exposing (..)
import Debug exposing (..)
import Utils
import Utils2
import ShapeMode
import HandMode
import NodeMode
import ViewBuilder
import Parsers
import Actions
import Traverse
import Dict exposing (Dict)
import Gradients

main : Program Never Model Msg
main =
  Html.program { init = init, view = view, update = update, subscriptions = subscriptions }


-- MODEL

init : ( Model, Cmd Msg )
init =
    {
      mdl = Material.model,
      mode = HandMode,
      dragBegin = Nothing,
      isMouseDown = False,
      svg = {style = Dict.empty, id = -1, attr = Dict.empty, shape = SVG {elems = [], size = (400, 400)}},
      styleInfo = Dict.fromList [("fill", "hsla(0, 50%, 50%, 1)"), ("stroke", "none")],
      idGen = 0,
      selected = Set.empty,
      fixedPoint = Nothing,
      nodeId = Nothing,
      selectedRef = [],
      clientLeft = 0,
      clientTop = 0,
      encoded = "",
      openedPicker = "none",
      colorPicker = Dict.fromList [
        ("fill", {colorMode = SingleColor, singleColor = Color.hsl (degrees 0) 0.5 0.5}),
        ("stroke", {colorMode = NoneColor, singleColor = Color.hsl (degrees 180) 0.5 0.5})
      ],
      colorPanel = Ui.ColorPanel.init (),
      gradients = Dict.empty
    } ! [Utils.getSvgData ()]


-- UPDATE

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
  case msg of
    Mdl msg_ ->
      Material.update Mdl msg_ model
 
    OnProperty changePropertyMsg -> case changePropertyMsg of
      SwichMode HandMode ->
        {model | mode = HandMode} ! []
      
      SwichMode NodeMode ->
        {model | mode = NodeMode} ! []

      SwichMode RectMode ->
        {model | mode = RectMode} ! [Utils.getBoundingClientRect "root"]

      SwichMode EllipseMode ->
        {model | mode = EllipseMode} ! [Utils.getBoundingClientRect "root"]
      
      SwichMode PolygonMode ->
        {model | mode = PolygonMode} ! [Utils.getBoundingClientRect "root"]
      
      SwichMode PathMode ->
        {model | mode = PathMode} ! [Utils.getBoundingClientRect "root"]        

      Style styleInfo -> case model.mode of
        HandMode ->
          let newModel = HandMode.changeStyle styleInfo model in
          if model /= newModel then newModel ! [Utils.reflectSvgData newModel]
          else model ! []
        NodeMode ->
          let newModel = HandMode.changeStyle styleInfo model in
          if model /= newModel then newModel ! [Utils.reflectSvgData newModel]
          else model ! []
        _ -> {model| styleInfo = styleInfo} ! []
    
    OnAction action -> case action of
      Duplicate ->
        (Actions.duplicate model) ! []
      Delete ->
        (Actions.delete model) ! []
      BringForward ->
        (Actions.bringForward model) ! []
      SendBackward ->
        (Actions.sendBackward model) ! []

    OnMouse onMouseMsg ->
      case model.mode of
      HandMode ->
        let newModel = HandMode.update onMouseMsg model in
        if model /= newModel then newModel ! [Utils.reflectSvgData newModel]
        else model ! []
      NodeMode ->
        let newModel = NodeMode.update onMouseMsg model in
        if model /= newModel then newModel ! [Utils.reflectSvgData newModel]
        else model ! []
      _ ->
        case onMouseMsg of
          -- マウス押しはここではなく、svgの枠で判定する
          MouseDownLeft pos -> model ! []
          MouseDownRight pos -> model ! []
          _ -> case model.mode of
            PolygonMode ->
              let newModel = ShapeMode.updatePolygon onMouseMsg model in
              if model /= newModel then newModel ! [Utils.reflectSvgData newModel]
              else model ! []
            PathMode ->
              let newModel = ShapeMode.updatePath onMouseMsg model in
              if model /= newModel then newModel ! [Utils.reflectSvgData newModel]
              else model ! []
            _ ->
              let newModel = ShapeMode.update onMouseMsg model in
              if model /= newModel then newModel ! [Utils.reflectSvgData newModel]
              else model ! []
    
    OnSelect ident isAdd pos ->
      let
        gradients = Utils.getGradients model
        gradientIds = List.map .attr gradients |> List.map (Dict.get "id") |> Utils.flatten
      in
      case model.mode of
      HandMode -> (HandMode.select ident isAdd pos model) ! [Utils.getStyle (ident, "color"), Utils.getGradientStyles gradientIds]
      NodeMode -> (NodeMode.select ident pos model) ! [Utils.getStyle (ident, "color"), Utils.getGradientStyles gradientIds]
      _ -> model ! [Utils.getGradientStyles gradientIds]
    
    -- svg枠内のクリックについて
    FieldSelect (button, pos) ->
      case model.mode of
        HandMode -> (HandMode.noSelect model) ! []
        NodeMode -> (NodeMode.noSelect model) ! []
        _ ->
          let
            onMouseMsg = case button of
              0 -> MouseDownLeft pos
              _ -> MouseDownRight pos
          in case model.mode of
            PolygonMode ->
              let newModel = ShapeMode.updatePolygon onMouseMsg model in
              if model /= newModel then newModel ! [Utils.reflectSvgData newModel]
              else model ! []
            PathMode ->
              let newModel = ShapeMode.updatePath onMouseMsg model in
              if model /= newModel then newModel ! [Utils.reflectSvgData newModel]
              else model ! []
            _ ->
              let newModel = ShapeMode.update onMouseMsg model in
              if model /= newModel then newModel ! [Utils.reflectSvgData newModel]
              else model ! []
    
    OnVertex fixed mpos -> case model.mode of
      HandMode -> (HandMode.scale fixed mpos model) ! []
      _ -> model ! []
    
    OnNode mpos nodeId -> case model.mode of
      NodeMode -> (NodeMode.nodeSelect nodeId mpos model) ! []
      _ -> model ! []
    
    SvgData svgData ->
      case Parsers.parseSvg svgData of
        Just (nextId, data) -> {model| svg = data, idGen = nextId} ! [Utils.encodeURIComponent svgData]
        Nothing -> model ! []
    
    EncodedSvgData encoded ->
      {model| encoded = "data:image/svg+xml," ++ encoded} ! []
    
    SvgRootRect rect ->
      {model| clientLeft = rect.left, clientTop = rect.top} ! []
    
    -- 選択されたオブジェクトのスタイルを計算してcolorPickerStates, styleInfoを更新
    ComputedStyle maybeStyle ->
      let
        colorPickerStates = model.colorPicker
        styleInfo = model.styleInfo
        (newColorPickerStates, newStyleInfo) = case maybeStyle of
          Just styleObject ->
            let
              colorTypeFill = Parsers.rgbToColorType styleObject.fill (Result.withDefault 1 <| String.toFloat styleObject.fillOpacity)
              colorTypeStroke = Parsers.rgbToColorType styleObject.stroke (Result.withDefault 1 <| String.toFloat styleObject.strokeOpacity)
              hslaStrFill = Utils.colorTypeToStr colorTypeFill
              hslaStrStroke = Utils.colorTypeToStr colorTypeStroke

              pickerFill = Maybe.withDefault {colorMode = NoneColor, singleColor = Color.black} <| Dict.get "fill" model.colorPicker
              pickerStroke = Maybe.withDefault {colorMode = NoneColor, singleColor = Color.black} <| Dict.get "stroke" model.colorPicker
              
              newPickerFill = case colorTypeFill of
                NoneColorType -> {pickerFill | colorMode = NoneColor}
                SingleColorType c -> {pickerFill | colorMode = SingleColor, singleColor = c}
                AnyColorType ident -> {pickerFill | colorMode = AnyColor ident}
              newPickerStroke = case colorTypeStroke of
                NoneColorType -> {pickerStroke | colorMode = NoneColor}
                SingleColorType c -> {pickerStroke | colorMode = SingleColor, singleColor = c}
                AnyColorType ident -> {pickerStroke | colorMode = AnyColor ident}
            in
            (
              Dict.insert "fill" newPickerFill << Dict.insert "stroke" newPickerStroke <| colorPickerStates,
              Dict.insert "fill" hslaStrFill << Dict.insert "stroke" hslaStrStroke <| styleInfo
            )
          Nothing -> (colorPickerStates, styleInfo)
      in
      {model | colorPicker = newColorPickerStates, styleInfo = newStyleInfo} ! []
    
    OpenedPickerMsg styleName ->
      {model | openedPicker = styleName} ! []

    GradientStyles stopStyles ->
      let
        dict = stopStyles
          |> List.map (\ginfo ->
              let
                ident = ginfo.ident
                tagName = ginfo.tagName
                styleObjects = ginfo.styles
                stopColorDicts =
                  styleObjects
                  |> List.map (\obj ->
                      (
                        Parsers.percentToFloat obj.offset,
                        Parsers.rgbToColor obj.stopColor (Result.withDefault 1 <| String.toFloat obj.stopOpacity)
                      )
                    )
                  |> Dict.fromList
              in
              (
                ident,
                {
                  gradientType = if tagName == "linearGradient" then Linear else Radial,
                  stops = stopColorDicts
                }
              )
            )
          |> Dict.fromList
        definedGradients = Dict.union dict model.gradients

        -- 新しい definedGradients で全ての XXGradient を更新
        newModelSvg = Traverse.traverse model.svg <| Gradients.updateGradient definedGradients
      in
      {model | gradients = definedGradients, svg = newModelSvg} ! []

    ColorPickerMsg colorPickerStates ->
      let
        -- カラーピッカーの状態をもとに styleInfo を更新
        loop : List (String, ColorPickerState) -> StyleInfo -> StyleInfo
        loop cols styleInfo = case cols of
          hd :: tl ->
            let
              part = first hd
              colorState = second hd
              newStyleInfo = case colorState.colorMode of
                  NoneColor -> Dict.insert part "none" styleInfo
                  SingleColor -> Dict.insert part (Utils2.colorToCssHsla2 colorState.singleColor) styleInfo
                  AnyColor url -> Dict.insert part ("url(" ++ url ++ ")") styleInfo
            in
            loop tl newStyleInfo
          [] -> styleInfo
        colorPickerStatesList = Dict.toList colorPickerStates
        newStyleInfo = loop colorPickerStatesList model.styleInfo
        newModel = {model | colorPicker = colorPickerStates}
      in
      update (OnProperty (Style newStyleInfo)) newModel
    
    ColorPanelMsg msg_ ->
      let
        (updated, cmd) = Ui.ColorPanel.update msg_ model.colorPanel
      in
      {model | colorPanel = updated} ! [Cmd.map ColorPanelMsg cmd]
    
    ColorPanelChanged uiColor ->
      let
        normalColor = Ext.Color.hsvToRgb uiColor
        colorPickerState = Maybe.withDefault {colorMode = NoneColor, singleColor = Color.black} <| Dict.get model.openedPicker model.colorPicker
        renewedPickers =  Dict.insert model.openedPicker {colorPickerState | singleColor = normalColor} model.colorPicker
      in
      update (ColorPickerMsg renewedPickers) model
-- VIEW


view : Model -> Html Msg
view model =
  let styleInfo = model.styleInfo in
  let
    -- ボタンの追加CSS
    buttonCss =
      Options.css "color" "currentColor"
    
    -- メニュー以外の部分
    rootDiv =
      Options.div [
        Elevation.e8,
        Options.attribute <| Html.Attributes.id "root",
        Options.css "width" <| (toString <| Tuple.first <| Utils.getSvgSize model) ++ "px",
        Options.css "height" <| (toString <| Tuple.second <| Utils.getSvgSize model) ++ "px"
      ] [
        -- 画像としてのsvg
        img [
          id "svgimage",
          src <| model.encoded
        ] [],
        -- 色取得用svg
        svg [
          width (toString <| Tuple.first <| Utils.getSvgSize model),
          height (toString <| Tuple.second <| Utils.getSvgSize model)
        ]
        (List.map (ViewBuilder.build ColorLayer model) (Utils.getElems model)),
        -- 当たり判定用svg
        svg [
          width (toString <| Tuple.first <| Utils.getSvgSize model),
          height (toString <| Tuple.second <| Utils.getSvgSize model),
          Utils.onFieldMouseDown FieldSelect
        ]
        ((List.map (ViewBuilder.build PhysicsLayer model) (Utils.getElems model)) ++ (case model.mode of
          NodeMode -> ViewBuilder.buildNodes model
          HandMode -> ViewBuilder.buildVertexes model
          _ -> []
        ))
      ]
    
    colorPickers = [
        div [] <| ViewBuilder.colorPicker "fill" model,
        div [] <| ViewBuilder.colorPicker "stroke" model,
        let
          sw = case Dict.get "stroke-width" model.styleInfo of
            Nothing -> 1
            Just x -> Result.withDefault 1 <| String.toInt x
        in
        div [ style "display: flex" ] [
          Options.styled p [Typo.subhead] [text <| "stroke-width:"],
          Slider.view [Slider.value (toFloat sw), Slider.min 0, Slider.max 100, Slider.step 1, Slider.onChange (\n -> OnProperty <| Style <| Dict.insert "stroke-width" (toString n) styleInfo)]
        ]
      ]
    

  in
  div []
    ([
      div [] [
        let
          isSelected mode =
            if mode == model.mode then [Button.colored, Button.raised] else []
        in
        div [] [
          Button.render Mdl [0] model.mdl ([buttonCss, Options.onClick <| OnProperty <| SwichMode HandMode] ++ isSelected HandMode) [text "hand"],
          Button.render Mdl [1] model.mdl ([buttonCss, Options.onClick <| OnProperty <| SwichMode NodeMode] ++ isSelected NodeMode) [text "node"],
          Button.render Mdl [2] model.mdl ([buttonCss, Options.onClick <| OnProperty <| SwichMode RectMode] ++ isSelected RectMode) [text "rectangle"],
          Button.render Mdl [3] model.mdl ([buttonCss, Options.onClick <| OnProperty <| SwichMode EllipseMode] ++ isSelected EllipseMode) [text "ellipse"],
          Button.render Mdl [4] model.mdl ([buttonCss, Options.onClick <| OnProperty <| SwichMode PolygonMode] ++ isSelected PolygonMode) [text "polygon"],
          Button.render Mdl [5] model.mdl ([buttonCss, Options.onClick <| OnProperty <| SwichMode PathMode] ++ isSelected PathMode) [text "path"]
        ],
        div [] [
          Button.render Mdl [6] model.mdl [buttonCss, Options.onClick <| OnAction <| Duplicate] [text "duplicate"],
          Button.render Mdl [7] model.mdl [buttonCss, Options.onClick <| OnAction <| Delete] [text "delete"],
          Button.render Mdl [8] model.mdl [buttonCss, Options.onClick <| OnAction <| BringForward] [text "bring forward"],
          Button.render Mdl [9] model.mdl [buttonCss, Options.onClick <| OnAction <| SendBackward] [text "send backward"]
        ]
      ],
      rootDiv
    ] ++ colorPickers)
  |> Material.Scheme.top



-- SUBSCRIPTION

subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.batch
        [
          Utils.getSvgDataFromJs SvgData,
          Utils.encodeURIComponentFromJs EncodedSvgData,
          Utils.getMouseDownLeftFromJs <| OnMouse << MouseDownLeft,
          Utils.getMouseDownRightFromJs <| OnMouse << MouseDownRight,
          Utils.getMouseUpFromJs <| OnMouse << MouseUp,
          Utils.getMouseMoveFromJs <| OnMouse << MouseMove,
          Utils.getBoundingClientRectFromJs SvgRootRect,
          Utils.getStyleFromJs ComputedStyle,
          Utils.getGradientStylesFromJs GradientStyles,
          Sub.map ColorPanelMsg (Ui.ColorPanel.subscriptions model.colorPanel),
          Ui.ColorPanel.onChange ColorPanelChanged model.colorPanel
        ]