module github.com/google/traceviz/logviz

go 1.20

require (
	github.com/google/go-cmp v0.5.9
	github.com/google/traceviz/server/go v0.0.0
	github.com/hashicorp/golang-lru v0.6.0
)

require (
	github.com/google/safehtml v0.1.0 // indirect
	golang.org/x/sync v0.1.0 // indirect
	golang.org/x/text v0.3.8 // indirect
)

replace github.com/google/traceviz/server/go => ../server/go
