package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"

	"github.com/google/traceviz/logviz/service"
)

var (
	port         = flag.Int("port", 7410, "Port to serve LogViz clients on")
	resourceRoot = flag.String("resource_root", "", "The path to the LogViz tool client resources")
	logRoot      = flag.String("log_root", ".", "The root path for visualizable logs")
)

func main() {
	flag.Parse()

	service, err := service.New(*resourceRoot, *logRoot, 10)
	if err != nil {
		log.Fatalf("Failed to create LogViz service: %s", err)
	}

	mux := http.DefaultServeMux
	service.RegisterHandlers(mux)
	mux.Handle("/", http.FileServer(http.Dir(*resourceRoot)))
	fmt.Printf("Serving on port %d\n", *port)
	http.ListenAndServe(
		fmt.Sprintf(":%d", *port),
		mux,
	)
}
