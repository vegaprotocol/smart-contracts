# Makefile

SHELL := /bin/bash
ABIDIR := build/contracts
SOLC_CONTAINER := ethereum/solc:0.8.6

.PHONY: default
default: abi

.PHONY: abi
abi:
	@mkdir -p $(ABIDIR)
	@find $(ABIDIR) -iname '*.abi' -o -iname '*.json' -print0 | xargs -0r rm
	docker run --rm \
		--user "$$(id -u):$$(id -g)" \
		-v "$$PWD:$$PWD" \
		-w "$$PWD" \
		$(SOLC_CONTAINER) \
			-o $(ABIDIR)/ --abi contracts/*.sol
	@find $(ABIDIR) -name '*.abi' \
		| while read -r abifile ; \
	do \
		jq --sort-keys . <"$$abifile" >"$${abifile%.abi}_ABI.json" && rm "$$abifile" ; \
	done
