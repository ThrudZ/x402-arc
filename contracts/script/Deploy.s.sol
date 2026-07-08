// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";
import {EscrowPaymentGateway} from "../src/EscrowPaymentGateway.sol";

/// @notice Deploys the escrow gateway. Set USDC and OWNER via env.
///         forge script script/Deploy.s.sol --rpc-url $ARC_RPC_URL --broadcast
contract Deploy is Script {
    function run() external returns (EscrowPaymentGateway gateway) {
        address usdc = vm.envAddress("USDC_ADDRESS");
        address owner = vm.envOr("OWNER", msg.sender);

        vm.startBroadcast();
        gateway = new EscrowPaymentGateway(IERC20(usdc), owner);
        vm.stopBroadcast();

        console.log("EscrowPaymentGateway:", address(gateway));
        console.log("token (USDC):", usdc);
        console.log("owner:", owner);
    }
}
