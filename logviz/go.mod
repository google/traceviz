module github.com/google/traceviz/logviz

go 1.20

require (
	github.com/google/go-cmp v0.5.9
	github.com/google/traceviz/server/go v0.0.0-00010101000000-000000000000
	github.com/hashicorp/golang-lru v0.6.0
)

require golang.org/x/sync v0.1.0 // indirect

replace github.com/google/traceviz/server/go => ../server/go
