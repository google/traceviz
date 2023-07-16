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

// Package handlers provides tools for handling frontend requests.
package handlers

import (
	"fmt"
	"io/ioutil"
	"net/http"

	"github.com/google/safehtml"
)

// Asset represents an HTTP-served static asset.
type Asset interface {
	HTTPHandler(http.ResponseWriter, *http.Request)
}

// FileAsset represents an HTTP-served static asset served from the local
// filesystem.
type FileAsset struct {
	path        string
	contentType string
}

// NewFileAsset returns a new FileAsset with the specified content path and
// type.
func NewFileAsset(path, contentType string) *FileAsset {
	return &FileAsset{
		path:        path,
		contentType: contentType,
	}
}

// fetch returns the contents of the receiving FileAsset, or any error
// encountered.
func (fa *FileAsset) fetch() ([]byte, error) {
	return ioutil.ReadFile(fa.path)
}

// HTTPHandler fetches and serves the receiving FileAsset.
func (fa *FileAsset) HTTPHandler(w http.ResponseWriter, req *http.Request) {
	contents, err := fa.fetch()
	if err != nil {
		fmt.Printf("Failed to fetch asset at %s: %s", req.URL.Path, err)
		http.Error(w, "Failed to fetch asset at "+safehtml.HTMLEscaped(req.URL.Path).String()+": "+safehtml.HTMLEscaped(err.Error()).String(), http.StatusNotFound)
		return
	}
	w.Header().Add("Content-Type", fa.contentType)
	_, err = fmt.Fprintf(w, "%s", contents)
	if err != nil {
		fmt.Printf("Failed to write asset at %s: %s", req.URL.Path, err)
		http.Error(w, "Failed to write asset at "+safehtml.HTMLEscaped(req.URL.Path).String()+": "+safehtml.HTMLEscaped(err.Error()).String(), http.StatusInternalServerError)
	}
}

// AssetHandler implements http.Handler, and serves static assets (HTML, JS,
// CSS, etc.)
type AssetHandler struct {
	handlersByPath map[string]func(http.ResponseWriter, *http.Request)
}

// NewAssetHandler returns a new, empty Handler.
func NewAssetHandler() *AssetHandler {
	return &AssetHandler{
		handlersByPath: map[string]func(http.ResponseWriter, *http.Request){},
	}
}

// With associates the provided Asset with the provided request path.  Any
// Asset previously served under that path is replaced.
func (ah *AssetHandler) With(requestPath string, asset Asset) *AssetHandler {
	ah.handlersByPath[requestPath] = asset.HTTPHandler
	return ah
}

// HandlersByPath returns a mapping of HTTP request path to HTTP handler for
// this Handler.
func (ah *AssetHandler) HandlersByPath() map[string]func(http.ResponseWriter, *http.Request) {
	return ah.handlersByPath
}
