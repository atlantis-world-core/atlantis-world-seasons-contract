import { expect } from "chai";
import { ethers } from "hardhat";
import { AtlantisWorldSeasons } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, BytesLike } from "ethers";
import {
  uniqueArray,
  useMerkleHelper,
} from "@atlantis-world/seasons-generator/src";
import {
  bigNumberToBlockTimestamp,
  BLOCK_ONE_DAY,
  BLOCK_ONE_HOUR,
  BLOCK_ONE_WEEK,
  getCurrentBlockTimestamp,
} from "../utils/time";
import WHITELIST_LEAVES from "@atlantis-world/seasons-generator/src/data/whitelist.json";

describe("AtlantisWorldSeasons", () => {
  const merkleHelper = useMerkleHelper();
  let contract: AtlantisWorldSeasons;
  let deployer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let claimer: SignerWithAddress;
  let leaves: string[] = WHITELIST_LEAVES.splice(0, 20);
  const nftStorageCID =
    "bafkreichjab35fjicmltr34ksxuni54i6ag2zrkal4nd2gyh4ljsctf3ai";

  async function createSeasonLoot(
    minimumTimestamp?: number,
    maximumTimestamp?: number
  ) {
    const now = await getCurrentBlockTimestamp();
    const _minimumTimestamp = bigNumberToBlockTimestamp(now) + BLOCK_ONE_HOUR;
    const _maximumTimestamp = Math.floor(_minimumTimestamp) + BLOCK_ONE_DAY;

    const start = minimumTimestamp ?? _minimumTimestamp;
    const end = maximumTimestamp ?? _maximumTimestamp;

    return contract.createSeasonLoot(
      nftStorageCID,
      BigNumber.from(start),
      BigNumber.from(end)
    );
  }

  function useMerkleTree() {
    const merkleTree = merkleHelper.createMerkleTree(leaves);
    const merkleRoot = merkleHelper.createMerkleRoot(merkleTree);
    return { merkleTree, merkleRoot };
  }

  beforeEach(async () => {
    const [_deployer, , , , , , , , , , , , , , , _claimer, _treasury] =
      await ethers.getSigners();

    deployer = _deployer;
    claimer = _claimer;
    treasury = _treasury;

    const AtlantisWorldSeasons = await ethers.getContractFactory(
      "AtlantisWorldSeasons",
      deployer
    );
    const atlantisWorldSeasons = await AtlantisWorldSeasons.deploy(
      treasury.address
    );
    contract = await atlantisWorldSeasons.deployed();
  });

  describe("placeholder", () => {
    it("should be true", () => {
      expect(true).to.be.eq(true);
    });
  });

  describe("owner", () => {
    it("should match with the treasury address", async () => {
      expect(await contract.owner()).to.be.eq(treasury.address);
    });

    it("should not match with the deployer address", async () => {
      const ownerAddress = await contract.owner();

      expect(ownerAddress).to.be.not.eq(deployer.address);
      expect(ownerAddress).to.be.eq(treasury.address);
    });
  });

  describe("royaltyInfo", () => {
    it("should return the deployer address for the royalty receiver", async () => {
      // arrange: royaltyInfo parameters
      const salePrice = ethers.utils.parseEther("0.22");
      const tokenId = BigNumber.from(1);

      // act
      const [receiver, royaltyAmount] = await contract.royaltyInfo(
        tokenId,
        salePrice
      );

      const value = salePrice;
      const royaltyPercentage = BigNumber.from(7500);
      const _royaltyAmount =
        (Number(value.toString()) * Number(royaltyPercentage.toString())) /
        Number(BigNumber.from(10000).toString());

      // console.log({
      //   value: value.toString(),
      //   royaltyPercentage: royaltyPercentage.toString(),
      //   royaltyAmount: royaltyAmount.toString(),
      //   _royaltyAmount: _royaltyAmount.toString(),
      // });

      // assert
      expect(receiver).to.be.eq(deployer.address);
      expect(royaltyAmount.toString()).to.be.eq(_royaltyAmount.toString());
    });
  });

  describe("createSeasonLoot", () => {
    it("should create Season", async () => {
      await expect(createSeasonLoot()).to.emit(contract, "SeasonLootCreated")
        .and.to.be.not.reverted;
      expect(await contract.getTotalSeasonLootCount()).to.be.eq(1);
    });

    it("should create 3 Seasons and will have 3 total count", async () => {
      await expect(createSeasonLoot()).to.emit(contract, "SeasonLootCreated")
        .and.to.be.not.reverted;
      await expect(createSeasonLoot()).to.emit(contract, "SeasonLootCreated")
        .and.to.be.not.reverted;
      await expect(createSeasonLoot()).to.emit(contract, "SeasonLootCreated")
        .and.to.be.not.reverted;
      expect(await contract.getTotalSeasonLootCount()).to.be.eq(3);
    });

    it("shold revert when the signer is not an admin", async () => {
      contract = contract.connect(claimer);

      await expect(createSeasonLoot()).to.be.revertedWith(
        "Restricted to AW Core Team members only."
      );
    });
  });

  describe("getSeasonLoot", () => {
    it("should return 1 when first Season is created", async () => {
      await createSeasonLoot();

      const season = await contract.getSeasonLoot(BigNumber.from(1));

      expect(season.id).to.be.eq(BigNumber.from(1));
    });

    it("should return the newly created Season", async () => {
      await createSeasonLoot();
      await createSeasonLoot();

      const firstSeason = await contract.getSeasonLoot(BigNumber.from(1));
      const secondSeason = await contract.getSeasonLoot(BigNumber.from(2));

      expect(firstSeason.id).to.be.eq(BigNumber.from(1));
      expect(secondSeason.id).to.be.eq(BigNumber.from(2));
    });

    it("should return true when accessing exists struct attribute", async () => {
      await createSeasonLoot();

      const season = await contract.getSeasonLoot(BigNumber.from(1));

      expect(season.exists).to.be.eq(true);
    });

    it("should return false when accessing exists struct attribute from non existing Season", async () => {
      const season = await contract.getSeasonLoot(BigNumber.from(1));

      expect(season.exists).to.be.eq(false);
      expect(season.id).to.be.eq(BigNumber.from(0));
    });
  });

  describe("getSeasonLoots", () => {
    it("should return an empty array when no Season is created yet", async () => {
      const result = await contract.getSeasonLoots();

      expect(result).to.be.empty;
      expect(result).to.have.lengthOf(0);
    });

    it("should have length 1 when only a single Season is created", async () => {
      await createSeasonLoot();

      const seasons = await contract.getSeasonLoots();

      expect(seasons).to.have.lengthOf(1);
    });

    it("should have length 3 when there are already 3 Seasons created", async () => {
      await Promise.all([
        createSeasonLoot(),
        createSeasonLoot(),
        createSeasonLoot(),
      ]);

      const seasons = await contract.getSeasonLoots();

      expect(seasons).to.have.lengthOf(3);
    });
  });

  describe("addSeasonLootMerkleRoot", () => {
    it("should add a merkle root for a Season", async () => {
      const { merkleRoot } = useMerkleTree();
      await createSeasonLoot();
      const seasonLootId = BigNumber.from(1);

      await expect(contract.addSeasonLootMerkleRoot(seasonLootId, merkleRoot))
        .to.emit(contract, "SeasonLootMerkleRootAdded")
        .withArgs(deployer.address, seasonLootId).and.to.be.not.reverted;
    });

    it("should revert when adding a merkle root to a Season that already has a merkle root set", async () => {
      const { merkleRoot } = useMerkleTree();
      await createSeasonLoot();
      const seasonLootId = BigNumber.from(1);

      await expect(contract.addSeasonLootMerkleRoot(seasonLootId, merkleRoot))
        .to.be.not.reverted;
      // attempt to set a merkle root once again
      await expect(
        contract.addSeasonLootMerkleRoot(seasonLootId, merkleRoot)
      ).to.be.revertedWith("A merkle root was already set.");
    });
  });

  describe("claim", () => {
    it("should revert when specified seasonLootId does not exist", async () => {
      const proof: BytesLike[] = [];

      await expect(
        contract.claim(proof, BigNumber.from(65))
      ).to.be.revertedWith("The specified seasonLootId does not exist.");
    });

    it("should revert when minting haven't started yet", async () => {
      // arrange: merkle tree
      const merkleTree = merkleHelper.createMerkleTree([
        ...leaves,
        claimer.address,
      ]);
      const merkleRoot = merkleHelper.createMerkleRoot(merkleTree);
      const merkleProof = merkleHelper.createMerkleProof(
        merkleTree,
        claimer.address
      );
      const seasonLootId = BigNumber.from(1);
      // arrange: create SeasonLoot
      await createSeasonLoot();
      await contract.addSeasonLootMerkleRoot(seasonLootId, merkleRoot);
      contract = contract.connect(claimer);

      // act & assert
      await expect(
        contract.claim(merkleProof, seasonLootId)
      ).to.be.revertedWith("The minting hasn't started yet for this loot.");
    });

    it("should revert when minting time have elapsed", async () => {
      // arrange: merkle tree
      const merkleTree = merkleHelper.createMerkleTree([
        ...leaves,
        claimer.address,
      ]);
      const merkleRoot = merkleHelper.createMerkleRoot(merkleTree);
      const merkleProof = merkleHelper.createMerkleProof(
        merkleTree,
        claimer.address
      );
      const seasonLootId = BigNumber.from(1);
      // arrange: create SeasonLoot
      await createSeasonLoot();
      await contract.addSeasonLootMerkleRoot(seasonLootId, merkleRoot);
      contract = contract.connect(claimer);
      // arrange: add one week
      await ethers.provider.send("evm_increaseTime", [BLOCK_ONE_WEEK]);
      await ethers.provider.send("evm_mine", []);

      // act & assert
      await expect(
        contract.claim(merkleProof, seasonLootId)
      ).to.be.revertedWith("The minting has already ended for this loot.");
    });

    it("should be able to claim when whitelisted", async () => {
      const merkleTree = merkleHelper.createMerkleTree([
        ...leaves,
        claimer.address,
      ]);
      const merkleRoot = merkleHelper.createMerkleRoot(merkleTree);
      const merkleProof = merkleHelper.createMerkleProof(
        merkleTree,
        claimer.address
      );
      const seasonLootId = BigNumber.from(1);
      // create Season as deployer/admin
      await createSeasonLoot();
      await contract.addSeasonLootMerkleRoot(seasonLootId, merkleRoot);
      await ethers.provider.send("evm_increaseTime", [BLOCK_ONE_HOUR * 2]);
      await ethers.provider.send("evm_mine", []);
      // connect as claimer
      contract = contract.connect(claimer);

      await expect(contract.claim(merkleProof, seasonLootId)).to.emit(
        contract,
        "SeasonLootClaimed"
      ).and.to.be.not.reverted;
      expect(await contract.ownerOf(1)).to.be.eq(claimer.address);
      expect(await contract.balanceOf(claimer.address)).to.be.eq(
        BigNumber.from(1)
      );
    });

    it("should revert when whitelisted and trying to claim twice", async () => {
      const merkleTree = merkleHelper.createMerkleTree([
        ...leaves,
        claimer.address,
      ]);
      const merkleRoot = merkleHelper.createMerkleRoot(merkleTree);
      const merkleProof = merkleHelper.createMerkleProof(
        merkleTree,
        claimer.address
      );
      const seasonLootId = BigNumber.from(1);
      // create Season as deployer/admin
      await createSeasonLoot();
      await contract.addSeasonLootMerkleRoot(seasonLootId, merkleRoot);
      await ethers.provider.send("evm_increaseTime", [BLOCK_ONE_HOUR * 2]);
      await ethers.provider.send("evm_mine", []);
      // connect as claimer
      contract = contract.connect(claimer);

      await expect(contract.claim(merkleProof, seasonLootId)).to.emit(
        contract,
        "SeasonLootClaimed"
      ).and.to.be.not.reverted;
      expect(await contract.ownerOf(1)).to.be.eq(claimer.address);
      expect(await contract.balanceOf(claimer.address)).to.be.eq(
        BigNumber.from(1)
      );
      await expect(
        contract.claim(merkleProof, seasonLootId)
      ).to.be.revertedWith("You have already claimed!");
      expect(await contract.balanceOf(claimer.address)).to.be.eq(
        BigNumber.from(1)
      );
    });

    it("should be able to claim when whitelisted but with bad merkle proof", async () => {
      const merkleTree = merkleHelper.createMerkleTree([
        ...leaves,
        claimer.address,
      ]);
      const merkleRoot = merkleHelper.createMerkleRoot(merkleTree);
      const merkleProof: BytesLike[] = [];
      const seasonLootId = BigNumber.from(1);
      // create Season as deployer/admin
      await createSeasonLoot();
      await contract.addSeasonLootMerkleRoot(seasonLootId, merkleRoot);
      // connect as claimer
      contract = contract.connect(claimer);

      await expect(
        contract.claim(merkleProof, seasonLootId)
      ).to.be.revertedWith("Not whitelisted for this loot.");
      expect(await contract.balanceOf(claimer.address)).to.be.eq(
        BigNumber.from(0)
      );
    });

    it("should revert when not whitelisted", async () => {
      const merkleTree = merkleHelper.createMerkleTree(leaves);
      const merkleRoot = merkleHelper.createMerkleRoot(merkleTree);
      const merkleProof = merkleHelper.createMerkleProof(
        merkleTree,
        claimer.address
      );
      const seasonLootId = BigNumber.from(1);
      // create Season as deployer/admin
      await createSeasonLoot();
      await contract.addSeasonLootMerkleRoot(seasonLootId, merkleRoot);
      // connect as claimer
      contract = contract.connect(claimer);

      await expect(
        contract.claim(merkleProof, seasonLootId)
      ).to.be.revertedWith("Not whitelisted for this loot.");
      expect(await contract.balanceOf(claimer.address)).to.be.eq(
        BigNumber.from(0)
      );
    });
  });

  describe("airdrop", () => {
    it("should be able to airdrop successfully", async () => {
      await createSeasonLoot();
      const seasonLootId = BigNumber.from(1);
      const recipients = uniqueArray(leaves);

      await expect(contract.airdrop(recipients, seasonLootId)).to.be.not
        .reverted;
      expect(await contract.getTotalMintCount()).to.be.eq(recipients.length);
    });

    it("should revert when one of the recipients already received the NFT", async () => {
      await createSeasonLoot();
      const seasonLootId = BigNumber.from(1);
      const recipients = uniqueArray([...leaves, claimer.address]);
      const alreadyReceived = claimer.address;

      await contract.airdrop([alreadyReceived], seasonLootId);

      await expect(
        contract.airdrop(recipients, seasonLootId)
      ).to.be.revertedWith("One of the recipients have already received it.");
    });

    it("should able to succesfully airdrop to recipients and everyone holds at least 1", async () => {
      await createSeasonLoot();
      const seasonLootId = BigNumber.from(1);
      const recipients = uniqueArray(leaves);

      await expect(contract.airdrop(recipients, seasonLootId)).to.be.not
        .reverted;

      expect(
        (
          await Promise.all(
            recipients.map((recipient) => contract.balanceOf(recipient))
          )
        ).every((balance) => balance.toNumber() === 1)
      ).to.be.eq(true);
      expect(await contract.getTotalMintCount()).to.be.eq(recipients.length);
    });

    it("should revert when at least one of the recipients is AddressZero", async () => {
      await createSeasonLoot();
      const seasonLootId = BigNumber.from(1);

      await expect(
        contract.airdrop(
          [...leaves, ethers.constants.AddressZero],
          seasonLootId
        )
      ).to.be.revertedWith("One of the recipients is an empty address.");
    });
  });

  describe("renounceAdmin", () => {
    it("should revert when caller is not admin", async () => {
      // connect as claimer and not admin
      contract = contract.connect(claimer);

      await expect(contract.renounceAdmin()).to.be.revertedWith(
        "Restricted to AW Core Team members only."
      );
    });

    it("should renounce when caller is admin", async () => {
      await expect(
        contract.renounceAdmin()
      ).to.be.not.reverted.and.to.be.not.revertedWith(
        "Restricted to AW Core Team members only."
      );
    });
  });

  describe("addAdmin", () => {
    it("should be able to add admin when caller is admin", async () => {
      const defaultAdminRole = await contract.DEFAULT_ADMIN_ROLE();

      await expect(contract.addAdmin(claimer.address)).to.be.not.reverted;
      expect(
        await contract.hasRole(defaultAdminRole, claimer.address)
      ).to.be.eq(true);
      expect(await contract.getRoleMemberCount(defaultAdminRole)).to.be.eq(
        BigNumber.from(2)
      );
    });

    it("should revert when caller is not admin", async () => {
      const defaultAdminRole = await contract.DEFAULT_ADMIN_ROLE();
      contract = contract.connect(claimer);

      await expect(contract.addAdmin(claimer.address)).to.be.revertedWith(
        "Restricted to AW Core Team members only."
      );
      expect(
        await contract.hasRole(defaultAdminRole, claimer.address)
      ).to.be.eq(false);
      expect(await contract.getRoleMemberCount(defaultAdminRole)).to.be.eq(
        BigNumber.from(1)
      );
    });
  });

  describe("voteToRevokeAdmin", () => {
    it("should remove an admin when there's only 2 of them", async () => {
      await contract.addAdmin(claimer.address);
      const defaultAdminRole = await contract.DEFAULT_ADMIN_ROLE();

      expect(await contract.getRoleMemberCount(defaultAdminRole)).to.be.eq(
        BigNumber.from(2)
      );
      await expect(contract.voteToRevokeAdmin(claimer.address))
        .to.emit(contract, "AdminRevoked")
        .withArgs(claimer.address, BigNumber.from(1)).and.to.be.not.reverted;
      expect(await contract.getRoleMemberCount(defaultAdminRole)).to.be.eq(
        BigNumber.from(1)
      );
    });

    it("should only cast a tally when there's 3 admins and only 1 cast a tally vote", async () => {
      await Promise.all([
        contract.addAdmin(claimer.address),
        contract.addAdmin(leaves[4]),
      ]);
      const defaultAdminRole = await contract.DEFAULT_ADMIN_ROLE();

      expect(await contract.getRoleMemberCount(defaultAdminRole)).to.be.eq(
        BigNumber.from(3)
      );
      await expect(contract.voteToRevokeAdmin(claimer.address))
        .to.emit(contract, "VoteToRevokeAdminCasted")
        .withArgs(claimer.address, BigNumber.from(1)).and.to.be.not.reverted;
      expect(
        await contract.hasRole(defaultAdminRole, claimer.address)
      ).to.be.eq(true);
      expect(await contract.getRoleMemberCount(defaultAdminRole)).to.be.eq(
        BigNumber.from(3)
      );
    });

    it("should revert when the caller is admin and already casted a vote tally to an address", async () => {
      await Promise.all([
        contract.addAdmin(claimer.address),
        contract.addAdmin(leaves[4]),
      ]);
      const defaultAdminRole = await contract.DEFAULT_ADMIN_ROLE();

      expect(await contract.getRoleMemberCount(defaultAdminRole)).to.be.eq(
        BigNumber.from(3)
      );
      await expect(contract.voteToRevokeAdmin(claimer.address)).to.be.not
        .reverted;
      await expect(
        contract.voteToRevokeAdmin(claimer.address)
      ).to.be.revertedWith("You have already voted.");
      expect(await contract.getRoleMemberCount(defaultAdminRole)).to.be.eq(
        BigNumber.from(3)
      );
    });

    it("should revert when the address to remove admin privileges is AddressZero", async () => {
      await Promise.all([
        contract.addAdmin(claimer.address),
        contract.addAdmin(leaves[4]),
      ]);
      const defaultAdminRole = await contract.DEFAULT_ADMIN_ROLE();

      expect(await contract.getRoleMemberCount(defaultAdminRole)).to.be.eq(
        BigNumber.from(3)
      );
      await expect(
        contract.voteToRevokeAdmin(ethers.constants.AddressZero)
      ).to.be.revertedWith("The given address is empty.");
      expect(await contract.getRoleMemberCount(defaultAdminRole)).to.be.eq(
        BigNumber.from(3)
      );
    });

    it("should revert when the target admin to remove is the caller itself", async () => {
      const defaultAdminRole = await contract.DEFAULT_ADMIN_ROLE();

      expect(await contract.getRoleMemberCount(defaultAdminRole)).to.be.eq(
        BigNumber.from(1)
      );
      await expect(
        contract.voteToRevokeAdmin(deployer.address)
      ).to.be.revertedWith("You cannot create a removal tally for yourself.");
      expect(await contract.getRoleMemberCount(defaultAdminRole)).to.be.eq(
        BigNumber.from(1)
      );
    });

    it("should revert when the target admin to remove is not an admin", async () => {
      const defaultAdminRole = await contract.DEFAULT_ADMIN_ROLE();

      expect(await contract.getRoleMemberCount(defaultAdminRole)).to.be.eq(
        BigNumber.from(1)
      );
      await expect(
        contract.voteToRevokeAdmin(claimer.address)
      ).to.be.revertedWith("The target address is not an AW Core Team member.");
      expect(await contract.getRoleMemberCount(defaultAdminRole)).to.be.eq(
        BigNumber.from(1)
      );
    });

    it("should remove an admin when there's 8 existing admins", async () => {
      const [
        deployer,
        adminOne,
        adminTwo,
        adminThree,
        adminFour,
        adminFive,
        adminSix,
        adminToRemove,
      ] = await ethers.getSigners();
      await Promise.all([
        contract.addAdmin(adminOne.address),
        contract.addAdmin(adminTwo.address),
        contract.addAdmin(adminThree.address),
        contract.addAdmin(adminFour.address),
        contract.addAdmin(adminFive.address),
        contract.addAdmin(adminSix.address),
        contract.addAdmin(adminToRemove.address),
      ]);
      const defaultAdminRole = await contract.DEFAULT_ADMIN_ROLE();
      expect(await contract.getRoleMemberCount(defaultAdminRole)).to.be.eq(
        BigNumber.from(8)
      );

      const checkAdminToRemoveRole = async () =>
        await contract.hasRole(defaultAdminRole, adminToRemove.address);

      // deployer cast vote removal
      contract = contract.connect(deployer);
      await expect(contract.voteToRevokeAdmin(adminToRemove.address))
        .to.emit(contract, "VoteToRevokeAdminCasted")
        .withArgs(adminToRemove.address, BigNumber.from(1)).and.to.be.not
        .reverted;
      expect(await checkAdminToRemoveRole()).to.be.eq(true);
      expect(await contract.getRoleMemberCount(defaultAdminRole)).to.be.eq(
        BigNumber.from(8)
      );

      // adminOne cast vote removal
      contract = contract.connect(adminOne);
      await expect(contract.voteToRevokeAdmin(adminToRemove.address))
        .to.emit(contract, "VoteToRevokeAdminCasted")
        .withArgs(adminToRemove.address, BigNumber.from(2)).and.to.be.not
        .reverted;
      expect(await checkAdminToRemoveRole()).to.be.eq(true);
      expect(await contract.getRoleMemberCount(defaultAdminRole)).to.be.eq(
        BigNumber.from(8)
      );

      // adminTwo cast vote removal
      contract = contract.connect(adminTwo);
      await expect(contract.voteToRevokeAdmin(adminToRemove.address))
        .to.emit(contract, "VoteToRevokeAdminCasted")
        .withArgs(adminToRemove.address, BigNumber.from(3)).and.to.be.not
        .reverted;
      expect(await checkAdminToRemoveRole()).to.be.eq(true);
      expect(await contract.getRoleMemberCount(defaultAdminRole)).to.be.eq(
        BigNumber.from(8)
      );

      // adminThree cast vote removal
      contract = contract.connect(adminThree);
      await expect(contract.voteToRevokeAdmin(adminToRemove.address))
        .to.emit(contract, "VoteToRevokeAdminCasted")
        .withArgs(adminToRemove.address, BigNumber.from(4)).and.to.be.not
        .reverted;
      expect(await checkAdminToRemoveRole()).to.be.eq(true);
      expect(await contract.getRoleMemberCount(defaultAdminRole)).to.be.eq(
        BigNumber.from(8)
      );

      // adminFour cast vote removal
      contract = contract.connect(adminFour);
      await expect(contract.voteToRevokeAdmin(adminToRemove.address))
        .to.emit(contract, "VoteToRevokeAdminCasted")
        .withArgs(adminToRemove.address, BigNumber.from(5)).and.to.be.not
        .reverted;
      expect(await checkAdminToRemoveRole()).to.be.eq(true);
      expect(await contract.getRoleMemberCount(defaultAdminRole)).to.be.eq(
        BigNumber.from(8)
      );

      // adminFive cast vote removal
      contract = contract.connect(adminFive);
      await expect(contract.voteToRevokeAdmin(adminToRemove.address))
        .to.emit(contract, "VoteToRevokeAdminCasted")
        .withArgs(adminToRemove.address, BigNumber.from(6)).and.to.be.not
        .reverted;
      expect(await checkAdminToRemoveRole()).to.be.eq(true);
      expect(await contract.getRoleMemberCount(defaultAdminRole)).to.be.eq(
        BigNumber.from(8)
      );

      // adminSix cast vote removal, expects to finally remove an admin
      contract = contract.connect(adminSix);
      await expect(contract.voteToRevokeAdmin(adminToRemove.address))
        .to.emit(contract, "AdminRevoked")
        .withArgs(adminToRemove.address, BigNumber.from(7)).and.to.be.not
        .reverted;
      expect(await checkAdminToRemoveRole()).to.be.eq(false);
      expect(await contract.getRoleMemberCount(defaultAdminRole)).to.be.eq(
        BigNumber.from(7)
      );
    });
  });
});
