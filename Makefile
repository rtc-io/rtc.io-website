rtcmods = rtc rtc-media rtc-signaller
blockdown = `npm bin`/blockdown
outputfiles = $(filter-out index.html,$(wildcard *.html))
sourcedocs = $(patsubst %.md,%.html,$(subst src/,,$(wildcard src/*.md)))

default: build

clean:
	@rm $(outputfiles)

fetch: $(rtcmods)

$(rtcmods):
	@mkdir -p modules
	@echo "fetching $@ module readme"
	@curl -s https://raw.github.com/rtc-io/$@/master/README.md | \
		$(blockdown) index.html > module-$@.html

	@echo "- [$@](module-$@.html)" >> build/modules.md

%.html:
	$(blockdown) index.html < build/$(patsubst %.html,%.md,$@) > $@

prepare:
	@rm -rf build/
	@mkdir -p build/
	@cp src/*.md build/

build: clean prepare fetch $(sourcedocs)