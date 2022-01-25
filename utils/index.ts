import { BigNumber, Contract, providers, utils, Wallet } from "ethers";
import { AtlantisWorldSeasons } from "../types/ethers-contracts/AtlantisWorldSeasons";

import AtlantisWorldSeasonsABI from "../abis/AtlantisWorldSeasons.json";
import dotenv from "dotenv";
import { NFTMetadata } from "../types";

dotenv.config();

export function useContract(): AtlantisWorldSeasons {
  const rpcUrl = process.env.POLYGON_MUMBAI_URL ?? "";
  const address = process.env.ATLANTIS_WORLD_SEASONS_ADDRESS ?? "";

  console.log("✨ useContract", { rpcUrl, address });

  const provider = new providers.JsonRpcProvider(rpcUrl);
  const wallet = new Wallet(`0x${process.env.PRIVATE_KEY}` ?? "", provider);
  const contract = new Contract(
    address,
    AtlantisWorldSeasonsABI,
    wallet
  ) as AtlantisWorldSeasons;

  return contract;
}

export function base64Encode(metadata: NFTMetadata): string {
  const utf8bytes = utils.toUtf8Bytes(JSON.stringify(metadata));

  return "data:application/json;base64," + utils.base64.encode(utf8bytes);
}
