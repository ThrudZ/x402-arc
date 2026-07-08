// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {EscrowPaymentGateway} from "../src/EscrowPaymentGateway.sol";
import {BaseEscrowTest} from "./BaseEscrowTest.sol";

contract EscrowRedeemTest is BaseEscrowTest {
    function test_redeem_rejectsInsufficientDeposit() public {
        vm.prank(buyer);
        gateway.deposit(5e6);
        EscrowPaymentGateway.Voucher memory v = _voucher(10e6, 1);
        bytes memory sig = _sign(v); // sign before arming expectRevert
        vm.expectRevert(EscrowPaymentGateway.InsufficientDeposit.selector);
        gateway.redeem(v, sig);
    }

    function test_redeem_multipleVouchersAccumulate() public {
        vm.prank(buyer);
        gateway.deposit(100e6);

        for (uint256 i = 1; i <= 3; i++) {
            EscrowPaymentGateway.Voucher memory v = _voucher(10e6, i);
            gateway.redeem(v, _sign(v));
        }
        assertEq(gateway.deposits(buyer), 70e6);
        assertEq(gateway.earnings(seller), 30e6);
    }

    /// forge-config: default.fuzz.runs = 256
    function testFuzz_redeem_conservesValue(uint96 depositAmount, uint96 voucherAmount) public {
        depositAmount = uint96(bound(depositAmount, 1, 1_000e6));
        voucherAmount = uint96(bound(voucherAmount, 1, depositAmount));

        vm.prank(buyer);
        gateway.deposit(depositAmount);

        EscrowPaymentGateway.Voucher memory v = _voucher(voucherAmount, 1);
        gateway.redeem(v, _sign(v));

        // No fee configured: deposit debited exactly equals seller credit.
        assertEq(gateway.deposits(buyer), uint256(depositAmount) - voucherAmount);
        assertEq(gateway.earnings(seller), voucherAmount);
    }

    function test_claim_rejectsZeroEarnings() public {
        vm.prank(seller);
        vm.expectRevert(EscrowPaymentGateway.ZeroAmount.selector);
        gateway.claim();
    }
}
