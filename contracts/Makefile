.PHONY: install build test fmt deploy

install:
	forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts

build:
	forge build

test:
	forge test -vv

fmt:
	forge fmt

# Requires USDC_ADDRESS, OWNER, PRIVATE_KEY and ARC_RPC_URL in the environment.
deploy:
	forge script script/Deploy.s.sol:Deploy \
		--rpc-url $(ARC_RPC_URL) \
		--private-key $(PRIVATE_KEY) \
		--broadcast
