import {
  bigNumberToBlockTimestamp,
  getCurrentBlockTimestamp,
} from "../utils/time";

describe("block.timestamp", () => {
  it("should be true", async () => {
    const currentBlockTimestamp = await getCurrentBlockTimestamp();

    console.log(1642003200);
  });
});
