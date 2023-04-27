# Interactions in TraceViz

Interactivity is a key feature of performance tools.  Tools that allow users to
easily interact with the tool -- for example, filtering or searching their data,
drilling down into specific portions of the data, changing the view -- can be
significantly more effective than static tools.

TraceViz includes an expressive, flexible, and powerful mechanism to support
such user interactions and allow them to have effects throughout the tool and
even into the backend.  This document describes this mechanism.

The heart of TraceViz's interactions is the *Value*, which represents a single
piece of data sent from frontend to backend in a [request](./data_model.md),
sent from backend to frontend as a [response](./data_model.md), or staying
entirely in the frontend to support interactions.  To learn more about how
Values are used in frontend-backend communication in TraceViz, explore the
[TraceViz data model](./data_model.md).  To learn more about how TraceViz
backends and frontends cooperate in general, read about
[an example TraceViz tool](./a_traceviz_tool.md).

## Introduction to TraceViz interactions

Any UI interaction, in TraceViz or not, consists of a user performing some
action, like a click, mouseover, or scroll, which then produces some effect in
the UI, like sorting a table, showing a tooltip, or zooming into a chart.  In
TraceViz, a single interaction is divided into two halves: the front *action* --
the click, mouseover, scroll, or so forth -- and the back *reaction* -- the
sort, tooltip, zoom, or so forth.  Values sit between these two halves: actions
mutate Values as a result of user input, and reactions observe Values and do
work upon changes.

Any TraceViz component that can receive user input or change the view in
response to user input has its own [`Interactions`](../client/core/src/interactions/interactions.ts) instance.  This may be programmatically defined
in the tool or the component source, or may be specified in the tool template;
we'll use the [Angular interactions directive](../client/angular/traceviz/projects/ngx-traceviz-lib/src/core/interactions.directive.ts) as an example in
this document.

## 'Half-interactions': actions, reactions, and watches

`Interactions` understands three kinds of half-interaction:

*  [`Action`](../client/core/src/interactions/interactions.ts), which associates
   a *target* (e.g., `row`) that will receive the action, and a *type* (e.g.,
   `click`) of action, with a set of
   [`Update`s](../client/core/src/interactions/interactions.ts) which mutate
   Values, possibly from other Values, in arbitrary ways.
*  [`Reaction`](../client/core/src/interactions/interactions.ts), which also
   associates a *target* (e.g., `node`) and a *type* (e.g., `highlight`) with a
   [`Predicate`](../client/core/src/interactions/interactions.ts) testing
   conditions across a set of Values.  When the `Predicate`'s conditions are
   met, the specified reaction type is applied to the affected target.  `Predicates` can include Value comparators as well as Boolean operators.
*  [`Watch`](../client/core/src/interactions/interactions.ts), which associates
   a watch *type* (e.g., `show_time_marker`) with a key-Value map (e.g., a
   [`Timestamp`](../client/core/src/timestamp/timestamp.ts) Value called
   `marker_time`).  Watches behave something like asynchronous function calls:
   whenever any Values in the map change, the code that the component associated
   with the corresponding watch type is invoked.

The `Reaction` and `Watch` half-actions are similar in that both occupy the back
'reaction' half of a complete interaction.  `Reaction`s specify work that should
either be done, or not done, depending on the current tool state.  For example,

*   'When the global `selected_node_ids` Value includes this *node*'s `node_id` Value, *highlight* this *node*.'
*   'When the global `collection_name` Value is nonempty and has just changed, *fetch* this *data series*.'
*   'When the global `ui_features` Value contains the string `callgraph`, *show* a *callgraph* pane.'

Conversely, `Watch`es do arbitrary work depending on the *contents* of certain
values.  For example,

*   'When the global `marker_time` Value is within the collection's time-span
    (e.g., between two global Values `start_time` and `end_time`), *show a time
    marker* on an overtime chart.'
*   'In an arbitrarily long but paginated table, when the global `current_page`
    Value is close to one end of the currently-fetched portion of the table,
    fetch a new chunk of the table centered closer to that end.' (This would
    actually likely combine both a `Watch` on the `current_page` and the
    `first_fetched_page` and `last_fetched_page`, which updates
    `first_fetched_page` if a new chunk is needed, and a `Reaction` on
    `first_fetched_page` which would actually issue the backend fetch.)
*   'When the global `default_filter_text` Value has changed, *populate a text
    box* with `default_filter_text`'s contents.

## Examples

These examples use the
[Angular interactions directives](../client/angular/traceviz/projects/ngx-traceviz-lib/src/core/interactions.directive.ts),
but could also be implemented
[programmatically](../client/core/src/interactions/interactions.ts).

### Responding to a click

Suppose we have a tool, 'WidgetView', which shows a list of widgets, each of
which has a unique `string` identifier, along with an overtime line chart
showing how selected widgets' changed over time.  To support our desired
analysis workflows, we'd like to:

*   click on a widget in the list to 'select' that widget, replacing any
    previous selection (if the clicked widget was already selected, the click
    should clear the selection).
*   shift-click on a widget in the list to 'select' that widget, adding it to
    the current set of selected widgets (if the shift-clicked widget was already
    selected, the shift-click should deselect it).
*   keep the line chart up to date: whenever a new widget is selected, its
    series should be drawn in the chart.
*   highlight selected widgets in the list so that the user knows they're
    selected.

Looking over these requirements, it's clear that the tool must maintain an idea
of which widgets are currently selected.  This becomes part of the application's
[global state](./data_model.md):

```html
<widget-view-app>
    <app-core>
        <data-query>
            <!-- Not shown -->
        </data-query>

        <global-state>
            <value-map>
                <value key="selected-widget-ids"><string-set></string-set></value>
                <!-- Which data set to display. -->
                <value key="collection-name"><string></string></value>
                <!-- Other global values not shown -->
            </value-map>
        </global-state>
    </app-core>
    ...
```

Suppose we've written a [data source](./a_traceviz_tool.md) that supports a
`wv.widget_list` query whose response is compatible with a `<widget-list>`
component.  In that response, we attach a `widget-id` `string` property to
every widget.  We can use that to update the global `selected-widget-ids`
property, using actions.  Additionally, we can highlight widgets that are
currently selected with a reaction.

```html
    ...
    <widget-list>
        <data-series>
            <!-- Populate with the backend 'wv.widget_list' query. -->
            <query><string>wv.widget_list</string></query>
            <!-- Not shown -->
        </data-series>
        <interactions>
            <!-- When a widget is clicked, it should replace any other selected
                 widgets.  If it was already the selected widget, it should be
                 unselected.
             -->
            <action target="widget" type="click">
                <set-or-clear>
                    <global-ref key="selected-widget-ids"></global-ref>
                    <local-ref key="widget-id"></local-ref>
                </set-or-clear>
            </action>
            <!-- When a widget is shift-clicked, it should be added to the set
                 of selected widgets.  If it was already selected, it should
                 be unselected.
             -->
            <action target="widget" type="shift-click">
                <toggle>
                    <global-ref key="selected-widget-ids"></global-ref>
                    <local-ref key="widget-id"></local-ref>
                </toggle>
            </action>
            <!-- When a widget's ID is included in the set of selected widgets,
                 it should be highlighted.
             -->
            <reaction target="widget" type="highlight">
                <includes>
                    <global-ref key="selected-widget-ids">
                    <local-ref key="widget-id">
                </includes>
            </reaction>
        </interactions>
    </widget-list>
    ...
```

Note that the `<widget-list>` UI component needs to support the `click` and
`shift-click` actions, and the `highlight` reaction, on the `widget` target.
Different UI components support different sets of actions and reactions -- but,
as you can see, what *happens* on those supported actions is fully configurable.

Then, we want the line chart to stay in sync: it should refetch and rerender its
data, via backend query `wv.overtime_widgets`, whenever the set of selected widget IDs changes (actually, whenever the collection name is nonempty and
either the collection name or the selected widget ID set has recently changed.)

```html
    ...
    <line-chart>
        <data-series>
            <query><string>wv.overtime_widgets</string></query>
            <interactions>
                <reaction target="data-series" type="fetch">
                    <and>
                        <not><equal>
                            <global-ref key="collection-name"></global-ref>
                            <string></string>
                        </equal></not>
                        <or>
                            <changed><global-ref key="selected-widget-ids"></changed>
                            <changed><global-ref key="collection-name"></changed>
                        </or>
                    </and>
                </reaction>
            </interactions>
        </data-series>
        <interactions>
            <!-- Not shown -->
        </interactions>
    </line-chart>
<widget-view-app>
```

Note that here, the `<interactions>` containing the `data-series` `fetch`
reaction belongs to the `<line-chart>`'s `<data-series>`, because it's the
data series that is reacting to the changes.