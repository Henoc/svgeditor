module Gradients exposing (..)

import Types exposing (..)
import Utils2
import Utils
import Tuple exposing (..)
import Dict exposing (Dict)
import Color exposing (Color)

toCssGradientName: GradientType -> String
toCssGradientName gradientType = case gradientType of
  Linear -> "linear-gradient"
  Radial -> "radial-gradient"

toCssGradient: String -> GradientInfo -> String
toCssGradient sharpedUrl ginfo =
  let
    urlNoSharp = String.right 1 sharpedUrl
    expandStops stops = case stops of
      hd :: tl ->
        let
          percent = (toString <| first hd) ++ "%"
          colorString = Utils2.colorToCssHsla2 (second hd)
        in
        (colorString ++ " " ++ percent) :: expandStops tl
      [] -> []
    leftOrNone gType = case gType of
      Linear -> "to right, "
      Radial -> ""
  in
  toCssGradientName ginfo.gradientType ++ "(" ++ (leftOrNone ginfo.gradientType) ++ (String.join "," (expandStops ginfo.stops)) ++ ")"

-- 与えられたgradElemがグラデーション要素ならば、idの一致したGradientInfoで更新する
updateGradient: Dict String GradientInfo -> StyledSVGElement -> StyledSVGElement
updateGradient definedGradients gradElem =
  let
    getOrderedGradInfo ginfo = ginfo.stops |> List.sortBy first
    loop stops orderedInfo = case (stops, orderedInfo) of
      (stopHd :: stopTl, orderedInfoHd :: orderedInfoTl) -> case stopHd.shape of
        Stop _ -> {stopHd | shape = Stop {offset = Just <| first orderedInfoHd, color = Just <| second orderedInfoHd}} :: loop stopTl orderedInfoTl
        _ -> stopHd :: loop stopTl orderedInfo
      _ -> stops
  in
  case gradElem.shape of
    LinearGradient {identifier, stops} -> case Dict.get identifier definedGradients of
      Just ginfo ->
        {gradElem | shape = LinearGradient {identifier = identifier, stops = loop stops (getOrderedGradInfo ginfo)}}
      Nothing ->
        gradElem
    RadialGradient {identifier, stops} -> case Dict.get identifier definedGradients of
      Just ginfo ->
        {gradElem | shape = RadialGradient {identifier = identifier, stops = loop stops (getOrderedGradInfo ginfo)}}
      Nothing ->
        gradElem
    other -> gradElem

-- intはsvgeditor-id
makeStops: Int -> List (Int, Color) -> (List StyledSVGElement, Int)
makeStops i colors =
  let
    lst = colors
      |> List.indexedMap (\index (offset, color) -> {
      style = Dict.empty,
      attr = Dict.empty,
      id = i + index,
      shape = Stop {offset = Just offset, color = Just color}
    })
  in
  (lst, List.length lst + i)

addElemInDefs: StyledSVGElement -> Model -> Model
addElemInDefs elem model =
  let
    model2 = Utils.addElem {style = Dict.empty, attr = Dict.empty, id = model.idGen, shape = Defs {elems = [elem]}} {model | idGen = model.idGen + 1}
  in
  mergeAllDefs model2

mergeAllDefs: Model -> Model
mergeAllDefs model =
  let
    defsElems = Utils.getDefsElems model
    model2 = removeAllDefs model
  in
  Utils.addElem {style = Dict.empty, attr = Dict.empty, id = model.idGen, shape = Defs {elems = defsElems}} {model2 | idGen = model2.idGen + 1}

removeAllDefs: Model -> Model
removeAllDefs model =
  let
    elems = Utils.getElems model
    loop: List StyledSVGElement -> List StyledSVGElement
    loop lst = case lst of
      hd :: tl -> case hd.shape of
        Defs _ -> loop tl
        _ -> hd :: loop tl
      [] -> []
    newElems = loop elems
  in
  replaceElems newElems model

replaceElems: List StyledSVGElement -> Model -> Model
replaceElems elemlst model =
  let
    newShape = case model.svg.shape of
      SVG {elems, size} -> SVG {elems = elemlst, size = size}
      _ -> model.svg.shape
    modelSvg = model.svg
  in
  {model | svg = {modelSvg | shape = newShape}}