import { useMerkleHelper } from "@atlantis-world/seasons-generator/src";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

import readline from "readline";
import leaves from "@atlantis-world/seasons-collector-scripts/seasons/aw-seasons-christmas-loot.json";

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const [deployer] = await ethers.getSigners();
  const treasuryAddress = "0x3E8c686F499C877D8f4aFB1215b6f0935796b986"; // TODO: To use AW Treasury
  const tokenURI =
    "bafkreif4c6lxrsdx3yxvymixe27f7ap3mmibfhinnczdj34rswssiysd7e";

  rl.question(
    `Deploying contract "AtlantisWorldSeasons" as deployer "${deployer.address}" and treasury address "${treasuryAddress}", continue? (y/n) `,
    async (answer) => {
      if (answer.toLowerCase() === "y") {
        const contract = await deploy(treasuryAddress, deployer);

        // Create Winter Season Loot
        const seasonLootTx = await contract.createSeasonLoot(
          tokenURI,
          BigNumber.from(1642039200),
          BigNumber.from(1642816800)
        );
        await seasonLootTx.wait();
        const seasonCount = await contract.getTotalSeasonLootCount();
        console.log(
          "\n\n\n✅ A new Season has been created, current Season count:",
          seasonCount.toNumber()
        );

        // Add merkle root
        const merkleHelper = useMerkleHelper();
        const tree = merkleHelper.createMerkleTree(leaves);
        const root = merkleHelper.createMerkleRoot(tree);
        const addSeasonMerkleRootTx = await contract.addSeasonLootMerkleRoot(
          BigNumber.from(1),
          root,
          {
            gasLimit: 1_000_000,
          }
        );
        await addSeasonMerkleRootTx.wait();
        console.log(
          "\n\n\n✅ A merkle root has been added to the first Season Loot"
        );

        console.info("✨ Deployment has been successful", [
          contract.address,
          treasuryAddress,
        ]);

        return process.exit(0);
      }

      return process.exit(0);
    }
  );
}

async function deploy(treasuryAddress: string, deployer: SignerWithAddress) {
  const AtlantisWorldSeasons = await ethers.getContractFactory(
    "AtlantisWorldSeasons"
  );

  const contract = await AtlantisWorldSeasons.deploy(treasuryAddress);

  await contract.deployed();

  console.log(
    `✨ AtlantisWorldSeasons deployed to "${contract.address}" with treasuryAddress "${treasuryAddress}", by deployer "${deployer.address}"`
  );

  return contract;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
