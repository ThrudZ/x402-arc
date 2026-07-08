// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "openzeppelin-contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";
import {EscrowPaymentGateway} from "../src/EscrowPaymentGateway.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract EscrowPaymentGatewayTest is Test {
    EscrowPaymentGateway internal gateway;
    MockUSDC internal usdc;

    uint256 internal buyerPk = 0xA11CE;
    address internal buyer;
    address internal seller = address(0xBEEF);
    address internal facilitator = address(0xF00D);
    address internal owner = address(0xACC0);

    function setUp() public {
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
        bytes32 digest = gateway.voucherDigest(v);
        (uint8 vSig, bytes32 r, bytes32 s) = vm.sign(buyerPk, digest);
        return abi.encodePacked(r, s, vSig);
    }

    function test_depositAndRedeem() public {
        vm.prank(buyer);
        gateway.deposit(100e6);
        assertEq(gateway.deposits(buyer), 100e6);

        EscrowPaymentGateway.Voucher memory v = _voucher(10e6, 1);
        bytes memory sig = _sign(v);

        vm.prank(facilitator);
        gateway.redeem(v, sig);

        assertEq(gateway.deposits(buyer), 90e6);
        assertEq(gateway.earnings(seller), 10e6);

        vm.prank(seller);
        gateway.claim();
        assertEq(usdc.balanceOf(seller), 10e6);
    }

    function test_redeemTakesFee() public {
        vm.prank(owner);
        gateway.setFee(100, owner); // 1%

        vm.prank(buyer);
        gateway.deposit(100e6);

        EscrowPaymentGateway.Voucher memory v = _voucher(10e6, 1);
        vm.prank(facilitator);
        gateway.redeem(v, _sign(v));

        assertEq(gateway.earnings(seller), 9_900_000); // 9.9 USDC
        assertEq(gateway.earnings(owner), 100_000); // 0.1 USDC
    }

    function test_cannotDoubleRedeem() public {
        vm.prank(buyer);
        gateway.deposit(100e6);

        EscrowPaymentGateway.Voucher memory v = _voucher(10e6, 1);
        bytes memory sig = _sign(v);
        gateway.redeem(v, sig);

        vm.expectRevert(EscrowPaymentGateway.AlreadyRedeemed.selector);
        gateway.redeem(v, sig);
    }

    function test_rejectsForgedSignature() public {
        vm.prank(buyer);
        gateway.deposit(100e6);

        EscrowPaymentGateway.Voucher memory v = _voucher(10e6, 1);
        bytes32 digest = gateway.voucherDigest(v);
        (uint8 vSig, bytes32 r, bytes32 s) = vm.sign(0xBADBAD, digest);
        bytes memory badSig = abi.encodePacked(r, s, vSig);

        vm.expectRevert(EscrowPaymentGateway.BadSignature.selector);
        gateway.redeem(v, badSig);
    }

    function test_withdrawRespectsCooldown() public {
        vm.startPrank(buyer);
        gateway.deposit(100e6);

        vm.expectRevert(EscrowPaymentGateway.WithdrawLocked.selector);
        gateway.withdraw(50e6);

        gateway.requestWithdraw();
        vm.expectRevert(EscrowPaymentGateway.WithdrawLocked.selector);
        gateway.withdraw(50e6);

        vm.warp(block.timestamp + 1 days);
        gateway.withdraw(50e6);
        vm.stopPrank();

        assertEq(gateway.deposits(buyer), 50e6);
        assertEq(usdc.balanceOf(buyer), 950e6);
    }

    function test_expiredVoucherReverts() public {
        vm.prank(buyer);
        gateway.deposit(100e6);

        EscrowPaymentGateway.Voucher memory v = _voucher(10e6, 1);
        bytes memory sig = _sign(v);
        vm.warp(block.timestamp + 2 hours);

        vm.expectRevert(EscrowPaymentGateway.DeadlineExpired.selector);
        gateway.redeem(v, sig);
    }
}
