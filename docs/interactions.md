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