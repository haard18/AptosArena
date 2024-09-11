"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ts_sdk_1 = require("@aptos-labs/ts-sdk");
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.configDotenv)();
const purchaseRouter = express_1.default.Router();
const config = new ts_sdk_1.AptosConfig({ network: ts_sdk_1.Network.TESTNET });
const aptos = new ts_sdk_1.Aptos(config);
purchaseRouter.get("/create-account", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const account = ts_sdk_1.Account.generate({
        scheme: ts_sdk_1.SigningSchemeInput.Ed25519,
        legacy: false,
    });
    console.log('Generated Account:');
    console.log(`Public Key: ${account.publicKey}`);
    console.log(`Private Key: ${account.privateKey}`);
    // res.send(`
    //     <h2>Generated Account</h2>
    //     <p><strong>Public Key:</strong> ${account.publicKey}</p>
    //     <p><strong>Private Key:</strong> ${account.privateKey}</p>
    // `);
    res.send(`${account.publicKey} ${account.privateKey}`);
}));
purchaseRouter.post('/fund-account', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { accountAddress } = req.body;
    if (!accountAddress) {
        return res.status(400).send('<p>Invalid account address</p>');
    }
    const amount = 1000000000;
    const fundedAccount = yield aptos.fundAccount({ accountAddress, amount });
    console.log('Funded Account:');
    res.json(fundedAccount);
}));
purchaseRouter.get("/get-balance/:account", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { account } = req.params;
    try {
        // Fetch account details
        const accountDetails = yield axios_1.default.get(`https://api.testnet.staging.aptoslabs.com/v1/accounts/${account}/resources?limit=999`);
        res.json({ "apt token": accountDetails.data[1].data.coin.value });
    }
    catch (error) {
        res.status(500).send(`<p>Failed to get balance:</p>`);
    }
}));
purchaseRouter.post('/purchase', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { privateKey } = req.body;
    if (!privateKey) {
        return res.status(400).send('<p>Invalid request. Missing account address or private key.</p>');
    }
    const sellerAddress = process.env.TRANSFER_ACCOUNT_PUBLIC;
    if (!sellerAddress) {
        return res.status(500).send('<p>Seller address not configured.</p>');
    }
    try {
        // Create an account object for the buyer using their private key
        const buyerAccount = ts_sdk_1.Account.fromPrivateKey(privateKey);
        // Amount to transfer
        const amount = 0.1;
        // Build the transaction
        const transaction = yield aptos.transaction.build.simple({
            sender: sellerAddress,
            data: {
                function: '0x1::coin::transfer',
                functionArguments: [sellerAddress, amount],
            },
        });
        console.log(transaction);
        // Sign the transaction
        const signedTransaction = yield aptos.transaction.sign({
            signer: buyerAccount,
            transaction,
        });
        console.log(signedTransaction);
        // Submit the transaction
        const pendingTxn = yield aptos.transaction.submit.simple({
            transaction,
            senderAuthenticator: signedTransaction,
        });
        console.log(pendingTxn);
        // Wait for the transaction to be confirmed
        yield aptos.waitForTransaction({ transactionHash: pendingTxn.hash });
        console.log('Transaction confirmed');
        res.send(`<p>Purchase successful. Transaction hash: ${pendingTxn.hash}</p>`);
    }
    catch (error) {
        res.status(500).send(`<p>Failed to process purchase: </p>`);
    }
}));
exports.default = purchaseRouter;
