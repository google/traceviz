# Get started with TraceViz

TraceViz comes bundled with a demo app, LogViz.  You can read more about its
structure at [A TraceViz Tool](./a_traceviz_tool.md), but you can try it out
right away.  You'll need to ensure you have
[Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm),
[Angular](https://angular.dev/installation), and
[Go](https://go.dev/doc/install) installed.  Then, from the repository root,

```sh
traceviz$ npm run demo
```

If all goes well, this will:

*   build and test the TraceViz client core libraries;
*   build and test the TraceViz core Angular library and a set of included
    Angular components;
*   build the LogViz client application; and
*   launch the LogViz server.

and conclude with a message like:

```sh
Serving LogViz at http://mac.lan:7410
```

Open that link in a browser (you may be able to click it) to explore LogViz.
You can read [its template](../logviz/client/src/app/app.component.html) to
learn about its capabilities, but among other things,

*   Mousing over a row in the 'Source files' table (upper left) highlights log
    entries for the moused-over source file in the 'Raw event' table (upper
    right).
*   Clicking a row in the 'Source files' table filters both the 'Raw event'
    table and the 'Log messages over time' timeline (lower) to only log messages
    from the clicked row.  Shift-clicking supports multiselect; clicking again
    deselects.
*   Mousing over a row in the 'Raw event' table drops a vertical rule in the
    'Log messages over time' timeline at the moment of the moused-over event.
*   Brushing (clicking-and-dragging) in the 'Log messages over time' timeline
    zooms into the brushed time range, and filters all other views to that
    zoomed time range.  Double-clicking the timeline resets this view.
*   The WASD keys zoom in and out (W and S respectively) and pan left and right
    (A and D respectively) in the timeline (with the same global time filtering
    behavior).
