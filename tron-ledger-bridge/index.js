/**
 * Created by tron on 2019/7/4.
 */
import LedgerBridge from './ledger/LedgerBridge'
import { delay } from './ledger/utils';
let bridge = new LedgerBridge();
(async () => {
    let _isMounted = true;
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
                const { result } = await tronWeb.trx.sendTransaction(toAddress, amount, {address: fromAddress}, false).catch(e=>({result:false}));
                bridge.sendMessageToExtension({
                    success:result
                });
            }else if(e.data.action === 'send trc10'){
                const { id, toAddress, fromAddress, amount } = e.data.data;
                const result = await tronWeb.trx.sendToken(toAddress, amount, id,{address: fromAddress}, false).catch(e=>({result:false}));
                bridge.sendMessageToExtension({
                    success:result
                });
            }else if(e.data.action === 'send trc20'){

            }
        }
    }, false);
})()
const checkTronWeb = setInterval(async ()=>{
    const tronWeb = window.tronWeb;
    if(tronWeb && tronWeb.defaultAddress && tronWeb.defaultAddress.base58){
        clearInterval(checkTronWeb);
        tronWeb.trx.sign = bridge.buildTransactionSigner(tronWeb);
        window.tronWeb = tronWeb;
    }
},1000);
console.log('Tronlink < = > Ledger Bridge initialized!');

