rtcmods = rtc rtc-media rtc-core rtc-signaller rtc-signaller-socket.io
blockdown = `npm bin`/blockdown
injectcode = `npm bin`/injectcode
outputfiles = $(filter-out template.html,$(wildcard *.html))
sourcedocs = $(patsubst %.md,%.html,$(subst src/,,$(wildcard src/*.md)))
tutorials = $(patsubst %.md,tutorial-%.html,$(subst src/tutorials/,,$(wildcard src/tutorials/*.md)))
samples = $(subst code/,js/samples/,$(wildcard code/*.js))

default: build

clean:
	@rm -f $(outputfiles)
	@rm -rf js/samples/

fetch: $(rtcmods)

app:
	browserify --debug src/app.js > js/app.js

$(rtcmods):
	@echo "fetching $@ module readme"
	@curl -s https://raw.github.com/rtc-io/$@/master/README.md | \
		$(blockdown) template.html > module-$@.html

	@echo "- [$@](module-$@.html)" >> build/modules.md

js/samples/%.js:
	browserify --debug $(subst js/samples/,code/,$@) > $@

tutorial-%.html:
	cat src/tutorials/$(patsubst tutorial-%.html,%.md,$@) | $(injectcode) | $(blockdown) template.html > $@

%.html:
	$(blockdown) template.html < build/$(patsubst %.html,%.md,$@) > $@

prepare:
	@rm -rf build/
	@mkdir -p js/samples/
	@mkdir -p build/
	@cp src/*.md build/
	echo $(samples)

build: clean prepare app fetch $(sourcedocs) $(tutorials) $(samples)