CURRENT_DIR=`pwd`
SHELL=/bin/bash
MAKE=make --no-print-directory

install:
	@  ${MAKE} -C ${CURRENT_DIR}/src

.PHONY: install
