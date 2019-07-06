/**
 * Created by tron on 2019/7/4.
 */
/**
 * Created by tron on 2019/7/4.
 */
import AppTrx from "./Tron";
import Transport from "@ledgerhq/hw-transport-u2f";

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
        this.transport.close()
    }

    async checkForConnection(confirm = false) {
        return new Promise(async (resolve, reject) => {
                const transport = await Transport.create();
                try {
                    const trx = new AppTrx(transport);
                    let {address} = await trx.getAddress(this.path, confirm);
                    resolve({
                        address,
                        connected: true,
                    });
                } catch(e) {
                    resolve({
                        address: false,
                        connected: false,
                    });
                } finally {
                    transport.close();
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

    async getAddress() {
        return new Promise(async (resolve, reject) => {
            const transport = await Transport.create();
            try {
                const trx = new AppTrx(transport);
                let {address} = await trx.getAddress(this.path);
                resolve(address);
            } catch(e) {
                reject(e);
            } finally {
                transport.close();
            }
        });
    }

    async signTransaction(transaction) {
        return new Promise(async (resolve, reject) => {
            const transport = await Transport.create();
            try {
                const trx = new AppTrx(transport);
                let response = await trx.signTransactionWithTokenName(
                    this.path,
                    transaction.hex,
                    transaction.info);
                resolve(response);
            } catch(e) {
                reject(e);
            } finally {
                transport.close();
            }
        });
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
                    switch (contractType){
                        case 2: // Transfer Assets
                            const ID = tronWeb.toUtf8(
                                transaction.raw_data.contract[0].parameter.value.asset_name
                            );
                            // get token info
                            extra = await this.getTokenExtraInfo(transaction.raw_data.contract[0].parameter.value.asset_name);
                            tokenInfo.push(this.getLedgerTokenInfo(ID).message);
                            break;
                        case 41: //ExchangeCreateContract
                            const token1 =  await this.getTokenExtraInfo(
                            transaction.raw_data.contract[0].parameter.value.first_token_id
                        );
                            const token2 =  await this.getTokenExtraInfo(
                            transaction.raw_data.contract[0].parameter.value.second_token_id
                        );
                            if (token1!== undefined && token2!== undefined){
                                extra = {
                                    token1: token1.token_name,
                                    decimals1: token1.decimals,
                                    token2: token2.token_name,
                                    decimals2: token2.decimals,
                                }
                                if (token1.id!=0)tokenInfo.push(this.getLedgerTokenInfo(token1.id).message);
                                if (token2.id!=0)tokenInfo.push(this.getLedgerTokenInfo(token2.id).message);
                            }
                            break;
                        case 42: //ExchangeInjectContract
                            const exchangeDepositID = transaction.raw_data.contract[0].parameter.value.exchange_id;
                            const exchangeDeposit = this.getLedgerExchangeInfo(exchangeDepositID);
                            const exchangeDepositToken = this.getLedgerTokenInfo(tronWeb.toUtf8(
                                transaction.raw_data.contract[0].parameter.value.token_id)
                            );
                            // get exchange info
                            extra = {
                                pair: exchangeDeposit.pair,
                                token: exchangeDepositToken.token_name,
                                decimals: exchangeDepositToken.decimals,
                            };
                            if (exchangeDepositToken.id!=0) tokenInfo.push(exchangeDepositToken.message);
                            break;
                        case 43: //ExchangeWithdrawContract
                            const exchangeWithdrawID = transaction.raw_data.contract[0].parameter.value.exchange_id;
                            const exchangeWithdraw = this.getLedgerExchangeInfo(exchangeWithdrawID);
                            const exchangeWithdrawToken = this.getLedgerTokenInfo(tronWeb.toUtf8(
                                transaction.raw_data.contract[0].parameter.value.token_id)
                            );
                            // get exchange info
                            extra = {
                                pair: exchangeWithdraw.pair,
                                token: exchangeWithdrawToken.token_name,
                                decimals: exchangeWithdrawToken.decimals,
                            };
                            if (exchangeWithdrawToken.id!=0) tokenInfo.push(exchangeWithdrawToken.message);
                            break;
                        case 44: //ExchangeTransactionContract
                            const exchangeID = transaction.raw_data.contract[0].parameter.value.exchange_id;
                            const exchange = this.getLedgerExchangeInfo(exchangeID);
                            // get exchange info
                            extra = {
                                pair: exchange.pair, decimals1: exchange.decimals1, decimals2: exchange.decimals2,
                                action: ((transaction.raw_data.contract[0].parameter.value.token_id===exchange.firstToken)?"Sell":"Buy"),
                            };
                            tokenInfo.push(exchange.message);
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
                    console.log(error);
                }
        };
    }
}