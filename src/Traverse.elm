module Traverse exposing (..)

import Types exposing (..)
import Utils

traverse : (StyledSVGElement -> StyledSVGElement) -> StyledSVGElement -> StyledSVGElement
traverse fn elem =
    case elem.shape of
        SVG { elems, size } ->
            let
                newElems =
                    elems |> List.map (traverse fn)
            in
            fn { elem | shape = SVG { elems = newElems, size = size } }

        Defs { elems } ->
            let
                newElems =
                    elems |> List.map (traverse fn)
            in
            fn { elem | shape = Defs { elems = newElems } }

        Unknown { name, elems } ->
            let
                newElems =
                    elems |> List.map (traverse fn)
            in
            fn { elem | shape = Unknown { name = name, elems = newElems } }

        _ ->
            fn elem

-- Resolve Later parameters

accumulateCommands: StyledSVGElement -> Cmd Msg
accumulateCommands elem =
    case elem.shape of
        SVG { elems, size } ->
            let
                commands =
                    elems |> List.map accumulateCommands
            in
            Cmd.batch commands

        Defs { elems } ->
            let
                commands =
                    elems |> List.map accumulateCommands
            in
            Cmd.batch commands

        Unknown { name, elems } ->
            let
                commands =
                    elems |> List.map accumulateCommands
            in
            Cmd.batch commands

        Text { elems, baseline, leftTop, size } ->
            let
                commands =
                    elems |> List.map accumulateCommands
            in
            Cmd.batch ((Utils.getTextSize elem.id) :: commands)

        _ ->
            Cmd.none
