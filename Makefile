rtcmods = rtc rtc-media rtc-quickconnect rtc-glue rtc-core rtc-signaller rtc-switchboard rtc-audio rtc-captureconfig rtc-videoproc rtc-mesh rtc-dcstream
blockdown = `npm bin`/blockdown
injectcode = `npm bin`/injectcode
outputfiles = $(filter-out template.html,$(wildcard *.html))
sourcedocs = $(patsubst %.md,%.html,$(subst src/,,$(wildcard src/*.md)))
tutorials = $(patsubst %.md,tutorial-%.html,$(subst src/tutorials/,,$(wildcard src/tutorials/*.md)))
samples = $(subst code/,js/samples/,$(wildcard code/*.js))

default: all

app: prepare
	@echo "Building site application code"
	@browserify --debug src/app.js > js/app.js

static: prepare
	@echo "Preparing static assets"
	@cp src/static/* .

updatelibs:
	@echo "Updating rtc-glue"
	@cp ./node_modules/rtc-glue/dist/* .

$(rtcmods): prepare
	@echo "fetching $@ module readme"
	@curl -s https://raw.github.com/rtc-io/$@/master/README.md | \
		$(blockdown) --repo="https://github.com/rtc-io/$@" template.html > module-$@.html

js/samples/%.js: prepare
	browserify --debug $(subst js/samples/,code/,$@) > $@

tutorial-%.html: prepare
	cat src/tutorials/$(patsubst tutorial-%.html,%.md,$@) | $(injectcode) | $(blockdown) template.html > $@

%.html: prepare
	$(blockdown) --repo="https://github.com/rtc-io/rtc.io" template.html < build/$(patsubst %.html,%.md,$@) > $@

prepare:
	@rm -f $(outputfiles)
	@rm -rf js/samples/
	@rm -rf build/
	@mkdir -p js/samples/
	@mkdir -p build/
	@cp src/*.md build/

local: prepare app static updatelibs $(sourcedocs) $(tutorials) $(samples)

all: local $(rtcmods)