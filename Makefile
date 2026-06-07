SHELL := /bin/sh

HOST ?= 0.0.0.0
PORT ?= 18700

.PHONY: serve build test root-index help

serve:
	@echo "Serving http://$(HOST):$(PORT)"
	@exec npm run dev -- --host "$(HOST)" --port "$(PORT)"

build:
	@exec npm run build

test:
	@exec npm test

root-index:
	@echo "Root index: site-root/index.html"

help:
	@echo "make serve              Start the web server"
	@echo "make build              Build the production bundle"
	@echo "make test               Run the unit tests"
	@echo "make root-index          Show the github.io root index location"
	@echo "make serve PORT=3000    Use a custom port"
	@echo "make serve HOST=0.0.0.0 Allow access from other devices"
