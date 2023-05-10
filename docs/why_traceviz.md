# Why TraceViz?

Compared to traditional approaches to tool-building, TraceViz tools tend to be
more composable, reusable, maintainable, scalable, and responsive.  TraceViz
also supports rapid prototyping, and provides a clean pathway to productionize
prototypes.

TraceViz builds web-based tools with active backends: a tool's backend is always
available to serve user queries, even in response to user interactions.  That
means that the frontend doesn't need to understand the *semantics* of the data
it's displaying, and instead can focus on providing views and supporting
user interactions in a highly reusable, low-semantic way.

TraceViz is suitable for a wide variety of performance tooling applications,
but is especially suitable when building visualizations for rich data, which
may support many different *analysis workflows*.

## Analysis workflows

Performance tuning is really a specialized case of the scientific method.  A
performance tuner observes a situation, deciding if tuning is warranted.  If it
is, they formulate a hypothesis about how the workload might be improved, and
test this hypothesis by experimentation, usually by profiling the performance
before and after an optimization change.  They then consider the results of this 
experiment, amending the code and repeating the process as needed.

For any performance domain, there is a set of *analysis workflows* -- sequences
of experimental steps that can iteratively narrow down the scope of the issue
and point to possible solutions.  For example, when debugging jitter or jank,
one might first determine which components of the system are most responsible:
is it the network?  The microarchitecture?  Is the OS doing too much bursty
work, or are garbage collection passes interfering with performance?  Is it a
poor algorithmic choice?  The first steps in a jank analysis workflow could
settle this question, before moving on to more specific steps depending on where
the jank was found.  Some analysis workflows are well-established and of broad
interest -- 'parallelizing a task' is one such -- while others are very
domain-specific, and might be developed as needed for specific problems.

Good performance tooling should support entire *analysis workflows*.  Often,
though, perf tools are not built around the workflows they'll be used for,
but are instead built around specific formats of performance data.  This is
understandable but regrettable, and leads to performance tools that are
difficult to use, and ultimately to the perception that performance tuning is
only possible for experts.

TraceViz helps tool-builders focus on the analysis workflows they want to
support, in several ways.  It supports elegantly composing performance profile
data from different sources, which can help narrow the space in the early stages
of an analysis workflow.  It supports reusing all tool logic so that the cost of
providing a new view is low, thus avoiding monolithic tools that excel at
nothing.  It encourages hypothesizing and experimentation by supporting rapid
tool prototyping and iteration.  And, it tends to concentrate everything about
a given tool's supported analysis workflows in just one place -- the *tool
template* -- rather than smearing that information across the entire tool stack.

## High-semantic and low-semantic data

TraceViz's central tenet is the separation of *high-semantic* and *low-semantic*
data.  Data is *high-semantic* when it is tightly coupled with specific
profiling data; when it is tightly coupled with a particular view, it is
*low-semantic*.  Concepts like threads and processes, memory usage, hardware or
OS events, and critical-path latency are *high-semantic*; concepts like
coloring, labels, tables, trees, or line charts are *low-semantic*.

All visualizations involve both high-semantic and low-semantic data: profile
data is never framed in terms of rectangles and colors, and UI frameworks never
deal in threads or CPU time; instead, all tools contain logic to convert 
high-semantic data into low-semantic data for a particular view.  However, in
conventional tools, the boundary between high- and low-semantic data is large
and fuzzy, with the result that access to visualizations that could be useful
for a wide variety of applications is often gated behind a high-semantic format
which is only appropriate for some of those potential applications.  We've found
that, in the long run, coercing data into an inappropriate format just to access
a particular visualization dramatically limits the usefulness of the data, and
virtually requires users of the resulting analysis workflow to gain considerable
specialized expertise in interpreting the visualization.

In a TraceViz tool, all high-semantic data lives in the backend, whose
responsibilities include fetching the data, preprocessing it, caching it, and
converting it to low-semantic visualization data in response to frontend
queries.  The frontend operates only in the low-semantic domain, so that all
TraceViz UI components are available for all applications, without the need to
compromise their data.

## An example: flame graphs and Pprof

[Flame graphs](https://www.brendangregg.com/flamegraphs.html) are a powerful
way to visualize weighted hierarchical data.  They were originally conceived,
and are still widely used, to visualize aggregations of binary execution
samples, with each sample bundling a callstack with one or more aggregated
metrics like CPU time.  To generate a flame graph, a corpus of such samples is
assembled into a single *weighted tree*: each sample's weight is aggregated into
the node reached by traversing that sample's stack from root to leaf (for
top-down flame graphs; leaf-to-root for bottom-up ones).  Then, this weighted
tree is rendered as a flame graph, with each tree node represented as a
rectangle whose width is proportional to that node's *total weight* (the node's
own weight, plus the weights of all its descendant nodes), and children nesting
beneath their parents (for flame graphs with the root at the top; some
implementations place the root at the bottom, and children sit atop their
parents).

[Google's Pprof](https://github.com/google/pprof) is a performance visualization
with a prominent flame graph view.  Pprof supports many runtime-optimization
analysis workflows: for example, a common starting point is to consider the
top-down flame graph for an entire performance profile, identify components with
large total weight, and 'drill down' into one such component (by clicking on
that component's frame, or its parent's frame, in the flame graph) to learn why
it is as large as it is.

Pprof proved itself so useful for these workflows that users who were familiar
with it began using it to visualize data other than aggregated callstack
samples -- for example, [to visualize aggregated critical path information](https://dl.acm.org/doi/10.1145/3526967).  To do so, however, they needed to
coerce their data into a [pprof-specific, high-semantic data format](https://github.com/google/pprof/blob/main/proto/profile.proto)
whose semantics expect binary callstacks, and in which, for performance, all
samples with the same callstack can be linearly aggregated together into one
aggregate sample: Pprof visualizations are only available for data in this
specific format.

Aggregated critical path information, however, doesn't fit neatly into this
format.  Rather than binary callstacks, critical path elements have stacks
composed of `ProducerModules`, for which Pprof concepts like build ID and
function mapping are inappropriate.  Rather than being linearly aggregatable,
these critical path elements instead needed to be *normalized* to the number of
sampled critical paths.  This normalization could be done as a step in producing
the pprof input data, but doing so lost all information about the *distribution*
of each frame within the corpus of critical paths.  This distribution
information isn't particularly important in Pprof's expected workflows that
focus on overall runtime optimization, but it is essential for the latency
analysis workflows these engineers sought to enable for critical paths.

Fundamentally, a flame graph is a visual representation of hierarchical,
weighted data.  The hierarchy is conveyed by child nodes nesting beneath their
parents; the weight is conveyed by each node's width.  This representation may
fruitfully represent where CPU time in a fleet is being spent, where memory is
consumed in an application, or where work is done in an average critical path.
It would even be a perfectly appropriate representation of a company's 
organization chart: employees' nodes would nest und er their managers', and
each node's width might represent the budget of that employee's organization (or
any other suitable quantity!)  But, in order to use Pprof to view such data,
one must coerce it into Pprof's expected high-semantic format, even to the
extent of encoding employees as [code locations](https://github.com/google/pprof/blob/main/proto/profile.proto#L173) and budget currencies as [memory, time, or CPU usage](https://github.com/google/pprof/blob/00490a63f31712a6991b73391dd3decdada278d0/internal/measurement/measurement.go#L261).

This coercion has two drawbacks.  First, it makes the tool harder to use: the
analysis workflow now must include mentally converting functions to people and
time to dollars.  Wherever that conversion is not trivial, there is a significant
risk of misinterpretation, which ultimately manifests as an 'expert tax' applied
to the tool's users.  Second, any nuance of the raw data that doesn't fit neatly
into Pprof's data model is lost: the distribution information so relevant to
critical path analysis has no place in the runtime analysis workflows Pprof
supports.

In TraceViz, flame graphs render low-semantic
[weighted tree](https://github.com/google/traceviz/blob/main/server/go/weighted_tree/weighted_tree.go)
data: each node has a set of child nodes, and a `float` self-magnitude that is
only used to calculate rendered width.  Any operations that would require
high semantics, such as changing the weighting scheme or applying a new node
coloring, are handled by the backend.  This arrangement has a number of 
advantages:

*  It's general.  Any data that *can be projected into* a weighted tree can use
   the flame graph, without having to be lossily converted into a specific kind
   of weighted tree.
*  It's responsive.  Since the frontend's flame graph component never needs more
   data than it can show in one rendered flame graph, frontend query responses
   are kept small, and all expensive computation is done in the backend, in a
   powerful, compiled, concurrent language, rather than in JavaScript.
*  It's reusable.  The same logic that computes the flame chart for
   visualization can be used to populate dashboards or alerting emails, or for
   other purposes.
*  It's easy to prototype.  A working draft can be built without writing any
   frontend code, and it's very easy to change views and their interactions.
   This makes it much easier to focus on *analysis workflows*, and thus to
   provide really usable tools.
*  It's highly productionizable.  All logic pertaining to interpreting and
   visualizing high-semantic profile data can be done by performance tuning
   experts in the kind of backend environment where they're most effective,
   and UX, UI polish, and deployment can be done later, at need, by engineers
   with other expertises.
*  It's composable.  Different UI components in the same tool can be populated
   from completely different sources of profile data, without those sources
   needing to be aware of one another.
*  It's future-proof.  All high-semantic business logic is done in slow-changing
   server languages like Go, rather than embedded in a
   [mercurial JavaScript framework](https://gist.github.com/tkrotoff/b1caa4c3a185629299ec234d2314e190).

In addition to flame graphs, TraceViz includes overtime traces, XY charts, 
histograms, tables, and other data views, all with low-semantic data formats.
Moreover, TraceViz is extensible: you can write your own UI components and data
formats, and anything you write can be reused in many contexts.
