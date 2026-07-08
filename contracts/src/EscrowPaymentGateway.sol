// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";
import {EIP712} from "openzeppelin-contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "openzeppelin-contracts/utils/cryptography/ECDSA.sol";

/// @title EscrowPaymentGateway
/// @notice Prefunded escrow for x402 pay-per-request settlement on Arc.
///         A buyer deposits USDC once, then signs off-chain vouchers per
///         request. A facilitator redeems a voucher on-chain to move funds
///         from the buyer's escrow balance to the seller's claimable balance.
contract EscrowPaymentGateway is EIP712, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @dev A single off-chain payment authorization signed by the buyer.
    struct Voucher {
        address buyer;
        address seller;
        uint256 amount;
        bytes32 resourceId;
        uint256 nonce;
        uint256 deadline;
    }

    bytes32 private constant VOUCHER_TYPEHASH = keccak256(
        "Voucher(address buyer,address seller,uint256 amount,bytes32 resourceId,uint256 nonce,uint256 deadline)"
    );

    /// @notice USDC (or any ERC20) used for settlement.
    IERC20 public immutable token;

    /// @notice Cooldown before a requested withdrawal can be executed. Protects
    ///         in-flight vouchers from being rugged by an instant withdraw.
    uint256 public constant WITHDRAW_DELAY = 1 days;

    /// @notice Protocol fee in basis points taken from each redeemed voucher.
    uint256 public feeBps;
    /// @notice Recipient of protocol fees.
    address public feeRecipient;

    uint256 private constant MAX_FEE_BPS = 500; // 5% ceiling

    mapping(address buyer => uint256 amount) public deposits;
    mapping(address seller => uint256 amount) public earnings;
    mapping(bytes32 voucherHash => bool used) public redeemed;
    mapping(address buyer => uint256 unlockAt) public withdrawUnlockAt;

    event Deposited(address indexed buyer, uint256 amount);
    event WithdrawRequested(address indexed buyer, uint256 unlockAt);
    event Withdrawn(address indexed buyer, uint256 amount);
    event Redeemed(
        bytes32 indexed voucherHash,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        uint256 fee,
        bytes32 resourceId
    );
    event Claimed(address indexed seller, uint256 amount);
    event FeeUpdated(uint256 feeBps, address feeRecipient);

    error DeadlineExpired();
    error AlreadyRedeemed();
    error BadSignature();
    error InsufficientDeposit();
    error WithdrawLocked();
    error ZeroAmount();
    error FeeTooHigh();

    constructor(IERC20 _token, address _owner)
        EIP712("EscrowPaymentGateway", "1")
        Ownable(_owner)
    {
        token = _token;
    }

    /// @notice Deposit USDC into escrow to fund future requests.
    /// @param amount Amount of token (USDC base units) to pull from the caller.
    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        // A pending withdrawal is cancelled by a fresh deposit.
        withdrawUnlockAt[msg.sender] = 0;
        deposits[msg.sender] += amount;
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, amount);
    }

    /// @notice Start the withdrawal cooldown for the caller's escrow balance.
    function requestWithdraw() external {
        uint256 unlockAt = block.timestamp + WITHDRAW_DELAY;
        withdrawUnlockAt[msg.sender] = unlockAt;
        emit WithdrawRequested(msg.sender, unlockAt);
    }

    /// @notice Withdraw unused escrow balance after the cooldown elapses.
    /// @param amount Amount of the escrow balance to return to the caller.
    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        uint256 unlockAt = withdrawUnlockAt[msg.sender];
        if (unlockAt == 0 || block.timestamp < unlockAt) revert WithdrawLocked();
        if (deposits[msg.sender] < amount) revert InsufficientDeposit();
        deposits[msg.sender] -= amount;
        token.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Redeem a buyer-signed voucher, moving funds to the seller.
    /// @dev Callable by anyone (typically the facilitator). Settlement is
    ///      authorized entirely by the buyer's signature, not the caller.
    /// @param v The voucher authorizing the payment.
    /// @param signature The buyer's EIP-712 signature over the voucher.
    function redeem(Voucher calldata v, bytes calldata signature) external nonReentrant {
        if (block.timestamp > v.deadline) revert DeadlineExpired();

        bytes32 structHash = keccak256(
            abi.encode(
                VOUCHER_TYPEHASH,
                v.buyer,
                v.seller,
                v.amount,
                v.resourceId,
                v.nonce,
                v.deadline
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        if (redeemed[digest]) revert AlreadyRedeemed();

        address signer = ECDSA.recover(digest, signature);
        if (signer != v.buyer) revert BadSignature();
        if (deposits[v.buyer] < v.amount) revert InsufficientDeposit();

        redeemed[digest] = true;
        deposits[v.buyer] -= v.amount;

        uint256 fee = (v.amount * feeBps) / 10_000;
        uint256 net = v.amount - fee;
        earnings[v.seller] += net;
        if (fee > 0) {
            earnings[feeRecipient] += fee;
        }

        emit Redeemed(digest, v.buyer, v.seller, net, fee, v.resourceId);
    }

    /// @notice Seller pulls accumulated earnings to their wallet.
    function claim() external nonReentrant {
        uint256 amount = earnings[msg.sender];
        if (amount == 0) revert ZeroAmount();
        earnings[msg.sender] = 0;
        token.safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    /// @notice Owner sets the protocol fee and its recipient.
    /// @param _feeBps Fee in basis points, capped at MAX_FEE_BPS.
    /// @param _feeRecipient Address that accrues the fee portion of redemptions.
    function setFee(uint256 _feeBps, address _feeRecipient) external onlyOwner {
        if (_feeBps > MAX_FEE_BPS) revert FeeTooHigh();
        feeBps = _feeBps;
        feeRecipient = _feeRecipient;
        emit FeeUpdated(_feeBps, _feeRecipient);
    }

    /// @notice EIP-712 digest for a voucher. Exposed for off-chain signing.
    /// @param v The voucher to hash.
    /// @return The EIP-712 typed-data digest the buyer signs.
    function voucherDigest(Voucher calldata v) external view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    VOUCHER_TYPEHASH,
                    v.buyer,
                    v.seller,
                    v.amount,
                    v.resourceId,
                    v.nonce,
                    v.deadline
                )
            )
        );
    }
}
