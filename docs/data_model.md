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

## Values and Properties

The heart of the TraceViz data model is the *Value*, which represents a single
piece of data sent from frontend to backend in a request, sent from backend to
frontend as a response, or staying entirely in the frontend to support
[interactions](./interactions.md).  Wherever it appears, a Value is essentially
a union type, and can be a string, list or set of strings, integer, list or set
of integers, double, duration, or timestamp.  On the frontend, a
[Value](../client/core/src/value/value.ts) is also an [rxjs](http://rxjs.dev) 