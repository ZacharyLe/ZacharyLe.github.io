/**
 * Created by tron on 2019/7/4.
 */
import LedgerBridge from './ledger/LedgerBridge'
import { delay } from './ledger/utils';

(async () => {
    let _isMounted = true;
    const bridge = new LedgerBridge();
    //tronWeb.trx.sign = this.buildTransactionSigner(tronWeb);
    //return tronWeb;
    window.addEventListener('message', async e => {
        if (e && e.data && e.data.target === 'LEDGER-IFRAME') {
            let result, success;
            if(e.data.action === 'connect ledger'){
                while (_isMounted) {
                    let {connected, address} = await bridge.checkForConnection(true);
                    if (connected) {
                        _isMounted = false;
                        bridge.sendMessageToExtension({
                            connected,
                            address
                        });
                        break;
                    }
                    delay(1000);
                }
            }else if(e.data.action === 'send trx'){
                const { toAddress, fromAddress, amount } = e.data.data;
                console.log(e.data.data);
                result = await tronWeb.trx.sendTransaction(toAddress, amount, {address: fromAddress}, false).catch(function (e) {
                    console.log(e);
                });

                console.log(result);
            }else if(e.data.action === 'send trc10'){

            }else if(e.data.action === 'send trc20'){

            }
            // if (result) {
            //     success = result.result;
            // } else {
            //     success = false;
            // }
        }
    }, false)
})()
let _isTronWeb = false;
while (!_isTronWeb) {
    if(window.tronWeb && window.defaultAddress){
        _isTronWeb = true;
        tronWeb.trx.sign = bridge.buildTransactionSigner(tronWeb);
        console.log(tronWeb.defaultAddress);
        break;
    }
    delay(1000);
}
console.log('Tronlink < = > Ledger Bridge initialized!');

