## `ERC2981ContractWideRoyalties`

This is a contract used to add ERC2981 support to ERC721 and 1155
This implementation has the same royalties for each and every tokens

### `_setRoyalties(address recipient, uint256 value)` (internal)

Sets token royalties

### `royaltyInfo(uint256, uint256 value) → address receiver, uint256 royaltyAmount` (external)

@inheritdoc IERC2981Royalties
