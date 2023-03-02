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

package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	querydispatcher "github.com/google/traceviz/server/go/query_dispatcher"
	"github.com/google/traceviz/server/go/util"
)

// HandlerFunc is a HTTP handler function.
type HandlerFunc func(http.ResponseWriter, *http.Request)

// WrapFunc is a function that rewrites a HandlerFunc.
type WrapFunc func(HandlerFunc) HandlerFunc

// Handler describes a TraceViz HTTP handler.
type Handler interface {
	HandlersByPath() map[string]func(http.ResponseWriter, *http.Request)
}

// QueryHandler is a Handler for data queries.  It supports a Wrap method that
// wraps all handlers, e.g. adding cookies.
type QueryHandler interface {
	Handler
	Wrap(...WrapFunc) Handler
}

// sendHTTPResponse serializes the provided protobuf and sends it along the
// provided http.ResponseWriter.  Any failures during serialization yield an
// HTTP internal status error.
func sendHTTPResponse(resp *util.Data, w http.ResponseWriter) {
	respStr, err := json.Marshal(resp)
	if err != nil {
		http.Error(w, "Failed to marshal response: "+err.Error(), http.StatusInternalServerError)
	}
	w.Header().Add("Content-Type", "application/json")
	fmt.Fprint(w, string(respStr))
}

// queryHandler is an http.Handler serving TraceViz queries.
type queryHandler struct {
	qd       *querydispatcher.QueryDispatcher
	wrappers []WrapFunc
}

// NewQueryHandler returns a new Handler serving TraceViz requests using the
// provided QueryDispatcher.
func NewQueryHandler(qd *querydispatcher.QueryDispatcher) QueryHandler {
	return &queryHandler{
		qd: qd,
	}
}

const (
	dataMethod = "/GetData"
)

type contextKey string

var (
	httpReqKey contextKey = "traceviz_http_req"
)

func (qh *queryHandler) Wrap(wrappers ...WrapFunc) Handler {
	qh.wrappers = append(qh.wrappers, wrappers...)
	return qh
}

// HandlersByPath returns a mapping of HTTP request path to HTTP handler for
// this Handler.
func (qh *queryHandler) HandlersByPath() map[string]func(http.ResponseWriter, *http.Request) {
	var dh HandlerFunc = qh.getDataHandler
	for _, wrapper := range qh.wrappers {
		dh = wrapper(dh)
	}
	return map[string]func(http.ResponseWriter, *http.Request){
		dataMethod: dh,
	}
}

func (qh *queryHandler) getDataHandler(w http.ResponseWriter, req *http.Request) {
	dataReq := &util.DataRequest{}
	if err := req.ParseForm(); err != nil {
		http.Error(w, "Failed to parse form: "+err.Error(), http.StatusBadRequest)
	}
	if err := json.Unmarshal([]byte(req.Form.Get("req")), &dataReq); err != nil {
		http.Error(w, "Failed to parse DataRequest: "+err.Error(), http.StatusBadRequest)
		return
	}
	ctx := req.Context()
	resp, err := qh.qd.HandleDataRequest(context.WithValue(ctx, httpReqKey, req), dataReq)
	if err != nil {
		http.Error(w, "DataRequest failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	sendHTTPResponse(resp, w)
}

// HTTPRequestFromContext returns the *http.Request stored in the provided context, or nil if no
// request is stored in the context.
func HTTPRequestFromContext(ctx context.Context) *http.Request {
	req := ctx.Value(httpReqKey)
	return req.(*http.Request)
}
