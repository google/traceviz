# TraceViz data model

[A TraceViz tool](./a_traceviz_tool.md) describes how TraceViz handles all
client-server communication: it bundles and debounces data requests from the
frontend and sends them to the backend, which then routs requests to the proper
data sources, bundles the responses, and sends them back to the frontend.  When
the TraceViz client receives these responses, it routes them to the right
components.

This design streamlines communication between backend and frontend such that one
can build a decent tool without knowing much more than the previous paragraph.
However, learning more about the TraceViz data model can help ensure that your
tools are responsive and effective, and is recommended for engineers hoping to
provide new backend and frontend data helpers or to build new UI components.
This document describes the TraceViz data model in depth.

## Values and Value maps

The heart of the TraceViz data model is the *Value*, which represents a single
piece of data sent from frontend to backend in a request, sent from backend to
frontend as a response, or staying entirely in the frontend to support
[interactions](./interactions.md).  Wherever it appears, a Value is essentially
a union type, and can be a string, list or set of strings, integer, list or set
of integers, double, duration, or timestamp.  On the frontend, a
[Value](../client/core/src/value/value.ts) is also an [RxJS](https://rxjs.dev)
[observable](https://rxjs.dev/guide/observable), allowing code to subscribe to
it to observe its changes.

Values generally do not appear alone, but appear in (string-)key/Value maps.
In this context, they act as variables or properties: a Value's key is its name,
and the Value itself can contain an arbitrary value which might change.  Value
maps appear in requests, responses, and throughout the frontend tool template.

## Requests from frontend to backend

Each frontend component that needs to fetch data from the backend creates a
[`DataSeriesQuery`](../client/core/src/data_series_query/data_series_query.ts),
providing it with the name of the query to fetch (which should be supported by a
backend [data source](./a_traceviz_tool.md)), a map of parameter Values
(essentially, the parameters to the query), and a Boolean RxJS observable whose
rising edge forces the query to be fetched (a changing parameter Value also
forces a refetch).  This observable is how user [interactions] can result in
updated views.

A fetching `DataSeriesQuery` creates a
[`SeriesRequest`](../client/core/src/protocol/request_interface.ts), which
consists of the query name, a series name used to route the response back to the
requesting component, and a Value map of parameters.  This `SeriesRequest` is
then sent on to the tool's global singleton
[`DataQuery`](../client/core/src/data_query/data_query.ts).  The `DataQuery`
bundles `SeriesRequest`s that arrive close together into a single
[`Request`](../client/core/src/protocol/request_interface.ts).  This `Request`
also includes another Value map of global filters.  Using these filters is
optional, but it can improve tool responsiveness by allowing the backend to
serve multiple outstanding queries from one expensive computation.

After the `DataQuery`'s debounce interval, the completed `Request` is sent on to
the backend.  By default, both `SeriesRequest` and `Request` are marshaled to
[JSON](../client/core/src/protocol/json_request.ts) before being sent to the
backend.

## Handling frontend requests in the backend

In the Go tool backend, an incoming `Request` is sent to the
[`QueryDispatcher`](../server/go/query_dispatcher/query_dispatcher.go), which
examines its `SeriesRequests`' query names to determine which data sources
should satisfy them.  For each such data source, and in parallel, the
`QueryDispatcher` then invokes that data source's
[`HandleDataSeriesRequests`](../server/go/query_dispatcher/query_dispatcher.go)
method, providing four values:

*   `ctx context.Context`: The incoming request's
    [context](https://pkg.go.dev/context), which can be monitored for request
    cancellation and provided to downstream IO operations.
*   `globalState map[string]*util.V`, a Value map of global (that is,
    `Request`-level) filters.
*   `drb *util.DataResponseBuilder`, a utility type that the data source should
    use to construct its response.
*   `reqs []*util.DataSeriesRequest`, the bundle of all `SeriesRequest`s from
    the current `Request` to be satisfied by this data source.

and returning an error which, if non-`nil`, will be sent to the frontend and
displayed to the user.

It's then up to each data source to examine each request and assemble a suitable
response.  When all data sources' `HandleDataSeriesRequests` calls have
returned, the `QueryDispatcher` assembles them into a [`Data`](../server/go/util/util.go) response and forwards them back to the frontend.

TraceViz places only one requirement on how a data source should satisfy its
`SeriesRequests`: to satisfy a given `req DataSeriesRequest`, the data source
should invoke `var series util.DataBuilder = drb.DataSeries(req)`, then
construct its response within `series`.  Nonetheless, while not strictly
mandatory, some design patterns have proven useful:

*   All
    [UI components](../client/angular/traceviz/projects/ngx-traceviz-lib/components/)
    provided with the core TraceViz distribution expect the data they use to be
    in a specific, component-appropriate, format; for example, a
    [`<data-table>`](../client/angular//traceviz/projects/ngx-traceviz-lib/components/data-table/)
    expects data in a particular [tabular](../server/go/table/table.go) format,
    and all formats expected by core TraceViz components have corresponding
    data-marshaling helpers which provide clean programmatic interfaces to the
    data.  These helpers should *always* be used, and when writing new TraceViz
    UI components, similar helpers should also be provided.
*   [A TraceViz tool](./a_traceviz_tool.md) describes loading and preprocessing
    complex profile data into an in-memory structure, then storing that
    structure in an LRU cache.  This approach helps ensure a responsive user
    experience, and, when the same profile is explored in collaboration by
    several users, can amortize expensive results processing.  The cached
    profile structure may be immutable, or may even support (with proper
    synchronization) iterative processing.
*   The `globalState` Value map may be used to perform expensive query
    preprocessing just once for each batch of queries.  In real TraceViz tools,
    a single user action can often result in several queries being refetched,
    many of which require the same preprocessing.
*   If multiple `DataSeriesRequest`s are provided, they may be handled 
    concurrently.

## Values in the frontend

We've already seen some ways that Value and Value maps appear in the frontend:
as parameters in
[`SeriesRequest`s](../client/core/src/protocol/request_interface.ts) and as
global filters in
[`Request`s](../client/core/src/protocol/request_interface.ts).  TraceViz's
frontend core also uses Values in a few other ways:

*   Every TraceViz client application has a global
    [`AppCore`](../client/core/src/app_core/app_core.ts) instance managing
    global application state.  This includes the
    [`GlobalState`](../client/core/src/global_state/global_state.ts), a Value
    map of Values used throughout the frontend.  Each TraceViz client defines
    its complete set of global Values just once, at application load, and this
    set remains static thenceforward.  Global Values may be referenced or
    updated anywhere in the tool template.
*   TraceViz tools components can support [interactions](./interactions.md),
    which observe and mutate Values, and which provide hooks for components to
    support user actions like clicks and mouseovers.

Additionally, TraceViz components may expose their own local Values or Value
maps, and TraceViz tool clients can implement arbitrary logic on local and
global Values.
