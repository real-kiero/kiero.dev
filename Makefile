.PHONY: dev build css

# Run Tailwind watch and Zola dev server together.
# Ctrl-C stops both.
dev:
	tailwindcss -i input.css -o static/css/main.css --watch &
	trap 'kill %1' EXIT; zola serve

# Production build: minified CSS then Zola.
build:
	tailwindcss -i input.css -o static/css/main.css --minify
	zola build

# Regenerate CSS only (useful after editing input.css).
css:
	tailwindcss -i input.css -o static/css/main.css
