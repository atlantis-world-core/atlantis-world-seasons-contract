import { useMerkleHelper } from "@atlantis-world/seasons-generator/src/index";
import { BigNumber } from "ethers";
import { useContract } from "../../utils";

import leaves from "@atlantis-world/seasons-collector-scripts/seasons/aw-seasons-christmas-loot.json";
import readline from "readline";

const contract = useContract();

async function main() {
  console.log("✨ Adding a merkle root for a Season...\n\n\n");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const [seasonId] = process.argv.slice(2);

  if (!seasonId) {
    console.error(
      `🐞 No "seasonId" parameter was supplied, please provide an ID.`
    );
    console.log("Example: yarn sc:add-merkle 1\n\n\n");
    process.exit(1);
  }

  const season = await contract.getSeasonLoot(seasonId);

  if (!season.exists) {
    console.error(
      `🐞 The provided "seasonId" does not exist on the smart contract with address "${contract.address}"\n\n\n`
    );
    process.exit(1);
  }

  console.log("🔎 Season\n", season);
  rl.question("Are you sure you want to proceed? (y/n): ", async (answer) => {
    if (answer.toLowerCase() === "y") {
      await addMerkleRoot(seasonId);

      return process.exit(0);
    }

    return process.exit(0);
  });
}

export async function addMerkleRoot(seasonId: number | string) {
  const merkleHelper = useMerkleHelper();
  const tree = merkleHelper.createMerkleTree(leaves);
  const root = merkleHelper.createMerkleRoot(tree);

  const addSeasonMerkleRootTx = await contract.addSeasonLootMerkleRoot(
    BigNumber.from(seasonId),
    root,
    {
      gasLimit: 1_000_000,
    }
  );
  const addSeasonMerkleRootRx = await addSeasonMerkleRootTx.wait();

  console.log("addSeasonMerkleRootTx", JSON.stringify(addSeasonMerkleRootTx));
  console.log("\naddSeasonMerkleRootRx", JSON.stringify(addSeasonMerkleRootRx));
  console.log("\n\n\n✅ A merkle root for a Season has been added");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
