// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {EscrowPaymentGateway} from "../src/EscrowPaymentGateway.sol";
import {BaseEscrowTest} from "./BaseEscrowTest.sol";

contract EscrowWithdrawTest is BaseEscrowTest {
    function test_withdraw_requiresRequestFirst() public {
        vm.startPrank(buyer);
        gateway.deposit(100e6);
        vm.expectRevert(EscrowPaymentGateway.WithdrawLocked.selector);
        gateway.withdraw(10e6);
        vm.stopPrank();
    }

    function test_withdraw_afterCooldown() public {
        vm.startPrank(buyer);
        gateway.deposit(100e6);
        gateway.requestWithdraw();
        vm.warp(block.timestamp + 1 days);
        gateway.withdraw(60e6);
        vm.stopPrank();
        assertEq(gateway.deposits(buyer), 40e6);
    }

    function test_deposit_cancelsPendingWithdraw() public {
        vm.startPrank(buyer);
        gateway.deposit(100e6);
        gateway.requestWithdraw();
        vm.warp(block.timestamp + 1 days);
        // A fresh deposit resets the unlock timer.
        gateway.deposit(10e6);
        vm.expectRevert(EscrowPaymentGateway.WithdrawLocked.selector);
        gateway.withdraw(10e6);
        vm.stopPrank();
    }

    function test_withdraw_rejectsZero() public {
        vm.startPrank(buyer);
        gateway.deposit(100e6);
        gateway.requestWithdraw();
        vm.warp(block.timestamp + 1 days);
        vm.expectRevert(EscrowPaymentGateway.ZeroAmount.selector);
        gateway.withdraw(0);
        vm.stopPrank();
    }

    function test_withdraw_rejectsMoreThanBalance() public {
        vm.startPrank(buyer);
        gateway.deposit(100e6);
        gateway.requestWithdraw();
        vm.warp(block.timestamp + 1 days);
        vm.expectRevert(EscrowPaymentGateway.InsufficientDeposit.selector);
        gateway.withdraw(101e6);
        vm.stopPrank();
    }
}
