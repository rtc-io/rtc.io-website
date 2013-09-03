rtcmods = rtc rtc-media rtc-signaller rtc-core
blockdown = `npm bin`/blockdown
injectcode = `npm bin`/injectcode
outputfiles = $(filter-out template.html,$(wildcard *.html))
sourcedocs = $(patsubst %.md,%.html,$(subst src/,,$(wildcard src/*.md)))
tutorials = $(patsubst %.md,tutorial-%.html,$(subst src/tutorials/,,$(wildcard src/tutorials/*.md)))

default: build

clean:
	@rm $(outputfiles)

fetch: $(rtcmods)

app:
	@mkdir -p js
	browserify --debug src/app.js > js/app.js

$(rtcmods):
	@mkdir -p modules
	@echo "fetching $@ module readme"
	@curl -s https://raw.github.com/rtc-io/$@/master/README.md | \
		$(blockdown) template.html > module-$@.html

	@echo "- [$@](module-$@.html)" >> build/modules.md

tutorial-%.html:
	cat src/tutorials/$(patsubst tutorial-%.html,%.md,$@) | $(injectcode) | $(blockdown) template.html > $@

%.html:
	$(blockdown) template.html < build/$(patsubst %.html,%.md,$@) > $@

prepare:
	@rm -rf build/
	@mkdir -p build/
	@cp src/*.md build/

build: clean prepare app fetch $(sourcedocs) $(tutorials)