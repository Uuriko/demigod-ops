.PHONY: test verify
test:
	bash scripts/verify-dasha-cmc-packet.sh

verify: test
