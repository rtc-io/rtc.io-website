rtcmods = rtc rtc-tools rtc-media rtc-quickconnect rtc-core rtc-signaller rtc-switchboard rtc-audioproc rtc-captureconfig rtc-videoproc rtc-mesh rtc-dcstream rtc-sharedcursor
blockdown = `npm bin`/blockdown
injectcode = `npm bin`/injectcode
outputfiles = $(filter-out template.html,$(wildcard *.html))
sourcedocs = $(patsubst %.md,%.html,$(subst src/,,$(wildcard src/*.md)))
tutorials = $(patsubst %.md,tutorial-%.html,$(subst src/tutorials/,,$(wildcard src/tutorials/*.md)))
samples = $(subst code/,js/samples/,$(wildcard code/*.js))
githubcontent = https://raw.githubusercontent.com
baseurl_remote ?= ${githubcontent}/rtc-io

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
	@curl -s ${baseurl_remote}/$@/master/README.md > tmp_$@
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

fetch_remote:
	@echo "fetching remote resources (docs, etc)"
	@curl -s ${baseurl_remote}/rtc-signaller/master/docs/protocol.md  > src/signalling-protocol.md
	@curl -s ${baseurl_remote}/webrtc-testing-on-travis/master/README.md > src/testing-process.md

prepare:
	@rm -f $(outputfiles)
	@rm -rf js/samples/
	@mkdir -p js/samples/

local: node_modules prepare app static updatelibs $(sourcedocs) $(tutorials) $(samples)

all: fetch_remote local $(rtcmods)
