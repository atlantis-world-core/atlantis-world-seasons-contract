import { useContract } from "../../utils";
import readline from "readline";

const contract = useContract();

/**
 * @example
 * yarn sc:create-season <URI> -v
 */
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const [tokenURI, verbose] = process.argv.slice(2);

  console.log(`✨ Creating a Season with tokenURI "${tokenURI}"...\n\n\n`);

  if (!tokenURI) {
    console.error(
      "🐞 The tokenURI must not be empty, please supply a value for it. (Example: QmWXSLfLn9iyYdZtm7RCfc5NRZk1QQWTh4ae9m6BmTYcTy)\n\n\n"
    );
    process.exit(1);
  }

  rl.question(
    `Are you sure you want to create a Season with tokenURI "${tokenURI}"? (y/n): `,
    async (answer) => {
      if (answer.toLowerCase() === "y") {
        await createSeasonLoot(tokenURI);

        return process.exit(0);
      }

      return process.exit(0);
    }
  );
}

export async function createSeasonLoot(tokenURI: string) {
  await contract.createSeasonLoot(tokenURI);

  const seasonCount = await contract.getTotalSeasonLootCount();

  console.log(
    "\n\n\n✅ A new Season has been created, current Season count:",
    seasonCount.toNumber()
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
