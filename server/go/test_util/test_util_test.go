package testutil

import (
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/google/traceviz/server/go/util"
)

func TestUpdateComparator(t *testing.T) {
	for _, test := range []struct {
		description string
		comparator  *UpdateComparator
		different   bool
	}{{
		description: "equal simple updates",
		comparator: NewUpdateComparator().
			WithTestUpdates(util.StringProperty("greetings", "hello")).
			WithWantUpdates(util.StringProperty("greetings", "hello")),
	}, {
		description: "order independence",
		comparator: NewUpdateComparator().
			WithTestUpdates(
				util.StringProperty("greeting", "hello"),
				util.IntegerProperty("tuba_count", 5),
			).
			WithWantUpdates(
				util.IntegerProperty("tuba_count", 5),
				util.StringProperty("greeting", "hello"),
			),
	}, {
		description: "redefinition",
		comparator: NewUpdateComparator().
			WithTestUpdates(
				util.IntegerProperty("cowbell_count", 5),
				util.IntegerProperty("cowbell_count", 10),
			).
			WithWantUpdates(
				util.IntegerProperty("cowbell_count", 10),
			),
	}, {
		description: "unequal (strings version)",
		comparator: NewUpdateComparator().
			WithTestUpdates(
				util.StringProperty("greeting", "hello"),
			).
			WithWantUpdates(
				util.StringProperty("greeting", "howdy, partner!"),
			),
		different: true,
	}, {
		description: "unequal (numeric version)",
		comparator: NewUpdateComparator().
			WithTestUpdates(
				util.IntegerProperty("cowbell_count", 10),
			).
			WithWantUpdates(
				util.DoubleProperty("cowbell_count", 10),
			),
		different: true,
	}} {
		t.Run(test.description, func(t *testing.T) {
			gotMsg, different := test.comparator.Compare(t)
			if test.different != different {
				t.Errorf("Compare() yielded unexpected return message '%s'", gotMsg)
			}
		})
	}
}

func TestPrettyPrint(t *testing.T) {
	for _, test := range []struct {
		description string
		builder     func() *util.DataResponseBuilder
		want        []string
	}{{
		description: "multiple series",
		builder: func() *util.DataResponseBuilder {
			req1 := &util.DataSeriesRequest{
				QueryName:  "query1",
				SeriesName: "0",
				Options: map[string]*util.V{
					"pivot": util.StringValue("thing"),
				},
			}
			req2 := &util.DataSeriesRequest{
				QueryName:  "query2",
				SeriesName: "1",
			}
			drb := util.NewDataResponseBuilder(&util.DataRequest{
				GlobalFilters: map[string]*util.V{
					"max_depth":       util.IntValue(10),
					"selected_things": util.StringsValue("a", "b"),
				},
				Requests: []*util.DataSeriesRequest{
					req1,
				},
			})
			drb.DataSeries(req1).
				Child().With(
				util.StringProperty("greeting", "Hello!"),
				util.IntegerProperty("count", 100),
			).
				Child().With(
				util.StringsProperty("addressees", "mom", "dad"),
			)
			drb.DataSeries(req2).
				Child().With(
				util.StringsProperty("items", "apple", "banana", "coconut"),
				util.DoubleProperty("temp_f", 60),
			)
			return drb
		},
		want: []string{
			"Data",
			"  Global filters:",
			"    max_depth: 10",
			`    selected_things: ["a", "b"]`,
			"  Series:",
			"    Request:",
			"      Query Name: query1",
			"      Series Name: 0",
			"      Options: ",
			`        pivot: "thing"`,
			"    Series: ",
			"      Properties:",
			"        count: 100", // Properties in increasing key order
			"        greeting: 'Hello!'",
			"      Child:",
			"        Properties:",
			`          addressees: ["mom", "dad"]`,
			"    Request:",
			"      Query Name: query2",
			"      Series Name: 1",
			"    Series: ",
			"      Properties:",
			`        items: ["apple", "banana", "coconut"]`,
			"        temp_f: 60.0000",
		},
	}} {
		drb := test.builder()
		_, err := drb.ToJSON()
		if err != nil {
			t.Fatalf(err.Error())
		}
		got := PrettyPrintData(drb.D)
		if diff := cmp.Diff(test.want, got); diff != "" {
			t.Errorf("Got data %s, diff (-want, +got) %s", got, diff)
		}
	}
}
