import { getAssociatedTokenAddress } from "@solana/spl-token";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { addressSlicer } from "@toruslabs/base-controllers";
import assert from "assert";
import nock from "nock";

import * as solanaHelper from "@/utils/solanaHelpers";

import { mockGetConnection } from "./mockConnection";
import { mockClubbedNFTs, mockNFTs, sKeyPair } from "./mockData";
import nockRequest from "./nockRequest";

describe("solana helper util", () => {
  beforeEach(async () => {
    nockRequest();
  });
  afterEach(() => {
    nock.cleanAll();
  });
  const transferInstruction = () => {
    return SystemProgram.transfer({
      fromPubkey: sKeyPair[0].publicKey,
      toPubkey: sKeyPair[1].publicKey,
      lamports: 0.1 * LAMPORTS_PER_SOL,
    });
  };
  it("parsingTransferAmount", async () => {
    const tx = new Transaction({ recentBlockhash: sKeyPair[0].publicKey.toBase58(), feePayer: sKeyPair[0].publicKey });
    tx.add(transferInstruction());
    const result = await solanaHelper.parsingTransferAmount(tx, 1, false);

    const slicedSenderAddress = addressSlicer(sKeyPair[0].publicKey.toBase58());
    const slicedReceiverAddress = addressSlicer(sKeyPair[1].publicKey.toBase58());
    const assertResult = {
      isGasless: false,
      slicedReceiverAddress,
      slicedSenderAddress,
      totalFiatAmount: "",
      totalFiatCost: "",
      totalFiatFee: "",
      totalSolAmount: 0.1,
      totalSolCost: "0.100000001",
      totalSolFee: 1e-9,
      transactionType: "",
    };
    assert.deepEqual(result, assertResult);
  });
  it("calculateTxFee", async () => {
    const tx = new Transaction({ recentBlockhash: sKeyPair[0].publicKey.toBase58(), feePayer: sKeyPair[0].publicKey });
    tx.add(transferInstruction());
    const result = await solanaHelper.calculateTxFee(tx.compileMessage(), mockGetConnection());
    assert.deepEqual(result.fee, 1);
  });
  // it("getEstimateBalanceChange", async () => {
  //   const tx = new Transaction({ recentBlockhash: sKeyPair[0].publicKey.toBase58(), feePayer: sKeyPair[0].publicKey });
  //   tx.add(transferInstruction());
  //   const result = await solanaHelper.getEstimateBalanceChange(mockGetConnection(), tx, sKeyPair[0].publicKey.toBase58());
  //   assert.deepEqual(result, [
  //     {
  //       address: "7dpVde1yJCzpz2bKNiXWh7sBJk7PFvv576HnyFCrgNyW",
  //       changes: 0,
  //       decimals: 9,
  //       mint: "",
  //       symbol: "SOL",
  //     },
  //   ]);
  // });
  // it("calculateChanges", async () => {
  //   const tx = new Transaction({ recentBlockhash: sKeyPair[0].publicKey.toBase58(), feePayer: sKeyPair[0].publicKey });
  //   tx.add(transferInstruction());
  //   const result = await solanaHelper.calculateChanges(mockGetConnection(), mockSimulateTransaction, "7dpVde1yJCzpz2bKNiXWh7sBJk7PFvv576HnyFCrgNyW", [
  //     "7dpVde1yJCzpz2bKNiXWh7sBJk7PFvv576HnyFCrgNyW",
  //     "6bS8uykyBg1dC5E4fatWaJC177KTcyW5GsGtUvNq3RPz",
  //   ]);
  //   assert.deepEqual(result, [
  //     {
  //       address: "7dpVde1yJCzpz2bKNiXWh7sBJk7PFvv576HnyFCrgNyW",
  //       changes: 0,
  //       decimals: 9,
  //       mint: "",
  //       symbol: "SOL",
  //     },
  //   ]);
  // });
  it("getClubbedNfts", async () => {
    const result = await solanaHelper.getClubbedNfts(mockNFTs);
    assert.deepEqual(result, mockClubbedNFTs);
  });
  it("ruleVerifierId", () => {
    const solResult = solanaHelper.ruleVerifierId("sol", sKeyPair[0].publicKey.toBase58());
    assert.deepEqual(solResult, true);
    const googleResult = solanaHelper.ruleVerifierId("google", "test@gmail.com");
    assert.deepEqual(googleResult, true);
    const redditResult = solanaHelper.ruleVerifierId("reddit", "test123");
    assert.deepEqual(redditResult, true);
    const twitterResult = solanaHelper.ruleVerifierId("twitter", "testweb3");
    assert.deepEqual(twitterResult, true);
    const githubResult = solanaHelper.ruleVerifierId("github", "testweb3");
    assert.deepEqual(githubResult, true);
  });
  it("generateSPLTransaction", async () => {
    const result = await solanaHelper.generateSPLTransaction(
      sKeyPair[1].publicKey.toBase58(),
      1,
      mockNFTs[0],
      sKeyPair[0].publicKey.toBase58(),
      mockGetConnection()
    );
    assert.deepEqual(result.feePayer, sKeyPair[0].publicKey);
    const associatedTokenAccount = await getAssociatedTokenAddress(new PublicKey(mockNFTs[0].mintAddress), sKeyPair[1].publicKey, false);

    const associatedTokenResult = await solanaHelper.generateSPLTransaction(
      associatedTokenAccount.toBase58(),
      1,
      mockNFTs[0],
      sKeyPair[0].publicKey.toBase58(),
      mockGetConnection()
    );
    assert.deepEqual(result.instructions[0].keys[2].pubkey.toBase58(), sKeyPair[1].publicKey.toBase58());

    assert.deepEqual(associatedTokenResult.instructions[0].keys[2].pubkey.toBase58(), associatedTokenAccount.toBase58());
    // changes in instruction between associated token account and normal sol account
    assert.notDeepEqual(JSON.stringify(associatedTokenResult), JSON.stringify(result));
  });
  it("decodeAllInstruction", async () => {
    const tx = new Transaction({ recentBlockhash: sKeyPair[0].publicKey.toBase58(), feePayer: sKeyPair[0].publicKey }); // Transaction.serialize
    const txs = [1, 2].map(() => tx.add(transferInstruction()));
    const msgs = txs.map((item) => item.serialize({ requireAllSignatures: false }).toString("hex"));

    // const message = [
    //   "01000102956e41697918a4b3b7800d9292e50a9050443f53bef96296b5dced3f8dec93410000000000000000000000000000000000000000000000000000000000000000da56c1e43b1f54b5029b286ab6b692b80bf13e98e6a4cadf12b8769d7098138001010200000c020000002c4a970200000000",
    //   "01000102956e41697918a4b3b7800d9292e50a9050443f53bef96296b5dced3f8dec93410000000000000000000000000000000000000000000000000000000000000000da56c1e43b1f54b5029b286ab6b692b80bf13e98e6a4cadf12b8769d7098138001010200000c0200000057cf140500000000",
    // ];
    const result = await solanaHelper.decodeAllInstruction(msgs, false);
    // console.log(result);
    // console.log({ result: JSON.stringify(result) });
    assert.deepEqual(result.length, 4);
  });
});
