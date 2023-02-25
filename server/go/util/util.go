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

// UnmarshalJSON unmarshals the provided JSON bytes into the receiving V.
func (v *V) UnmarshalJSON(data []byte) error {
	type tmpV struct {
		V any
		T valueType
	}
	tv := &tmpV{}
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.UseNumber()
	if err := dec.Decode(tv); err != nil {
		return err
	}
	v.T = tv.T
	var err error
	switch tv.T {
	case StringIndexValueType, IntegerValueType:
		if v.V, err = tv.V.(json.Number).Int64(); err != nil {
			return err
		}
	case StringsValueType:
		strIfs := tv.V.([]any)
		strs := make([]string, len(strIfs))
		for idx, strIf := range strIfs {
			strs[idx] = strIf.(string)
		}
		v.V = strs
	case DoubleValueType:
		if v.V, err = tv.V.(json.Number).Float64(); err != nil {
			return err
		}
	case StringIndicesValueType, IntegersValueType:
		nums := tv.V.([]any)
		ints := make([]int64, len(nums))
		for idx, num := range nums {
			ints[idx], err = num.(json.Number).Int64()
			if err != nil {
				return err
			}
		}
		v.V = ints
	case DurationValueType:
		durNs, err := tv.V.(json.Number).Int64()
		if err != nil {
			return err
		}
		v.V = time.Duration(durNs)
	case TimestampValueType:
		ts := &time.Time{}
		tsStr := tv.V.(string)
		if err := ts.UnmarshalJSON([]byte(`"` + tsStr + `"`)); err != nil {
			return err
		}
		v.V = *ts
	default:
		v.V = tv.V
	}
	return err
}

// Datum represents a single Datum in a TraceViz data series response.
type Datum struct {
	Properties map[int64]*V
	Children   []*Datum
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
	Request *DataSeriesRequest
	Root    *Datum
}

// DataRequest is a request for one or more data series from a TraceViz client.
type DataRequest struct {
	GlobalFilters map[string]*V
	Requests      []*DataSeriesRequest
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
	GlobalFilters map[string]*V
	StringTable   []string
	DataSeries    []*DataSeries
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
	D    *Data
	mu   sync.Mutex
}

// NewDataResponseBuilder returns a new DataResponseBuilder configured with the
// provided DataRequest.
func NewDataResponseBuilder(req *DataRequest) *DataResponseBuilder {
	return &DataResponseBuilder{
		st:   newStringTable(),
		errs: &errors{},
		D: &Data{
			GlobalFilters: req.GlobalFilters,
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
	vmb := newIndexedValueMapBuilder(drb.errs, drb.st)
	ds := &DataSeries{
		Root: &Datum{
			Properties: vmb.indexedValueMap(),
		},
	}
	drb.mu.Lock()
	drb.D.DataSeries = append(drb.D.DataSeries, ds)
	drb.mu.Unlock()
	ret := &dataBuilder{
		st:  drb.st,
		ds:  ds,
		vmb: vmb,
	}
	return ret.withRequest(req)
}

// dataBuilder provides a mechanism for fluently assembling Datum or DataSeries
// responses.
type dataBuilder struct {
	st *stringTable
	// Exactly one of d and ds must be nonnull.
	d   *Datum
	ds  *DataSeries
	vmb *valueMapBuilder
}

// withRequest sets the Request property of the DataSeries under construction.
// Has no effect if no DataSeries is under construction.  It supports chaining.
func (db *dataBuilder) withRequest(req *DataSeriesRequest) *dataBuilder {
	if db == nil {
		return nil
	}
	if db.ds != nil {
		db.ds.Request = req
	}
	return db
}

// With applies the provided PropertyUpdate to the receiver in order.
func (db *dataBuilder) With(updates ...PropertyUpdate) DataBuilder {
	if db != nil {
		db.vmb.with(updates...)
	}
	return db
}

// Child adds a child Datum to the receiver, returning a DataBuilder
// for that child.  It supports chaining.
func (db *dataBuilder) Child() DataBuilder {
	if db == nil || db.vmb.errs.hasError {
		return nil
	}
	vmb := newIndexedValueMapBuilder(db.vmb.errs, db.st)
	child := &dataBuilder{
		st: db.st,
		d: &Datum{
			Properties: vmb.indexedValueMap(),
		},
		vmb: vmb,
	}
	if db.d != nil {
		db.d.Children = append(db.d.Children, child.d)
	} else {
		db.ds.Root.Children = append(db.ds.Root.Children, child.d)
	}
	return child
}

// ToJSON returns the constructed Data response as JSON.
func (drb *DataResponseBuilder) ToJSON() ([]byte, error) {
	if drb.errs.hasError {
		return nil, drb.errs.toError()
	}
	drb.D.StringTable = drb.st.stringsByIndex
	return json.Marshal(drb.D)
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
func IntValue(i int64) *V {
	return IntegerValue(i)
}

// IntegersValue returns a new Value wrapping the provided int64s.
func IntegersValue(ints ...int64) *V {
	return &V{
		V: ints,
		T: IntegersValueType,
	}
}

// IntsValue is an alias of IntegersValue.
func IntsValue(ints ...int64) *V {
	return IntegersValue(ints...)
}

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
func TimestampValue(ts time.Time) *V {
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
	return val.V.(time.Time), nil
}

// PropertyUpdate is a function that updates a provided valueMapBuilder.  A nil
// PropertyUpdate does nothing.
type PropertyUpdate func(vmb *valueMapBuilder) error

// Value specifies a value for a PropertyValue whose key is not yet
// specified.  It returns a function accepting a key and returning the
// PropertyUpdate.
type Value func(key string) PropertyUpdate

// EmptyUpdate is a PropertyUpdate that does nothing.
var EmptyUpdate PropertyUpdate = nil

// ErrorProperty injects an error into the Data response under construction.
func ErrorProperty(err error) PropertyUpdate {
	return func(vmb *valueMapBuilder) error {
		return err
	}
}

// valueMapBuilder provides a utility for programmatically assembling
// maps of Properties.
type valueMapBuilder struct {
	errs         *errors
	st           *stringTable
	valsByKey    map[string]*V
	valsByKeyIdx map[int64]*V
}

// newValueMapBuilder returns a new, empty valueMapBuilder configured to use
// raw strings for map keys and string values.
func newValueMapBuilder(errs *errors) *valueMapBuilder {
	return &valueMapBuilder{
		errs:      errs,
		valsByKey: map[string]*V{},
	}
}

// newIndexedValueMapBuilder returns a new, empty valueMapBuilder configured
// to use string table indices for map keys and string values.
func newIndexedValueMapBuilder(errs *errors, st *stringTable) *valueMapBuilder {
	return &valueMapBuilder{
		errs:         errs,
		st:           st,
		valsByKeyIdx: map[int64]*V{},
	}
}

// With applies the provided PropertyUpdate to the receiver in order.
func (vmb *valueMapBuilder) with(updates ...PropertyUpdate) {
	if !vmb.errs.hasError {
		for _, update := range updates {
			if update != nil {
				if err := update(vmb); err != nil {
					vmb.errs.add(err)
					break
				}
			}
		}
	}
}

// withStr sets the specified string value to the specified key within the map.
// It supports chaining.
func (vmb *valueMapBuilder) withStr(key, value string) *valueMapBuilder {
	if vmb.st == nil {
		vmb.valsByKey[key] = StringValue(value)
	} else {
		vmb.valsByKeyIdx[vmb.st.stringIndex(key)] = StringIndexValue(vmb.st.stringIndex(value))
	}
	return vmb
}

// withStrs sets the specified string slice value to the specified key within
// the map.  It supports chaining.
func (vmb *valueMapBuilder) withStrs(key string, values ...string) *valueMapBuilder {
	if vmb.st == nil {
		vmb.valsByKey[key] = StringsValue(values...)
	} else {
		valIdxs := []int64{}
		for _, val := range values {
			valIdxs = append(valIdxs, vmb.st.stringIndex(val))
		}
		vmb.valsByKeyIdx[vmb.st.stringIndex(key)] = StringIndicesValue(valIdxs...)
	}
	return vmb
}

// appendStrs appends the specified string slices to the value associated with
// the specified key within the map.  It supports chaining.
func (vmb *valueMapBuilder) appendStrs(key string, values ...string) *valueMapBuilder {
	if vmb.st == nil {
		val, ok := vmb.valsByKey[key]
		if !ok {
			return vmb.withStrs(key, values...)
		}
		strs, err := ExpectStringsValue(val)
		if err != nil {
			vmb.errs.add(err)
		}
		strs = append(strs, values...)
		val.V = strs
	} else {
		val, ok := vmb.valsByKeyIdx[vmb.st.stringIndex(key)]
		if !ok {
			return vmb.withStrs(key, values...)
		}
		strIdxs, err := expectStringIndicesValue(val)
		if err != nil {
			vmb.errs.add(err)
		}
		for _, val := range values {
			strIdxs = append(strIdxs, vmb.st.stringIndex(val))
		}
		val.V = strIdxs
	}
	return vmb
}

// withInt sets the specified int64 value to the specified key within the map.
// It supports chaining.
func (vmb *valueMapBuilder) withInt(key string, value int64) *valueMapBuilder {
	if vmb.st == nil {
		vmb.valsByKey[key] = IntValue(value)
	} else {
		vmb.valsByKeyIdx[vmb.st.stringIndex(key)] = IntValue(value)
	}
	return vmb
}

// withInts sets the specified int64 slice value to the specified key within
// the map. It supports chaining.
func (vmb *valueMapBuilder) withInts(key string, values ...int64) *valueMapBuilder {
	if vmb.st == nil {
		vmb.valsByKey[key] = IntsValue(values...)
	} else {
		vmb.valsByKeyIdx[vmb.st.stringIndex(key)] = IntsValue(values...)
	}
	return vmb
}

// withDbl sets the specified float64 value to the specified key within the
// map.  It supports chaining.
func (vmb *valueMapBuilder) withDbl(key string, value float64) *valueMapBuilder {
	if vmb.st == nil {
		vmb.valsByKey[key] = DoubleValue(value)
	} else {
		vmb.valsByKeyIdx[vmb.st.stringIndex(key)] = DoubleValue(value)
	}
	return vmb
}

// withDuration sets the specified duration value to the specified key within
// the map.  It supports chaining.
func (vmb *valueMapBuilder) withDuration(key string, value time.Duration) *valueMapBuilder {
	if vmb.st == nil {
		vmb.valsByKey[key] = DurationValue(value)
	} else {
		vmb.valsByKeyIdx[vmb.st.stringIndex(key)] = DurationValue(value)
	}
	return vmb
}

// withTimestamp sets the specified timestamp value to the specified key within
// the map.  It supports chaining.
func (vmb *valueMapBuilder) withTimestamp(key string, value time.Time) *valueMapBuilder {
	if vmb.st == nil {
		vmb.valsByKey[key] = TimestampValue(value)
	} else {
		vmb.valsByKeyIdx[vmb.st.stringIndex(key)] = TimestampValue(value)
	}
	return vmb
}

// valueMap returns the raw string value map.
func (vmb *valueMapBuilder) valueMap() map[string]*V {
	return vmb.valsByKey
}

// indexedValueMap returns the string-indexing value map.
func (vmb *valueMapBuilder) indexedValueMap() map[int64]*V {
	return vmb.valsByKeyIdx
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
	return func(vmb *valueMapBuilder) error {
		if predicate {
			return t(vmb)
		}
		return f(vmb)
	}
}

// Chain applies the provided Dataupdates in order.
func Chain(updates ...PropertyUpdate) PropertyUpdate {
	return func(vmb *valueMapBuilder) error {
		vmb.with(updates...)
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
	return func(vmb *valueMapBuilder) error {
		vmb.withStr(key, value)
		return nil
	}
}

// StringsProperty returns a PropertyUpdate adding the specified string slice
// property.
func StringsProperty(key string, values ...string) PropertyUpdate {
	return func(vmb *valueMapBuilder) error {
		vmb.withStrs(key, values...)
		return nil
	}
}

// StringsPropertyExtended returns a PropertyUpdate extending the specified string
// slice property.
func StringsPropertyExtended(key string, values ...string) PropertyUpdate {
	return func(vmb *valueMapBuilder) error {
		vmb.appendStrs(key, values...)
		return nil
	}
}

// IntegerProperty returns a PropertyUpdate adding the specified integer property.
func IntegerProperty(key string, value int64) PropertyUpdate {
	return func(vmb *valueMapBuilder) error {
		vmb.withInt(key, value)
		return nil
	}
}

// IntegersProperty returns a PropertyUpdate adding the specified integer slice
// property.
func IntegersProperty(key string, values ...int64) PropertyUpdate {
	return func(vmb *valueMapBuilder) error {
		vmb.withInts(key, values...)
		return nil
	}
}

// DoubleProperty returns a PropertyUpdate adding the specified double property.
func DoubleProperty(key string, value float64) PropertyUpdate {
	return func(vmb *valueMapBuilder) error {
		vmb.withDbl(key, value)
		return nil
	}
}

// DurationProperty returns a PropertyUpdate adding the specified duration property.
func DurationProperty(key string, value time.Duration) PropertyUpdate {
	return func(vmb *valueMapBuilder) error {
		vmb.withDuration(key, value)
		return nil
	}
}

// TimestampProperty returns a PropertyUpdate adding the specified timestamp
// property.
func TimestampProperty(key string, value time.Time) PropertyUpdate {
	return func(vmb *valueMapBuilder) error {
		vmb.withTimestamp(key, value)
		return nil
	}
}
