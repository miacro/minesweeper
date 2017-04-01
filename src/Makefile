SHELL=/bin/bash
MAKE=make --no-print-directory

INSTALL_PREFIX=`pwd`/../js
INSTALL_MODULE_PREFIX=${INSTALL_PREFIX}/modules
MODULES_PREFIX=`pwd`/node_modules
MODULE_CATE=""
MODULE_FILE=""

install:
	@  ${MAKE} clean \
	&& npm run webpack 

install-debug:
	@  ${MAKE} clean \
	&& npm run webpack-debug

install-module:
	@  [[ -d ${INSTALL_MODULE_PREFIX}/${MODULE_CATE} ]] \
	|| mkdir -p ${INSTALL_MODULE_PREFIX}/${MODULE_CATE} \
	&& cp ${MODULES_PREFIX}/${MODULE_CATE}/${MODULE_FILE} \
	      ${INSTALL_MODULE_PREFIX}/${MODULE_CATE}/${MODULE_FILE}

init:
	npm install

all:
	@  ${MAKE} init \
	&& ${MAKE} install

clean:
	@ rm -rf ${INSTALL_PREFIX}

.PHONY: all install init clean
