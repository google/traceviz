package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"

	"github.com/google/traceviz/logviz/logger"
	"github.com/google/traceviz/logviz/service"
)

var (
	port = flag.Int("port", 7410, "Port to serve LogViz clients on")
)

func main() {
	flag.Parse()

	service, err := service.New("./client", "./logs", 10)
	if err != nil {
		log.Fatalf(logger.Fatal("Failed to create LogViz service: %s", err))
	}

	mux := http.DefaultServeMux
	service.RegisterHandlers(mux)
	fmt.Printf("Serving on port %d\n", *port)
	http.ListenAndServe(
		fmt.Sprintf(":%d", *port),
		mux,
	)
}
