package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"

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
	hostname, err := os.Hostname()
	if err != nil {
		log.Fatalf("Failed to get hostname: %s", err)
	}

	// Provide OSC 8 (https://en.wikipedia.org/wiki/ANSI_escape_code#OSC) link for
	// compatible terminals.
	fmt.Printf("Serving LogViz at \x1B]8;;http://%[1]s:%[2]d\x07http://%[1]s:%[2]d\x1B]8;;\x07", hostname, *port)
	http.ListenAndServe(
		fmt.Sprintf(":%d", *port),
		mux,
	)
}
