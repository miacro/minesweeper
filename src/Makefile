SHELL=/bin/bash
MAKE=make --no-print-directory
FORMAT_CODE=`pwd`/bin/format-code.sh -l javascript

install:
	@  ${MAKE} clean \
	&& npm run webpack 

install-debug:
	@  ${MAKE} clean \
	&& npm run webpack-debug

code-format:
	@  ${FORMAT_CODE} component mine-matrix init.js webpack.config.js

init:
	npm install

all:
	@  ${MAKE} init \
	&& ${MAKE} install

clean:
	@ rm -rf ${INSTALL_PREFIX}

.PHONY: all install init clean code-format
