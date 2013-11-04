rtcmods = rtc rtc-media rtc-quickconnect rtc-glue rtc-core rtc-signaller rtc-switchboard rtc-canvas rtc-audio
blockdown = `npm bin`/blockdown
injectcode = `npm bin`/injectcode
outputfiles = $(filter-out template.html,$(wildcard *.html))
sourcedocs = $(patsubst %.md,%.html,$(subst src/,,$(wildcard src/*.md)))
tutorials = $(patsubst %.md,tutorial-%.html,$(subst src/tutorials/,,$(wildcard src/tutorials/*.md)))
samples = $(subst code/,js/samples/,$(wildcard code/*.js))

default: build

app: prepare
	browserify --debug src/app.js > js/app.js

static: prepare
	cp src/static/* .

$(rtcmods): prepare
	@echo "fetching $@ module readme"
	@curl -s https://raw.github.com/rtc-io/$@/master/README.md | \
		$(blockdown) template.html > module-$@.html

js/samples/%.js: prepare
	browserify --debug $(subst js/samples/,code/,$@) > $@

tutorial-%.html: prepare
	cat src/tutorials/$(patsubst tutorial-%.html,%.md,$@) | $(injectcode) | $(blockdown) template.html > $@

%.html: prepare $(rtcmods)
	$(blockdown) template.html < build/$(patsubst %.html,%.md,$@) > $@

prepare:
	@rm -f $(outputfiles)
	@rm -rf js/samples/
	@rm -rf build/
	@mkdir -p js/samples/
	@mkdir -p build/
	@cp src/*.md build/
	
	@for mod in ${rtcmods}; do \
		echo "- [$${mod}](module-$${mod}.html)" >> build/modules.md ; \
	done


build: prepare app static $(rtcmods) $(sourcedocs) $(tutorials) $(samples)