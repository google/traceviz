/*
	Copyright 2023 Google Inc.
	Licensed under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
		https://www.apache.org/licenses/LICENSE-2.0
	Unless required by applicable law or agreed to in writing, software
	distributed under the License is distributed on an "AS IS" BASIS,
	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	See the License for the specific language governing permissions and
	limitations under the License.
*/

// Package util defines utilities for building traceviz data sources in Go:
//
// DataResponseBuilder, for populating responses to DataRequests;
//
// {type}Value functions (type={String, StringIndex, Strings, StringIndices,
// Int, Ints, Double, Duration, TImestamp}) for safely constructing Values of
// the specified type;
//
// Expect{type}Value functions, over the same types, for safely retrieving
// values of the specified types from Values, returning an error if there's a
// type mismatch;
//
// DataBuilder, for assembling response data programmatically.
package util

import (
	"bytes"
	"encoding/json"
	"sort"
	"strconv"

	"fmt"
	"strings"
	"sync"
	"time"
)

type valueType int

// Enumerated value types.
const (
	unsetValue valueType = iota
	StringValueType
	StringIndexValueType
	StringsValueType
	StringIndicesValueType
	IntegerValueType
	IntegersValueType
	DoubleValueType
	DurationValueType
	TimestampValueType
)

// V represents a value in a TraceViz request or response.
type V struct {
	V any
	T valueType
}

// PrettyPrint returns the receiver, deterministically prettyprinted.
// String-index-type values prettyprint the same as the corresponding
// literal-string-type values.  Only for use in tests.
func (v *V) PrettyPrint(st []string) string {
	var ret string
	var err error
	switch v.T {
	case unsetValue:
		ret = "unset"
	case StringValueType:
		ret, err = ExpectStringValue(v)
		ret = "'" + ret + "'"
	case StringIndexValueType:
		var strIdx int64
		strIdx, err = expectStringIndexValue(v)
		if err == nil {
			ret = "'" + st[strIdx] + "'"
		}
	case StringsValueType:
		var strs []string
		strs, err = ExpectStringsValue(v)
		ret = "[ '" + strings.Join(strs, "', '") + "' ]"
	case StringIndicesValueType:
		var strIdxs []int64
		strIdxs, err = expectStringIndicesValue(v)
		if err == nil {
			var strs = make([]string, len(strIdxs))
			for idx, strIdx := range strIdxs {
				strs[idx] = st[strIdx]
			}
			ret = "[ '" + strings.Join(strs, "', '") + "' ]"
		}
	case IntegerValueType:
		var i int64
		i, err = ExpectIntegerValue(v)
		if err == nil {
			ret = strconv.Itoa(int(i))
		}
	case IntegersValueType:
		var ints []int64
		ints, err = ExpectIntegersValue(v)
		if err == nil {
			strs := make([]string, len(ints))
			for idx, i := range ints {
				strs[idx] = strconv.Itoa(int(i))
			}
			ret = "[ " + strings.Join(strs, ", ") + " ]"
		}
	case DoubleValueType:
		var d float64
		d, err = ExpectDoubleValue(v)
		if err == nil {
			ret = fmt.Sprintf("%.6f", d)
		}
	case DurationValueType:
		var dur time.Duration
		dur, err = ExpectDurationValue(v)
		ret = dur.String()
	case TimestampValueType:
		var ts time.Time
		ts, err = ExpectTimestampValue(v)
		ret = ts.String()
	}
	if err != nil {
		return "error: " + err.Error()
	}
	return ret
}

type timestamp struct {
	UnixSeconds int64
	UnixNanos   int64
}

func (ts timestamp) MarshalJSON() ([]byte, error) {
	return json.Marshal([2]int64{ts.UnixSeconds, ts.UnixNanos})
}

// MarshalJSON overrides the default JSON marshaling behavior for V to reduce
// response sizes.  A V is encoded as the JS object `V`:
//
//	 type V = [number,                 ; from valueType, above
//	  null     |                      ; if unset
//	  string   |                      ; if string
//	  number   |                      ; if integer, string index, double, or duration
//	  string[] |                      ; if strings
//	  number[] |                      ; if integers or string indices
//	  [number, number]                ; if timestamp ([secs, nanos] from epoch)
//	]
func (v *V) MarshalJSON() ([]byte, error) {
	ret := [2]any{v.T, v.V}
	return json.Marshal(ret)
}

func (v *V) fromAny(got []any) error {
	t, err := got[0].(json.Number).Int64()
	if err != nil {
		return err
	}
	v.T = valueType(t)
	tv := got[1]
	switch v.T {
	case StringIndexValueType, IntegerValueType:
		if v.V, err = tv.(json.Number).Int64(); err != nil {
			return err
		}
	case StringsValueType:
		strIfs := tv.([]any)
		strs := make([]string, len(strIfs))
		for idx, strIf := range strIfs {
			strs[idx] = strIf.(string)
		}
		v.V = strs
	case DoubleValueType:
		if v.V, err = tv.(json.Number).Float64(); err != nil {
			return err
		}
	case StringIndicesValueType, IntegersValueType:
		nums := tv.([]any)
		ints := make([]int64, len(nums))
		for idx, num := range nums {
			ints[idx], err = num.(json.Number).Int64()
			if err != nil {
				return err
			}
		}
		v.V = ints
	case DurationValueType:
		durNs, err := tv.(json.Number).Int64()
		if err != nil {
			return err
		}
		v.V = time.Duration(durNs)
	case TimestampValueType:
		parts := tv.([]any)
		if len(parts) != 2 {
			return fmt.Errorf("timestamp Value is improperly formed")
		}
		unixSecs, err := parts[0].(json.Number).Int64()
		if err != nil {
			return err
		}
		unixNanos, err := parts[1].(json.Number).Int64()
		if err != nil {
			return err
		}
		v.V = timestamp{
			UnixSeconds: unixSecs,
			UnixNanos:   unixNanos,
		}
	default:
		v.V = tv
	}
	return err
}

// UnmarshalJSON unmarshals the provided JSON bytes into the receiving V.
func (v *V) UnmarshalJSON(data []byte) error {
	var got []any
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.UseNumber()
	if err := dec.Decode(&got); err != nil {
		return err
	}
	return v.fromAny(got)
}

// Datum represents a single Datum in a TraceViz data series response.
type Datum struct {
	Properties map[int64]*V
	Children   []*Datum
}

// PrettyPrint returns the receiver deterministically prettyprinted.
// Only for use in tests.
func (d *Datum) PrettyPrint(indent string, st []string) string {
	ret := []string{}
	// Emit properties in increasing alphabetic order.
	keys := make([]int64, 0, len(d.Properties))
	for k := range d.Properties {
		keys = append(keys, k)
	}
	sort.Slice(keys, func(a, b int) bool {
		return st[keys[a]] < st[keys[b]]
	})
	for _, k := range keys {
		ret = append(ret,
			fmt.Sprintf("%sProp '%s': %s", indent, st[k], d.Properties[k].PrettyPrint(st)),
		)
	}
	for _, child := range d.Children {
		ret = append(ret,
			fmt.Sprintf("%sChild:", indent),
			child.PrettyPrint(indent+"  ", st),
		)
	}
	return strings.Join(ret, "\n")
}

// MarshalJSON overrides the default JSON marshaling behavior for Datum to
// reduce response sizes.  A Datum is encoded as the JS object `Datum`:
//
//	type V as defined above
//	type KV = [number | string, V]
//	type Datum = [
//	  KV[],                        ; its Properties
//	  Datum[],                     ; its Children
//	]
func (d *Datum) MarshalJSON() ([]byte, error) {
	props := make([]any, len(d.Properties))
	children := make([]any, len(d.Children))
	keys := make([]int64, 0, len(d.Properties))
	for k := range d.Properties {
		keys = append(keys, k)
	}
	sort.Slice(keys, func(a, b int) bool {
		return keys[a] < keys[b]
	})
	for idx, k := range keys {
		props[idx] = []any{k, d.Properties[k]}
	}
	for idx, child := range d.Children {
		children[idx] = child
	}
	return json.Marshal([]any{props, children})
}

func (d *Datum) fromAny(sd []any) error {
	props := sd[0]
	children := sd[1]
	d.Properties = make(map[int64]*V, len(props.([]any)))
	d.Children = make([]*Datum, len(children.([]any)))
	for _, val := range props.([]any) {
		k, err := ((val.([]any))[0].(json.Number)).Int64()
		if err != nil {
			return err
		}
		v := &V{}
		if err := v.fromAny((val.([]any))[1].([]any)); err != nil {
			return err
		}
		d.Properties[k] = v
	}
	for idx, val := range children.([]any) {
		child := &Datum{}
		if err := child.fromAny(val.([]any)); err != nil {
			return err
		}
		d.Children[idx] = child
	}
	return nil
}

// UnmarshalJSON unmarshals the provided JSON bytes into the receiving V.
func (d *Datum) UnmarshalJSON(data []byte) error {
	var sd = []any{}
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.UseNumber()
	if err := dec.Decode(&sd); err != nil {
		return err
	}
	return d.fromAny(sd)
}

// DataSeriesRequest is a request for a specific data series from a TraceViz
// client.
type DataSeriesRequest struct {
	QueryName  string
	SeriesName string
	Options    map[string]*V
}

// DataSeries represents a complete TraceViz data series response.
type DataSeries struct {
	SeriesName string
	Root       *Datum
}

// PrettyPrint returns the receiver deterministically prettyprinted.
// Only for use in tests.
func (ds *DataSeries) PrettyPrint(indent string, st []string) string {
	return strings.Join([]string{
		fmt.Sprintf("%sSeries %s", indent, ds.SeriesName),
		indent + "  " + "Root:",
		ds.Root.PrettyPrint(indent+"    ", st),
	}, "\n")
}

// DataRequest is a request for one or more data series from a TraceViz client.
type DataRequest struct {
	GlobalFilters  map[string]*V
	SeriesRequests []*DataSeriesRequest
}

// DataRequestFromJSON attempts to construct a DataRequest from the provided
// JSON.
func DataRequestFromJSON(j []byte) (*DataRequest, error) {
	ret := &DataRequest{}
	err := json.Unmarshal(j, ret)
	return ret, err
}

// Data represents a complete TraceViz data response.
type Data struct {
	StringTable []string
	DataSeries  []*DataSeries
}

// PrettyPrint returns the receiver deterministically prettyprinted.
// Only for use in tests.
func (d *Data) PrettyPrint() string {
	ret := []string{"Data:"}
	for _, series := range d.DataSeries {
		ret = append(ret, series.PrettyPrint("  ", d.StringTable))
	}
	return strings.Join(ret, "\n")
}

// stringTable provides a string table associating strings to unique integers.
// It is thread-safe.
type stringTable struct {
	stringsToIndices map[string]int64
	stringsByIndex   []string
	mu               sync.RWMutex
}

// newStringTable returns a new stringTable populated with the provided
// strings.
func newStringTable(strs ...string) *stringTable {
	ret := &stringTable{
		stringsToIndices: map[string]int64{},
	}
	for _, str := range strs {
		ret.stringIndex(str)
	}
	return ret
}

func (st *stringTable) lookupStringIndex(str string) (int64, bool) {
	st.mu.RLock()
	defer st.mu.RUnlock()
	idx, ok := st.stringsToIndices[str]
	return idx, ok
}

// stringIndex returns the index in the receiver StringTable for the provided
// string, adding it to the receiver if necessary.
func (st *stringTable) stringIndex(str string) int64 {
	if idx, ok := st.lookupStringIndex(str); ok {
		return idx
	}
	st.mu.Lock()
	defer st.mu.Unlock()
	// First, check to see if an entry was inserted after the lookup above but
	// before we acquired this lock.
	idx, ok := st.stringsToIndices[str]
	if ok {
		return idx
	}
	idx = int64(len(st.stringsByIndex))
	st.stringsByIndex = append(st.stringsByIndex, str)
	st.stringsToIndices[str] = idx
	return idx
}

type errors struct {
	hasError bool
	errs     []error
	mu       sync.Mutex
}

func (errs *errors) add(err error) {
	errs.mu.Lock()
	errs.hasError = true
	defer errs.mu.Unlock()
	errs.errs = append(errs.errs, err)
}

func (errs *errors) Error() string {
	if len(errs.errs) == 0 {
		return ""
	}
	ret := []string{}
	for _, err := range errs.errs {
		ret = append(ret, err.Error())
	}
	return strings.Join(ret, ", ")
}

func (errs *errors) toError() error {
	if len(errs.errs) == 0 {
		return nil
	}
	return fmt.Errorf(errs.Error())
}

// DataResponseBuilder streamlines assembling responses to DataRequests.
type DataResponseBuilder struct {
	st   *stringTable
	errs *errors
	d    *Data
	mu   sync.Mutex
}

// NewDataResponseBuilder returns a new DataResponseBuilder configured with the
// provided DataRequest.
func NewDataResponseBuilder() *DataResponseBuilder {
	return &DataResponseBuilder{
		st:   newStringTable(),
		errs: &errors{},
		d: &Data{
			StringTable: []string{},
			DataSeries:  []*DataSeries{},
		},
	}
}

// DataBuilder is implemented by types that can assemble TraceViz responses.
type DataBuilder interface {
	With(updates ...PropertyUpdate) DataBuilder
	Child() DataBuilder
}

// DataSeries returns a new DataBuilder for assembling the response to the
// provided DataSeriesRequest.  DataSeries is safe for concurrent use.
func (drb *DataResponseBuilder) DataSeries(req *DataSeriesRequest) DataBuilder {
	ret := newDatumBuilder(drb.errs, drb.st)
	ds := &DataSeries{
		SeriesName: req.SeriesName,
		Root:       ret.d,
	}
	drb.mu.Lock()
	drb.d.DataSeries = append(drb.d.DataSeries, ds)
	drb.mu.Unlock()
	return ret
}

// Data completes and returns the Data under construction.
func (drb *DataResponseBuilder) Data() (*Data, error) {
	if drb.errs.hasError {
		return nil, drb.errs.toError()
	}
	drb.d.StringTable = drb.st.stringsByIndex
	return drb.d, nil
}

// Quick builders for Value types.

// StringValue returns a new Value wrapping the provided string.
func StringValue(str string) *V {
	return &V{
		V: str,
		T: StringValueType,
	}
}

// StringIndexValue returns a new Value wrapping the provided string index.
func StringIndexValue(strIdx int64) *V {
	return &V{
		V: strIdx,
		T: StringIndexValueType,
	}
}

// StringsValue returns a new Value wrapping the provided strings.
func StringsValue(strs ...string) *V {
	return &V{
		V: strs,
		T: StringsValueType,
	}
}

// StringIndicesValue returns a new Value wrapping the provided string
// indices.
func StringIndicesValue(strIdxs ...int64) *V {
	return &V{
		V: strIdxs,
		T: StringIndicesValueType,
	}
}

// IntegerValue returns a new Value wrapping the provided int64.
func IntegerValue(i int64) *V {
	return &V{
		V: i,
		T: IntegerValueType,
	}
}

// IntValue is an alias of IntegerValue.
var IntValue = IntegerValue

// IntegersValue returns a new Value wrapping the provided int64s.
func IntegersValue(ints ...int64) *V {
	return &V{
		V: ints,
		T: IntegersValueType,
	}
}

// IntsValue is an alias of IntegersValue.
var IntsValue = IntegersValue

// DoubleValue returns a new Value wrapping the provided float64.
func DoubleValue(f float64) *V {
	return &V{
		V: f,
		T: DoubleValueType,
	}
}

// DurationValue returns a new Value wrapping the provided Duration.
func DurationValue(dur time.Duration) *V {
	return &V{
		V: dur,
		T: DurationValueType,
	}
}

// TimestampValue returns a new Value wrapping the provided Timestamp.
func TimestampValue(t time.Time) *V {
	ts := timestamp{
		UnixSeconds: t.Unix(),
		UnixNanos:   t.UnixNano() % int64(time.Second),
	}
	return &V{
		V: ts,
		T: TimestampValueType,
	}
}

// ExpectStringValue expects the provided Value to be a string, returning
// that string or an error if it isn't.
func ExpectStringValue(val *V) (string, error) {
	if val.T != StringValueType {
		return "", fmt.Errorf("expected value type 'str'")
	}
	return val.V.(string), nil
}

func expectStringIndexValue(val *V) (int64, error) {
	if val.T != StringIndexValueType {
		return 0, fmt.Errorf("expect value type 'str_idx'")
	}
	return val.V.(int64), nil
}

// ExpectStringsValue expects the provided Value to be a Strings, returning
// that Strings' contained string slice, or an error if it isn't.
func ExpectStringsValue(val *V) ([]string, error) {
	if val.T != StringsValueType {
		return nil, fmt.Errorf("expected value type 'strs'")
	}
	return val.V.([]string), nil
}

// expectStringIndicesValue expects the provided Value to be a StringIndices,
// returning that StringIndex's contained string index slice, or an error if it
// isn't.
func expectStringIndicesValue(val *V) ([]int64, error) {
	if val.T != StringIndicesValueType {
		return nil, fmt.Errorf("expected value type 'str_idxs'")
	}
	return val.V.([]int64), nil
}

// ExpectIntegerValue expects the provided Value to be an integer, returning
// that integer or an error if it isn't.
func ExpectIntegerValue(val *V) (int64, error) {
	if val.T != IntegerValueType {
		return 0, fmt.Errorf("expected value type 'int'")
	}
	return val.V.(int64), nil
}

// ExpectIntegersValue expects the provided Value to be an Integers, returning
// that Integer's contained int64 slice or an error if it isn't.
func ExpectIntegersValue(val *V) ([]int64, error) {
	if val.T != IntegersValueType {
		return nil, fmt.Errorf("expected value type 'str_idxs'")
	}
	return val.V.([]int64), nil
}

// ExpectDoubleValue expects the provided Value to be a float64, returning
// that float or an error if it isn't.
func ExpectDoubleValue(val *V) (float64, error) {
	if val.T != DoubleValueType {
		return 0, fmt.Errorf("expected value type 'dbl'")
	}
	return val.V.(float64), nil
}

// ExpectDurationValue expects the provided Value to be a duration, returning
// that duration or an error if it isn't.
func ExpectDurationValue(val *V) (time.Duration, error) {
	if val.T != DurationValueType {
		return 0, fmt.Errorf("expected value type 'duration'")
	}
	return val.V.(time.Duration), nil
}

// ExpectTimestampValue expects the provided Value to be a timestamp, returning
// that timestamp or an error if it isn't.
func ExpectTimestampValue(val *V) (time.Time, error) {
	if val.T != TimestampValueType {
		return time.Time{}, fmt.Errorf("expected value type 'duration'")
	}
	ts := val.V.(timestamp)
	return time.Unix(ts.UnixSeconds, ts.UnixNanos), nil
}

// PropertyUpdate is a function that updates a provided valueMapBuilder.  A nil
// PropertyUpdate does nothing.
type PropertyUpdate func(db *datumBuilder) error

// Value specifies a value for a PropertyValue whose key is not yet
// specified.  It returns a function accepting a key and returning the
// PropertyUpdate.
type Value func(key string) PropertyUpdate

// EmptyUpdate is a PropertyUpdate that does nothing.
var EmptyUpdate PropertyUpdate = nil

// ErrorProperty injects an error into the Data response under construction.
func ErrorProperty(err error) PropertyUpdate {
	return func(db *datumBuilder) error {
		return err
	}
}

// datumBuilder provides a utility for programmatically assembling
// maps of Properties.
type datumBuilder struct {
	errs      *errors
	st        *stringTable
	valsByKey map[int64]*V
	d         *Datum
}

// newDatumBuilder returns a new, empty datumBuilder.
func newDatumBuilder(errs *errors, st *stringTable) *datumBuilder {
	valsByKey := map[int64]*V{}
	return &datumBuilder{
		errs:      errs,
		st:        st,
		valsByKey: valsByKey,
		d: &Datum{
			Properties: valsByKey,
			Children:   []*Datum{},
		},
	}
}

// With applies the provided PropertyUpdate to the receiver in order.
func (db *datumBuilder) With(updates ...PropertyUpdate) DataBuilder {
	if !db.errs.hasError {
		for _, update := range updates {
			if update != nil {
				if err := update(db); err != nil {
					db.errs.add(err)
					break
				}
			}
		}
	}
	return db
}

func (db *datumBuilder) Child() DataBuilder {
	child := newDatumBuilder(db.errs, db.st)
	db.d.Children = append(db.d.Children, child.d)
	return child
}

// withStr sets the specified string value to the specified key within the map.
// It supports chaining.
func (db *datumBuilder) withStr(key, value string) *datumBuilder {
	db.valsByKey[db.st.stringIndex(key)] = StringIndexValue(db.st.stringIndex(value))
	return db
}

// withStrs sets the specified string slice value to the specified key within
// the map.  It supports chaining.
func (db *datumBuilder) withStrs(key string, values ...string) *datumBuilder {
	valIdxs := []int64{}
	for _, val := range values {
		valIdxs = append(valIdxs, db.st.stringIndex(val))
	}
	db.valsByKey[db.st.stringIndex(key)] = StringIndicesValue(valIdxs...)
	return db
}

// appendStrs appends the specified string slices to the value associated with
// the specified key within the map.  It supports chaining.
func (db *datumBuilder) appendStrs(key string, values ...string) *datumBuilder {
	val, ok := db.valsByKey[db.st.stringIndex(key)]
	if !ok {
		return db.withStrs(key, values...)
	}
	strIdxs, err := expectStringIndicesValue(val)
	if err != nil {
		db.errs.add(err)
	}
	for _, val := range values {
		strIdxs = append(strIdxs, db.st.stringIndex(val))
	}
	val.V = strIdxs
	return db
}

// withInt sets the specified int64 value to the specified key within the map.
// It supports chaining.
func (db *datumBuilder) withInt(key string, value int64) *datumBuilder {
	db.valsByKey[db.st.stringIndex(key)] = IntValue(value)
	return db
}

// withInts sets the specified int64 slice value to the specified key within
// the map. It supports chaining.
func (db *datumBuilder) withInts(key string, values ...int64) *datumBuilder {
	db.valsByKey[db.st.stringIndex(key)] = IntsValue(values...)
	return db
}

// withDbl sets the specified float64 value to the specified key within the
// map.  It supports chaining.
func (db *datumBuilder) withDbl(key string, value float64) *datumBuilder {
	db.valsByKey[db.st.stringIndex(key)] = DoubleValue(value)
	return db
}

// withDuration sets the specified duration value to the specified key within
// the map.  It supports chaining.
func (db *datumBuilder) withDuration(key string, value time.Duration) *datumBuilder {
	db.valsByKey[db.st.stringIndex(key)] = DurationValue(value)
	return db
}

// withTimestamp sets the specified timestamp value to the specified key within
// the map.  It supports chaining.
func (db *datumBuilder) withTimestamp(key string, value time.Time) *datumBuilder {
	db.valsByKey[db.st.stringIndex(key)] = TimestampValue(value)
	return db
}

// indexedValueMap returns the string-indexing value map.
func (db *datumBuilder) indexedValueMap() map[int64]*V {
	return db.valsByKey
}

// If applies the provided PropertyUpdate if the provided predicate is true.
func If(predicate bool, du PropertyUpdate) PropertyUpdate {
	if predicate {
		return du
	}
	return EmptyUpdate
}

// IfElse applies PropertyUpdate t if the provided predicate is true, and applies
// f otherwise.
func IfElse(predicate bool, t, f PropertyUpdate) PropertyUpdate {
	return func(db *datumBuilder) error {
		if predicate {
			return t(db)
		}
		return f(db)
	}
}

// Chain applies the provided Dataupdates in order.
func Chain(updates ...PropertyUpdate) PropertyUpdate {
	return func(db *datumBuilder) error {
		db.With(updates...)
		return nil
	}
}

// Nothing produces a Value setting nothing.  It is the Value equivalent
// of EmptyUpdate, for use when a Value is required (e.g., in a function
// argument) but nothing should be set.
var Nothing Value = func(key string) PropertyUpdate {
	return EmptyUpdate
}

// String produces a Value setting the specified string value.
func String(value string) Value {
	return func(key string) PropertyUpdate {
		return StringProperty(key, value)
	}
}

// Strings produces a Value setting the specified []string value.
func Strings(values ...string) Value {
	return func(key string) PropertyUpdate {
		return StringsProperty(key, values...)
	}
}

// Integer produces a Value setting the specified int64 value.
func Integer(value int64) Value {
	return func(key string) PropertyUpdate {
		return IntegerProperty(key, value)
	}
}

// Integers produces a Value setting the specified []int64 value.
func Integers(values ...int64) Value {
	return func(key string) PropertyUpdate {
		return IntegersProperty(key, values...)
	}
}

// Double produces a Value setting the specified float64 value.
func Double(value float64) Value {
	return func(key string) PropertyUpdate {
		return DoubleProperty(key, value)
	}
}

// Duration produces a Value setting the specified time.Duration value.
func Duration(value time.Duration) Value {
	return func(key string) PropertyUpdate {
		return DurationProperty(key, value)
	}
}

// Timestamp produces a Value setting the specified time.Time value.
func Timestamp(value time.Time) Value {
	return func(key string) PropertyUpdate {
		return TimestampProperty(key, value)
	}
}

// Error produces a Value which, when invoked, errors the DataBuilder.
func Error(err error) Value {
	return func(key string) PropertyUpdate {
		return ErrorProperty(err)
	}
}

// StringProperty returns a PropertyUpdate adding the specified string property.
func StringProperty(key, value string) PropertyUpdate {
	return func(db *datumBuilder) error {
		db.withStr(key, value)
		return nil
	}
}

// StringsProperty returns a PropertyUpdate adding the specified string slice
// property.
func StringsProperty(key string, values ...string) PropertyUpdate {
	return func(db *datumBuilder) error {
		db.withStrs(key, values...)
		return nil
	}
}

// StringsPropertyExtended returns a PropertyUpdate extending the specified string
// slice property.
func StringsPropertyExtended(key string, values ...string) PropertyUpdate {
	return func(db *datumBuilder) error {
		db.appendStrs(key, values...)
		return nil
	}
}

// IntegerProperty returns a PropertyUpdate adding the specified integer property.
func IntegerProperty(key string, value int64) PropertyUpdate {
	return func(db *datumBuilder) error {
		db.withInt(key, value)
		return nil
	}
}

// IntegersProperty returns a PropertyUpdate adding the specified integer slice
// property.
func IntegersProperty(key string, values ...int64) PropertyUpdate {
	return func(db *datumBuilder) error {
		db.withInts(key, values...)
		return nil
	}
}

// DoubleProperty returns a PropertyUpdate adding the specified double property.
func DoubleProperty(key string, value float64) PropertyUpdate {
	return func(db *datumBuilder) error {
		db.withDbl(key, value)
		return nil
	}
}

// DurationProperty returns a PropertyUpdate adding the specified duration property.
func DurationProperty(key string, value time.Duration) PropertyUpdate {
	return func(db *datumBuilder) error {
		db.withDuration(key, value)
		return nil
	}
}

// TimestampProperty returns a PropertyUpdate adding the specified timestamp
// property.
func TimestampProperty(key string, value time.Time) PropertyUpdate {
	return func(db *datumBuilder) error {
		db.withTimestamp(key, value)
		return nil
	}
}
