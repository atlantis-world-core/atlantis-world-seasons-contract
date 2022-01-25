## `AtlantisWorldSeasons`

---

/ \_ \ / \ / \ / **\_**/ \_**\_ \_\_\_** **\_\_** \_**\_ \_\_** **\_\_**
/ /_\ \ \ \/\/ / \_\_\_\_\_ \ _/ ** \ \__ \ / _**/ / \_ \ / \ / **_/
/ | \ \ / / \\ _**/ / ** \_ \_** \ ( <\_> )| | \ \_** \
\_\_**|** / \_\_/\ / /**\_**** / \_** >(\_\_** //\_**\_ > \_\_**/ |**\_| //\_\_** >
\/ \/ \/ \/ \/ \/ \/ \/

An NFT Season Loot manager for all community members & supporters on various Seasons

@dev

- It uses the {MerkleProof} utility for a much more gas efficient way to whitelist users
- It uses an access control abstract contract {AccessControlEnumerable} to only allow
  AW Core Team members of Atlantis World to mutate state
- It is capable of adding multiple {SeasonLoot} struct to allow various airdrop events long term
- It is capable of airdropping NFTs of a specified {SeasonLoot} to a list of recipients and only
  AW Core Team members are allowed to make an airdrop by calling `airdrop` method
- It will emit an event when an AW Core Team member have airdropped to a list of recipients
- It will emit an event when a whitelisted address have claimed their gift
- It will emit an event when a merkle root is added to a specific {SeasonLoot}, and can only be set
  for once and can never change a merkle root
- It will emit an event when a new {SeasonLoot} has been created by a AW Core Team member
- It has a revoke admin vote tallying functionality to prevent a rogue core team member from
  compromising the smart contract, it will emit an event when a vote is casted to remove an
  admin, and it will also emit an emit when the vote tallies are complete then the admin is
  revoked from admin privileges. See {AtlantisWorldSeasons-voteToRevokeAdmin}.
- It can return a list of all seasons that are created by AW Core Team members.
- It can also check if a specified claimer address is eligible for claiming an NFT by calling
  `isWhitelisted` method and can also check if the specified claimer address have already claimed

### `onlyAdmin()`

Restricted to AW Core Team members only.

### `existingSeason(uint256 seasonLootId)`

Checks if the provided `seasonLootId` parameter has an existing {SeasonLoot} stored in `_seasonLootIdToSeasonLoot` mapping

### `constructor(address treasuryAddress)` (public)

### `owner() → address` (public)

The AW Seasons treasury address, to point where royalties should be sent.
@notice
This address is not the "owner" of this contract, but only explitcitly defined
to be compliant to the EIP2981 Royalty Standard that Opensea implements. The admins
or the AW Core Team members has the privileges to update the contract's state and
not this `_treasuryAddress`

### `supportsInterface(bytes4 _interfaceId) → bool` (public)

See {IERC165-supportsInterface}.

### `tokenIdToSeasonLootId(uint256 tokenId) → uint256` (external)

### `getSeasonLoots() → struct AtlantisWorldSeasons.SeasonLoot[]` (external)

Get all the stored {SeasonLoot} from `_seasonLootIdToSeasonLoot` mapping

@dev
When traversing items from `_seasonLootIdToSeasonLoot` mapping, must add
plus 1 to its index to correctly get the value from the mapping since
the `_seasonLootIds` counter starts at 1 and not 0.

### `getSeasonLoot(uint256 seasonLootId) → struct AtlantisWorldSeasons.SeasonLoot` (external)

### `getTotalSeasonLootCount() → uint256` (external)

### `getTotalMintCount() → uint256` (external)

The total count for all of NFTs minted.

### `tokenURI(uint256 tokenId) → string` (public)

@inheritdoc ERC721

### `claimed(address claimant, uint256 seasonLootId) → bool` (public)

### `isWhitelisted(address claimer, uint256 seasonLootId, bytes32[] proof) → bool` (public)

Checks if the given address is whitelisted

### `claim(bytes32[] proof, uint256 seasonLootId)` (external)

Claim the NFT gift

### `airdrop(address[] recipients, uint256 seasonLootId)` (external)

@notice
Make an airdrop of a specific {SeasonLoot} NFT to specificed `recipients`, and
the given `recipients` does not have to be whitelisted in order to receive
the airdrop.

Only AW Core Team members can make an airdrop to specified `recipients`

### `addAdmin(address account)` (external)

Add an account to admin role, restricted admins only.

Restricted to admins only.

### `voteToRevokeAdmin(address removableAdmin)` (external)

@dev
Remove an account from admin privileges, restricted admins only.
It also requires to tally where it should create a consensus to
removing an address from having admin privileges to this contract.

The intent for the tally is to prevent a rogue admin to compromising
this smart contract, when given the admin privileges one should never
be able to disrupt the airdrop manager for AW community members & supporters.

When the value for `_removableAdminToTally` mapping matches `getRoleMemberCount(DEFAULT_ADMIN_ROLE)`
then it will proceed to revoking the admin role from the specified `removableAdmin` account.

### `renounceAdmin()` (external)

Remove an account from admin role, restricted admins only.

Restricted to admins only.

### `createSeasonLoot(string _tokenURI, uint256 minimumTimestamp, uint256 maximumTimestamp) → uint256` (external)

Stores a new {SeasonLoot} into `_seasonLootIdToSeasonLoot` mapping

### `addSeasonLootMerkleRoot(uint256 seasonLootId, bytes32 merkleRoot)` (external)

Adds a new merkle root for a {SeasonLoot} whitelist.

### `_baseURI() → string` (internal)

@inheritdoc ERC721

### `_beforeTokenTransfer(address from, address to, uint256 tokenId)` (internal)

@inheritdoc ERC721

### `_burn(uint256 tokenId)` (internal)

@inheritdoc ERC721

### `SeasonLootClaimed(address claimant, uint256 seasonLootId, uint256 tokenId)`

When an NFT is claimed by a whitelisted address for a specific {SeasonLoot}.

### `SeasonLootAirdropped(address recipient, uint256 seasonLootId, uint256 tokenId)`

When an NFT is airdropped by an AW Core Team member for a specific {SeasonLoot}.

### `SeasonLootCreated(address author, uint256 seasonLootId)`

When a new {SeasonLoot} has been created.

### `SeasonLootMerkleRootAdded(address author, uint256 seasonLootId)`

When a new merkle root for a {SeasonLoot} is added.

### `VoteToRevokeAdminCasted(address target, uint256 currentVotes)`

When a vote was casted to removing an admin.

### `AdminRevoked(address target, uint256 totalVotes)`

When an admin has finally revoked of their admin privileges.

### `SeasonLoot`

uint256 id

uint256 minimumTimestamp

uint256 maximumTimestamp

string tokenURI

bool exists
