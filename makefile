build:
	# Cleanup the artifacts folder, create the distribution location.
	rm -rf artifacts || true
	mkdir artifacts
	mkdir artifacts/dist

	# Copy over the static site files.
	cp -r index.html og.png og.jpg LICENSE css js sounds themes fx img artifacts/dist/.

.PHONY: build
