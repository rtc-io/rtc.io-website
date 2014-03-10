rtcmods = rtc rtc-media rtc-quickconnect rtc-glue rtc-core rtc-signaller rtc-switchboard rtc-audioproc rtc-captureconfig rtc-videoproc rtc-mesh rtc-dcstream rtc-sharedcursor
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
	@curl -s https://raw.github.com/rtc-io/$@/master/README.md > tmp_$@
	@$(blockdown) --repo="https://github.com/rtc-io/$@" template.html < tmp_$@ > module-$@.html
	@rm tmp_$@

js/samples/%.js: prepare
	browserify --debug $(subst js/samples/,code/,$@) > $@

tutorial-%.html: prepare
	@echo "generating $@"
	@cat src/tutorials/$(patsubst tutorial-%.html,%.md,$@) | $(injectcode) > tmp_$@
	@$(blockdown) template.html < tmp_$@ > $@
	@rm tmp_$@

buildstatus.html:
	@echo "generating build status doc"
	@$(blockdown) --repo="https://github.com/rtc-io" template.html < src/buildstatus.md > $@

%.html: prepare
	@echo "generating $@"
	@$(blockdown) --repo="https://github.com/rtc-io" template.html < src/$(patsubst %.html,%.md,$@) > $@

node_modules:
	@npm install

prepare:
	@rm -f $(outputfiles)
	@rm -rf js/samples/
	@mkdir -p js/samples/

local: node_modules prepare app static updatelibs $(sourcedocs) $(tutorials) $(samples)

all: local $(rtcmods)