.DEFAULT_GOAL := help
.PHONY: help install dev test watch lint format build preview colours

help: ## Show this help
	@grep -E '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

install: ## Install the pinned toolchain and dependencies
	mise install
	pnpm install

dev: ## Run the dev server
	pnpm dev

test: ## Run the whole test suite
	pnpm test

watch: ## Run the tests and re-run them on change
	pnpm watch

lint: ## Check formatting, lint rules and types
	pnpm lint

format: ## Rewrite files to the formatter's liking
	pnpm format

build: ## Typecheck and build into dist/
	pnpm build

preview: ## Serve the production build
	pnpm preview

colours: ## Re-derive the set's colours from the photographs
	dev/tools/measure-pigment.py
