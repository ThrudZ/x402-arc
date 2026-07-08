// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";
import {EscrowPaymentGateway} from "../src/EscrowPaymentGateway.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

/// @notice Shared setup and voucher-signing helpers for escrow tests.
abstract contract BaseEscrowTest is Test {
    EscrowPaymentGateway internal gateway;
    MockUSDC internal usdc;

    uint256 internal buyerPk = 0xA11CE;
    address internal buyer;
    address internal seller = address(0xBEEF);
    address internal owner = address(0xACC0);

    function setUp() public virtual {
        buyer = vm.addr(buyerPk);
        usdc = new MockUSDC();
        gateway = new EscrowPaymentGateway(IERC20(address(usdc)), owner);

        usdc.mint(buyer, 1_000e6);
        vm.prank(buyer);
        usdc.approve(address(gateway), type(uint256).max);
    }

    function _voucher(uint256 amount, uint256 nonce)
        internal
        view
        returns (EscrowPaymentGateway.Voucher memory v)
    {
        v = EscrowPaymentGateway.Voucher({
            buyer: buyer,
            seller: seller,
            amount: amount,
            resourceId: keccak256("GET /premium"),
            nonce: nonce,
            deadline: block.timestamp + 1 hours
        });
    }

    function _sign(EscrowPaymentGateway.Voucher memory v) internal view returns (bytes memory) {
        (uint8 vSig, bytes32 r, bytes32 s) = vm.sign(buyerPk, gateway.voucherDigest(v));
        return abi.encodePacked(r, s, vSig);
    }
}
