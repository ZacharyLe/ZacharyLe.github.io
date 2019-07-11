/**
 * Created by tron on 2019/7/4.
 */
/**
 * Created by tron on 2019/7/4.
 */
import AppTrx from "./Tron";
import Transport from "@ledgerhq/hw-transport-u2f";
import {transactionJsonToProtoBuf} from "@tronscan/client/src/utils/tronWeb";
import {byteArray2hexStr} from "@tronscan/client/src/utils/bytes";
const ledgerTokenList = require('./tokens');

//const baseUrl = 'https://metamask.github.io/eth-ledger-bridge-keyring';
export default class LedgerBridge {
    constructor() {
        this.transport = null;
        this.path = "44'/195'/0'/0/0";
    }

    sendMessageToExtension (msg) {
        window.parent.postMessage({target:'LEDGER-IFRAME',success:true,...msg}, '*');
    }

    cleanUp () {
        this.transport.close();
    }

    getPath(index = 0) {
        return "44'/195'/"+index+"'/0/0";
    }

    async checkForConnection(confirm = false) {
        return new Promise(async (resolve, reject) => {
                this.transport = await Transport.create();
                try {
                    const trx = new AppTrx(this.transport);
                    let {address} = await trx.getAddress(this.path, confirm);
                    resolve({
                        address,
                        connected: true
                    });
                } catch(e) {
                    console.log(e);
                    resolve({
                        address: false,
                        connected: false,
                        error: e.message
                    });
                } finally {
                    this.transport.close();
                }
        });
    }

    async unlock (replyAction, hdPath) {
        try {
            await this.makeApp()
            const res = await this.app.getAddress(hdPath, false, true)

            this.sendMessageToExtension({
                action: replyAction,
                success: true,
                payload: res,
            })

        } catch (err) {
            const e = this.ledgerErrToMessage(err)

            this.sendMessageToExtension({
                action: replyAction,
                success: false,
                payload: { error: e.toString() },
            })

        } finally {
            this.cleanUp()
        }
    }

    async getAddresses() {
        this.transport = await Transport.create();
        const trx = new AppTrx(this.transport);
        const addresses = [];
        const arr = Array.from({length:20},(v,i)=>i);
        for(const index of arr){
            const { address } = await trx.getAddress(this.getPath(index));
            addresses.push(address);
        }
        return addresses;
    }

    async getAddress(path = this.path) {
        return new Promise(async (resolve, reject) => {
            this.transport = await Transport.create();
            try {
                const trx = new AppTrx(this.transport);
                let {address} = await trx.getAddress(path);
                resolve(address);
            } catch(e) {
                reject(e);
            } finally {
                this.transport.close();
            }
        });
    }

    async signTransaction(transaction) {
        return new Promise(async (resolve, reject) => {
            this.transport = await Transport.create();
            try {
                const trx = new AppTrx(this.transport);
                let response = await trx.signTransactionWithTokenName(
                    this.path,
                    transaction.hex,
                    transaction.info);
                resolve(response);
            } catch(e) {
                reject(e);
            } finally {
                this.transport.close();
            }
        });
    }

    async getTokenExtraInfo(ID){
        let tokenID = ID;
        if (typeof tokenID != "number") {
            tokenID = tronWeb.toUtf8(tokenID);
            if (tokenID==="_")
                return {id: 0, decimals: 6, token_name: "TRX"};
            else
                tokenID = parseInt(tokenID);
        }
        const { id, precision, name } = await tronWeb.trx.getTokenByID(tokenID);
        return {id, decimals: precision, token_name: name};
    }

    getLedgerTokenInfo(ID){
        let tokenID = ID;
        if (typeof tokenID != "number") {
            if (tokenID==="_")
                tokenID = 0;
            else
                tokenID = parseInt(tokenID);
        }
        return ledgerTokenList.tokenList.find(o => o.id === tokenID );
    }


    buildTransactionSigner(tronWeb) {
        return async (transaction) => {
            try {

                    const transactionObj = transactionJsonToProtoBuf(transaction);

                    const rawDataHex = byteArray2hexStr(transactionObj.getRawData().serializeBinary());

                    let raw = transactionObj.getRawData();

                    const contractObj = raw.getContractList()[0];

                    let contractType = contractObj.getType();

                    let tokenInfo = [];

                    let extra = {};

                    console.log('contractType',contractType);
                    switch (contractType){
                        case 2: // Transfer Assets
                            const ID = tronWeb.toUtf8(transaction.raw_data.contract[0].parameter.value.asset_name);
                            // get token info
                            extra = await this.getTokenExtraInfo(transaction.raw_data.contract[0].parameter.value.asset_name);
                            tokenInfo.push(this.getLedgerTokenInfo(ID).message);
                            break;



                        case 31: //Trigger Smart Contract
                            extra = transaction.extra;
                            break;
                    }

                    extra.hash = transaction.txID;


                    //const ledgerBridge = new LedgerBridge();
                    const signedResponse = await this.signTransaction({
                        hex: rawDataHex,
                        info: tokenInfo,
                    });

                    transaction.signature = [Buffer.from(signedResponse).toString('hex')];
                    return transaction;
                } catch (error){
                    console.log(error.message);
                    throw error.message;
                }
        };
    }
}