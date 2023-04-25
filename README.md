# Welcome to TraceViz!

TraceViz is a platform for building performance analysis tools -- despite the
name, it's not limited to traces :)  Compared to traditional approaches to
tool-building, TraceViz tools tend to be more composable, reusable,
maintainable, scalable, and responsive.  TraceViz also supports rapid
prototyping, and provides a clean pathway to productionize prototypes.

TraceViz builds web-based tools with active backends: a tool's backend is always
available to serve user queries, even in response to user interactions.  That
means that the frontend doesn't need to understand the *semantics* of the data
it's displaying, and instead can focus on providing views and supporting
user interactions in a highly reusable, low-semantic way.

TraceViz is suitable for a wide variety of performance tooling applications,
but is especially suitable when building visualizations for rich data, which
may support many different [*analysis workflows*](./docs/why_traceviz.md#analysis-workflows).

## Learn more

*  [Why TraceViz?](docs/why_traceviz.md) discusses TraceViz's design philosophy
   and can help you decide if it's right for you.
*  [A TraceViz tool](docs/a_traceviz_tool.md) describes the architecture of a
   typical TraceViz tool.