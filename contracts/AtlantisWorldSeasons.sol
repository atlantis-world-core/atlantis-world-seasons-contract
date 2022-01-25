// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./royalties/ERC2981ContractWideRoyalties.sol";

/**
 *    _____    __      __    _________
 *   /  _  \  /  \    /  \  /   _____/  ____  _____     ______  ____    ____    ______
 *  /  /_\  \ \   \/\/   /  \_____  \ _/ __ \ \__  \   /  ___/ /  _ \  /    \  /  ___/
 * /    |    \ \        /   /        \\  ___/  / __ \_ \___ \ (  <_> )|   |  \ \___ \
 * \____|__  /  \__/\  /   /_______  / \___  >(____  //____  > \____/ |___|  //____  >
 *         \/        \/            \/      \/      \/      \/              \/      \/
 *
 * @title Atlantis World Seasons - An NFT Season Loot manager for all community members & supporters on various Seasons
 *
 * @author Carlo Miguel Dy
 * @custom:auditor Rachit Srivastava
 *
 * @notice An NFT Season Loot manager for all community members & supporters on various Seasons
 *
 * @dev
 * - It uses the {MerkleProof} utility for a much more gas efficient way to whitelist users
 * - It uses an access control abstract contract {AccessControlEnumerable} to only allow
 *   AW Core Team members of Atlantis World to mutate state
 * - It is capable of adding multiple {SeasonLoot} struct to allow various airdrop events long term
 * - It is capable of airdropping NFTs of a specified {SeasonLoot} to a list of recipients and only
 *   AW Core Team members are allowed to make an airdrop by calling `airdrop` method
 * - It will emit an event when an AW Core Team member have airdropped to a list of recipients
 * - It will emit an event when a whitelisted address have claimed their gift
 * - It will emit an event when a merkle root is added to a specific {SeasonLoot}, and can only be set
 *   for once and can never change a merkle root
 * - It will emit an event when a new {SeasonLoot} has been created by a AW Core Team member
 * - It has a revoke admin vote tallying functionality to prevent a rogue core team member from
 *   compromising the smart contract, it will emit an event when a vote is casted to remove an
 *   admin, and it will also emit an emit when the vote tallies are complete then the admin is
 *   revoked from admin privileges. See {AtlantisWorldSeasons-voteToRevokeAdmin}.
 * - It can return a list of all seasons that are created by AW Core Team members.
 * - It can also check if a specified claimer address is eligible for claiming an NFT by calling
 *   `isWhitelisted` method and can also check if the specified claimer address have already claimed
 */
contract AtlantisWorldSeasons is
    ERC721Enumerable,
    ERC721URIStorage,
    ReentrancyGuard,
    AccessControlEnumerable,
    ERC2981ContractWideRoyalties
{
    using Counters for Counters.Counter;

    /**
     * @dev The Atlantis World treasury address.
     */
    address private _treasuryAddress;

    /**
     * @dev The total count of all {SeasonLoot} stored in `_seasonLootIdToSeasonLoot` mapping.
     */
    Counters.Counter private _seasonLootIds;

    /**
     * @dev The total count of NFTs minted.
     */
    Counters.Counter private _tokenIds;

    /**
     * @dev Stores all of the created {SeasonLoot}.
     */
    mapping(uint256 => SeasonLoot) private _seasonLootIdToSeasonLoot;

    /**
     * @dev Stores all merkle root for a corresponding {SeasonLoot}.
     */
    mapping(uint256 => bytes32) private _seasonLootIdToMerkleRoot;

    /**
     * @dev Indicates if a {SeasonLoot} already has a merkle root set.
     */
    mapping(uint256 => bool) private _seasonLootIdToMerkleRootStatus;

    /**
     * @dev Keeps track of the `seasonLootId` of a `tokenId`.
     */
    mapping(uint256 => uint256) private _tokenIdToSeasonLootId;

    /**
     * @dev Adds a tallying functionality on admin removal, should make
     * everyone vote to the same address to revoke of admin privileges.
     *
     * The key will be the target admin to remove and its corresponding value
     * is the amount of votes from the other addresses with admin privileges.
     *
     * The corresponding value of the mapping should match `getRoleMemberCount(DEFAULT_ADMIN_ROLE)`
     * to finally remove an address from admin privileges.
     */
    mapping(address => uint256) private _removableAdminToTally;

    /**
     * @dev The key is the admin that have voted for removing an admin.
     */
    mapping(address => mapping(address => bool)) private _adminToRemovableAdmin;

    /**
     * @dev Store if a specific address have claimed for a {SeasonLoot}.
     */
    mapping(address => mapping(uint256 => bool))
        private _claimantToSeasonLootIdToClaimStatus;

    /**
     * @dev The data structure for how seasons are stored to `_seasonLootIdToSeasonLoot` mapping.
     */
    struct SeasonLoot {
        /**
         * @dev Will match the to `_seasonLootIds` the counter upon creation.
         */
        uint256 id;
        /**
         * @dev The minimum or start timestamp for minting this loot.
         */
        uint256 minimumTimestamp;
        /**
         * @dev The maximum or end timestamp for minting this loot.
         */
        uint256 maximumTimestamp;
        /**
         * @dev The IPFS uploaded metadata URI reference.
         */
        string tokenURI;
        /**
         * @dev This attribute will always be set to `true` a way
         * to check if a {SeasonLoot} exists in mapping `_seasonLootIdToSeasonLoot`
         */
        bool exists;
    }

    constructor(address treasuryAddress)
        ERC721("Atlantis World Seasons", "AWS")
    {
        require(
            address(0) != treasuryAddress,
            "The treasury address should not be empty."
        );

        _treasuryAddress = treasuryAddress;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setRoyalties(msg.sender, 7500);
    }

    /**
     * @dev When an NFT is claimed by a whitelisted address for a specific {SeasonLoot}.
     */
    event SeasonLootClaimed(
        address indexed claimant,
        uint256 indexed seasonLootId,
        uint256 indexed tokenId
    );

    /**
     * @dev When an NFT is airdropped by an AW Core Team member for a specific {SeasonLoot}.
     */
    event SeasonLootAirdropped(
        address indexed recipient,
        uint256 indexed seasonLootId,
        uint256 indexed tokenId
    );

    /**
     * @dev When a new {SeasonLoot} has been created.
     */
    event SeasonLootCreated(
        address indexed author,
        uint256 indexed seasonLootId
    );

    /**
     * @dev When a new merkle root for a {SeasonLoot} is added.
     */
    event SeasonLootMerkleRootAdded(
        address indexed author,
        uint256 indexed seasonLootId
    );

    /**
     * @dev When a vote was casted to removing an admin.
     */
    event VoteToRevokeAdminCasted(
        address indexed target,
        uint256 indexed currentVotes
    );

    /**
     * @dev When an admin has finally revoked of their admin privileges.
     */
    event AdminRevoked(address indexed target, uint256 indexed totalVotes);

    /// @dev Restricted to AW Core Team members only.
    modifier onlyAdmin() {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Restricted to AW Core Team members only."
        );
        _;
    }

    /**
     * @notice Checks if the provided `seasonLootId` parameter has an existing {SeasonLoot} stored in `_seasonLootIdToSeasonLoot` mapping
     * @param seasonLootId The identifier of a {SeasonLoot} stored from `_seasonLootIdToSeasonLoot` mapping
     */
    modifier existingSeason(uint256 seasonLootId) {
        require(
            _seasonLootIdToSeasonLoot[seasonLootId].exists,
            "The specified seasonLootId does not exist."
        );
        _;
    }

    /**
     * @dev The AW Seasons treasury address, to point where royalties should be sent.
     * @notice
     * This address is not the "owner" of this contract, but only explitcitly defined
     * to be compliant to the EIP2981 Royalty Standard that Opensea implements. The admins
     * or the AW Core Team members has the privileges to update the contract's state and
     * not this `_treasuryAddress`
     */
    function owner() public view virtual returns (address) {
        return _treasuryAddress;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 _interfaceId)
        public
        view
        override(ERC721, AccessControlEnumerable, ERC721Enumerable, ERC2981Base)
        returns (bool)
    {
        return
            _interfaceId == type(IERC721).interfaceId ||
            super.supportsInterface(_interfaceId);
    }

    /**
     * @param tokenId The NFT token identifier.
     * @return The corresponding `seasonLootId`
     */
    function tokenIdToSeasonLootId(uint256 tokenId)
        external
        view
        returns (uint256)
    {
        return _tokenIdToSeasonLootId[tokenId];
    }

    /**
     * @notice Get all the stored {SeasonLoot} from `_seasonLootIdToSeasonLoot` mapping
     *
     * @dev
     * When traversing items from `_seasonLootIdToSeasonLoot` mapping, must add
     * plus 1 to its index to correctly get the value from the mapping since
     * the `_seasonLootIds` counter starts at 1 and not 0.
     */
    function getSeasonLoots() external view returns (SeasonLoot[] memory) {
        uint256 totalSeasonCount = _seasonLootIds.current();

        SeasonLoot[] memory seasonLoots = new SeasonLoot[](totalSeasonCount);

        for (uint256 index = 0; index < totalSeasonCount; index++) {
            seasonLoots[index] = _seasonLootIdToSeasonLoot[index + 1];
        }

        return seasonLoots;
    }

    /**
     * @param seasonLootId The identifier of a {SeasonLoot} from `_seasonLootIdToSeasonLoot` mapping
     * @return The {SeasonLoot} that corresponds to given `seasonLootId`
     */
    function getSeasonLoot(uint256 seasonLootId)
        external
        view
        returns (SeasonLoot memory)
    {
        return _seasonLootIdToSeasonLoot[seasonLootId];
    }

    /**
     * @return The total count for all the seasons created.
     */
    function getTotalSeasonLootCount() external view returns (uint256) {
        return _seasonLootIds.current();
    }

    /**
     * @dev The total count for all of NFTs minted.
     */
    function getTotalMintCount() external view returns (uint256) {
        return _tokenIds.current();
    }

    /// @inheritdoc	ERC721
    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @param claimant The whitelisted address
     * @param seasonLootId The identifier of a {SeasonLoot} from `_seasonLootIdToSeasonLoot` mapping
     * @return When the address have minted for a {SeasonLoot} then it returns `true`
     */
    function claimed(address claimant, uint256 seasonLootId)
        public
        view
        returns (bool)
    {
        return _claimantToSeasonLootIdToClaimStatus[claimant][seasonLootId];
    }

    /**
     * @notice Checks if the given address is whitelisted
     * @param claimer The whitelisted address
     * @param seasonLootId The identifier of a {SeasonLoot} from `_seasonLootIdToSeasonLoot` mapping
     * @param proof The proof generated based on the address
     */
    function isWhitelisted(
        address claimer,
        uint256 seasonLootId,
        bytes32[] calldata proof
    ) public view returns (bool) {
        return
            MerkleProof.verify(
                proof,
                _seasonLootIdToMerkleRoot[seasonLootId],
                _generateLeaf(claimer)
            );
    }

    /**
     * @notice Claim the NFT gift
     * @param proof The proof generated based on the address
     * @param seasonLootId The identifier of a {SeasonLoot} stored from `_seasonLootIdToSeasonLoot` mapping
     */
    function claim(bytes32[] calldata proof, uint256 seasonLootId)
        external
        existingSeason(seasonLootId)
        nonReentrant
    {
        // The {SeasonLoot} object by a given `seasonLootId`
        // from `_seasonLootIdToSeasonLoot` mapping
        SeasonLoot memory seasonLoot = _seasonLootIdToSeasonLoot[seasonLootId];

        require(
            isWhitelisted(msg.sender, seasonLootId, proof),
            "Not whitelisted for this loot."
        );
        require(
            !claimed(msg.sender, seasonLootId),
            "You have already claimed!"
        );
        require(
            // Check if minting has not started
            seasonLoot.minimumTimestamp <= block.timestamp,
            "The minting hasn't started yet for this loot."
        );
        require(
            // Check if minting has ended
            block.timestamp <= seasonLoot.maximumTimestamp,
            "The minting has already ended for this loot."
        );

        uint256 currentTokenId = _mintSeasonLoot(msg.sender, seasonLoot);

        emit SeasonLootClaimed(msg.sender, seasonLootId, currentTokenId);
    }

    /**
     * @notice
     * Make an airdrop of a specific {SeasonLoot} NFT to specificed `recipients`, and
     * the given `recipients` does not have to be whitelisted in order to receive
     * the airdrop.
     *
     * @dev Only AW Core Team members can make an airdrop to specified `recipients`
     * @param recipients A list of all addresses to airdrop the NFT
     * @param seasonLootId The identifier of a {SeasonLoot} stored from `_seasonLootIdToSeasonLoot` mapping
     */
    function airdrop(address[] calldata recipients, uint256 seasonLootId)
        external
        onlyAdmin
        existingSeason(seasonLootId)
    {
        /// @dev Validate if all recipients are not `address(0x0)`
        for (uint256 index = 0; index < recipients.length; index++) {
            require(
                recipients[index] != address(0),
                "One of the recipients is an empty address."
            );
        }

        for (uint256 index = 0; index < recipients.length; index++) {
            /// @dev The recipient to send NFT airdrop to
            address recipient = recipients[index];

            /// @dev Revert if any of the recipients already received the airdrop
            require(
                !_claimantToSeasonLootIdToClaimStatus[recipient][seasonLootId],
                "One of the recipients have already received it."
            );

            // The {SeasonLoot} object by a given `seasonLootId`
            // from `_seasonLootIdToSeasonLoot` mapping
            SeasonLoot memory seasonLoot = _seasonLootIdToSeasonLoot[
                seasonLootId
            ];

            uint256 currentTokenId = _mintSeasonLoot(recipient, seasonLoot);

            emit SeasonLootAirdropped(recipient, seasonLootId, currentTokenId);
        }
    }

    /**
     * @notice Add an account to admin role, restricted admins only.
     * @dev Restricted to admins only.
     */
    function addAdmin(address account) external virtual onlyAdmin {
        grantRole(DEFAULT_ADMIN_ROLE, account);
    }

    /**
     * @dev
     * Remove an account from admin privileges, restricted admins only.
     * It also requires to tally where it should create a consensus to
     * removing an address from having admin privileges to this contract.
     *
     * The intent for the tally is to prevent a rogue admin to compromising
     * this smart contract, when given the admin privileges one should never
     * be able to disrupt the airdrop manager for AW community members & supporters.
     *
     * When the value for `_removableAdminToTally` mapping matches `getRoleMemberCount(DEFAULT_ADMIN_ROLE)`
     * then it will proceed to revoking the admin role from the specified `removableAdmin` account.
     *
     * @param removableAdmin The target admin to be removed from its privileges.
     */
    function voteToRevokeAdmin(address removableAdmin)
        external
        virtual
        onlyAdmin
    {
        require(removableAdmin != address(0), "The given address is empty.");
        require(
            msg.sender != removableAdmin,
            "You cannot create a removal tally for yourself."
        );
        require(
            hasRole(DEFAULT_ADMIN_ROLE, removableAdmin),
            "The target address is not an AW Core Team member."
        );
        require(
            !_adminToRemovableAdmin[msg.sender][removableAdmin],
            "You have already voted."
        );

        _removableAdminToTally[removableAdmin]++;
        _adminToRemovableAdmin[msg.sender][removableAdmin] = true;

        if (
            _removableAdminToTally[removableAdmin] ==
            getRoleMemberCount(DEFAULT_ADMIN_ROLE) - uint256(1)
        ) {
            revokeRole(DEFAULT_ADMIN_ROLE, removableAdmin);

            emit AdminRevoked(
                removableAdmin,
                _removableAdminToTally[removableAdmin]
            );

            return;
        }

        emit VoteToRevokeAdminCasted(
            removableAdmin,
            _removableAdminToTally[removableAdmin]
        );
    }

    /**
     * @notice Remove an account from admin role, restricted admins only.
     * @dev Restricted to admins only.
     */
    function renounceAdmin() external virtual onlyAdmin {
        renounceRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Stores a new {SeasonLoot} into `_seasonLootIdToSeasonLoot` mapping
     * @param _tokenURI The base64 ecnoded JSON metadata for a {SeasonLoot}
     * @param minimumTimestamp The minimum or start timestamp for minting this loot
     * @param maximumTimestamp The maximum or end timestamp for minting this loot
     * @return The current `seasonLootId` for the recently created {SeasonLoot}
     */
    function createSeasonLoot(
        string calldata _tokenURI,
        uint256 minimumTimestamp,
        uint256 maximumTimestamp
    ) external onlyAdmin returns (uint256) {
        require(
            minimumTimestamp >= block.timestamp,
            "The minimum timestamp is invalid."
        );
        require(
            maximumTimestamp > minimumTimestamp &&
                maximumTimestamp >= block.timestamp,
            "The maximum timestamp is invalid."
        );

        // Increment `_seasonLootIds` after a new {SeasonLoot} is stored
        // to the `_seasonLootIdToSeasonLoot` mapping
        _seasonLootIds.increment();

        uint256 currentseasonLootId = _seasonLootIds.current();
        _seasonLootIdToMerkleRootStatus[currentseasonLootId] = false;

        _seasonLootIdToSeasonLoot[currentseasonLootId] = SeasonLoot({
            id: currentseasonLootId,
            minimumTimestamp: minimumTimestamp,
            maximumTimestamp: maximumTimestamp,
            tokenURI: _tokenURI,
            exists: true
        });

        emit SeasonLootCreated(msg.sender, currentseasonLootId);

        return currentseasonLootId;
    }

    /**
     * @notice Adds a new merkle root for a {SeasonLoot} whitelist.
     * @param seasonLootId The identifier of a {SeasonLoot} stored from `_seasonLootIdToSeasonLoot` mapping
     * @param merkleRoot The generated merkle root from the whitelisted addresses for the {SeasonLoot}
     */
    function addSeasonLootMerkleRoot(uint256 seasonLootId, bytes32 merkleRoot)
        external
        onlyAdmin
        existingSeason(seasonLootId)
    {
        require(
            !_seasonLootIdToMerkleRootStatus[seasonLootId],
            "A merkle root was already set."
        );

        _seasonLootIdToMerkleRootStatus[seasonLootId] = true;
        _seasonLootIdToMerkleRoot[seasonLootId] = merkleRoot;

        emit SeasonLootMerkleRootAdded(msg.sender, seasonLootId);
    }

    /**
     * @dev Apply the same logic for both `claim` and `airdrop` on minting NFT.
     * @param recipient The receiver of the token
     * @param seasonLoot The {SeasonLoot} struct
     */
    function _mintSeasonLoot(address recipient, SeasonLoot memory seasonLoot)
        private
        returns (uint256 currentTokenId)
    {
        // Increment the token mint counter for a {SeasonLoot}
        _tokenIds.increment();

        // The current mint token count for a {SeasonLoot}
        currentTokenId = _tokenIds.current();

        // Set the mint status to true, indicates as claimed for a {SeasonLoot}
        _claimantToSeasonLootIdToClaimStatus[recipient][seasonLoot.id] = true;

        // To keep track of the `seasonLootId` of this token
        _tokenIdToSeasonLootId[currentTokenId] = seasonLoot.id;

        _safeMint(recipient, currentTokenId);
        _setTokenURI(currentTokenId, seasonLoot.tokenURI);
    }

    /**
     * @param sender The address whose leaf hash needs to be generated
     * @return The hash value of the address
     */
    function _generateLeaf(address sender) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(sender));
    }

    /// @inheritdoc	ERC721
    function _baseURI() internal view virtual override returns (string memory) {
        return "ipfs://";
    }

    /// @inheritdoc	ERC721
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    /// @inheritdoc	ERC721
    function _burn(uint256 tokenId)
        internal
        virtual
        override(ERC721, ERC721URIStorage)
    {
        require(false, "Burning is not allowed");
    }
}
