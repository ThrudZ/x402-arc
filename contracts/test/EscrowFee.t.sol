// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";
import {EscrowPaymentGateway} from "../src/EscrowPaymentGateway.sol";
import {BaseEscrowTest} from "./BaseEscrowTest.sol";

contract EscrowFeeTest is BaseEscrowTest {
    function test_setFee_onlyOwner() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, buyer));
        vm.prank(buyer);
        gateway.setFee(100, owner);
    }

    function test_setFee_rejectsAboveCeiling() public {
        vm.prank(owner);
        vm.expectRevert(EscrowPaymentGateway.FeeTooHigh.selector);
        gateway.setFee(501, owner);
    }

    function test_setFee_allowsCeiling() public {
        vm.prank(owner);
        gateway.setFee(500, owner);
        assertEq(gateway.feeBps(), 500);
        assertEq(gateway.feeRecipient(), owner);
    }

    function test_fee_splitsBetweenSellerAndRecipient() public {
        vm.prank(owner);
        gateway.setFee(250, owner); // 2.5%

        vm.prank(buyer);
        gateway.deposit(100e6);

        EscrowPaymentGateway.Voucher memory v = _voucher(40e6, 1);
        gateway.redeem(v, _sign(v));

        assertEq(gateway.earnings(seller), 39e6); // 40 - 2.5%
        assertEq(gateway.earnings(owner), 1e6); // 2.5% of 40
    }

    function test_zeroFee_paysSellerInFull() public {
        vm.prank(buyer);
        gateway.deposit(100e6);
        EscrowPaymentGateway.Voucher memory v = _voucher(40e6, 1);
        gateway.redeem(v, _sign(v));
        assertEq(gateway.earnings(seller), 40e6);
    }
}
