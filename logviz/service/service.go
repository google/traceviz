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

package service

import (
	"bufio"
	"context"
	"fmt"
	"net/http"
	"os"
	"path"

	logreader "github.com/google/traceviz/logviz/analysis/log_reader"
	logtrace "github.com/google/traceviz/logviz/analysis/log_trace"
	datasource "github.com/google/traceviz/logviz/data_source"
	"github.com/google/traceviz/server/go/handlers"
	querydispatcher "github.com/google/traceviz/server/go/query_dispatcher"
	"github.com/hashicorp/golang-lru/simplelru"
)

type collectionFetcher struct {
	collectionRoot string
	lru            *simplelru.LRU
}

func newCollectionFetcher(collectionRoot string, cap int) (*collectionFetcher, error) {
	lru, err := simplelru.NewLRU(cap, nil /* no onEvict policy */)
	if err != nil {
		return nil, err
	}
	return &collectionFetcher{
		collectionRoot: collectionRoot,
		lru:            lru,
	}, nil
}

func (cf *collectionFetcher) Fetch(ctx context.Context, collectionName string) (*datasource.Collection, error) {
	collIf, ok := cf.lru.Get(collectionName)
	if ok {
		coll, ok := collIf.(*datasource.Collection)
		if !ok {
			return nil, fmt.Errorf("fetched collection wasn't a LogTrace")
		}
		return coll, nil
	}
	file, err := os.Open(path.Join(cf.collectionRoot, collectionName))
	if err != nil {
		return nil, err
	}
	// The TextLogReader takes ownership of the file.
	lr := logreader.New(
		collectionName,
		logreader.ReaderCloser{
			Reader: bufio.NewReader(file),
			Closer: file,
		},
		&logreader.CockroachDBLogParser{},
	)
	lt, err := logtrace.NewLogTrace(lr)
	if err != nil {
		return nil, err
	}
	coll := datasource.NewCollection(lt)
	cf.lru.Add(collectionName, coll)
	return coll, nil
}

type Service struct {
	queryHandler handlers.QueryHandler
	assetHandler *handlers.AssetHandler
}

func New(assetRoot, collectionRoot string, cap int) (*Service, error) {
	cf, err := newCollectionFetcher(collectionRoot, cap)
	if err != nil {
		return nil, err
	}
	ds, err := datasource.New(10, cf)
	if err != nil {
		return nil, err
	}
	qd, err := querydispatcher.New(ds)
	if err != nil {
		return nil, err
	}
	assetHandler := handlers.NewAssetHandler()
	addFileAsset := func(resourceName, resourceType, filename string) {
		assetHandler.With(
			resourceName,
			handlers.NewFileAsset(
				path.Join(assetRoot, filename),
				resourceType,
			),
		)
	}
	addFileAsset("/logviz-theme.css", "text/css", "logviz-theme.css")
	addFileAsset("/index.html", "text/html", "index.html")
	addFileAsset("main.js", "application/javascript", "main.js")
	addFileAsset("polyfills.js", "application/javascript", "polyfills.js")
	addFileAsset("runtime.js", "application/javascript", "runtime.js")
	addFileAsset("/favicon.ico", "image/x-icon", "favicon.ico")
	return &Service{
		queryHandler: handlers.NewQueryHandler(qd),
		assetHandler: assetHandler,
	}, nil
}

func (s *Service) RegisterHandlers(mux *http.ServeMux) {
	for path, handler := range s.queryHandler.HandlersByPath() {
		mux.HandleFunc(path, handler)
	}
}
