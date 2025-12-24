// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
}

contract PrivateVoting {
    IERC20 public token;
    address public owner;
    uint256 public startTime;
    uint256 public endTime;
    bool public finalized;

    bytes[] public encryptedVotes;
    address[] public voters;
    mapping(address => bool) public voted;

    uint256 public forVotes;
    uint256 public againstVotes;

    event VoteSubmitted(address indexed voter, bytes ciphertext);
    event TallyFinalized(uint256 forVotes, uint256 againstVotes);

    constructor(address _token, uint256 _startTime, uint256 _endTime) {
        require(_startTime < _endTime, "invalid time window");
        token = IERC20(_token);
        owner = msg.sender;
        startTime = _startTime;
        endTime = _endTime;
        finalized = false;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    function submitVote(bytes calldata ciphertext) external {
        require(block.timestamp >= startTime && block.timestamp <= endTime, "voting closed");
        require(!voted[msg.sender], "already voted");
        // Basic validation: ciphertext must be non-empty
        require(ciphertext.length > 0, "invalid ciphertext");

        // Eligibility check: must hold >0 tokens at submission time (if token set)
        if (address(token) != address(0)) {
            require(token.balanceOf(msg.sender) > 0, "not eligible");
        }

        encryptedVotes.push(ciphertext);
        voters.push(msg.sender);
        voted[msg.sender] = true;

        emit VoteSubmitted(msg.sender, ciphertext);
    }

    function getEncryptedCount() external view returns (uint256) {
        return encryptedVotes.length;
    }

    function getEncryptedVotes() external view returns (bytes[] memory) {
        return encryptedVotes;
    }

    // Owner (or an authorized backend holding private key) calls this after decrypting off-chain
    function finalizeTally(uint256 _forVotes, uint256 _againstVotes) external onlyOwner {
        require(block.timestamp > endTime, "voting not ended");
        require(!finalized, "already finalized");
        forVotes = _forVotes;
        againstVotes = _againstVotes;
        finalized = true;
        emit TallyFinalized(_forVotes, _againstVotes);
    }
}
