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
        this.addEventListeners();
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
}