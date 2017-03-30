SHELL=/bin/bash
MAKE=make --no-print-directory

INSTALL_PREFIX=`pwd`/../js/modules
MODULES_PREFIX=`pwd`/node_modules
MODULE_CATE=""
MODULE_FILE=""

install:
	@  npm run build \
	&& ${MAKE} MODULE_CATE=/react/dist MODULE_FILE=react.min.js install-module \
	&& ${MAKE} MODULE_CATE=/react-dom/dist MODULE_FILE=react-dom.min.js install-module 

install-module:
	@  [[ -d ${INSTALL_PREFIX}/${MODULE_CATE} ]] \
	|| mkdir -p ${INSTALL_PREFIX}/${MODULE_CATE} \
	&& cp ${MODULES_PREFIX}/${MODULE_CATE}/${MODULE_FILE} \
				${INSTALL_PREFIX}/${MODULE_CATE}/${MODULE_FILE}

init:
	npm install

.PHONY: all install init
