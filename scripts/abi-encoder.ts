import { ethers } from "ethers";

function main() {
  const abiEncoder = new ethers.utils.AbiCoder();

  const abi = abiEncoder.encode(
    ["bytes32"],
    ["0xf3fc773cf67514f76a6d3e214bdb15624082614d575f7b3b60af4bb518c7d8b8"]
  );

  console.log(abi);
}

main();
