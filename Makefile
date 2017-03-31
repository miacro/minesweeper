CURRENT_DIR=`pwd`
SHELL=/bin/bash
MAKE=make --no-print-directory
TARGET=""

install:
	@  ${MAKE} -C ${CURRENT_DIR}/src ${TARGET}

.PHONY: install
