/**
 * Created by tron on 2019/7/4.
 */
import LedgerBridge from './ledger/LedgerBridge'
import { delay } from './ledger/utils';

(async () => {
    let _isMounted = true;
    const bridge = new LedgerBridge();
// if (typeof window.tronWeb === 'undefined') {
    console.log(tronWeb.defaultAddress);


    tronWeb.trx.sign = this.buildTransactionSigner(tronWeb);

return tronWeb;
    window.addEventListener('message', async e => {
        if (e && e.data && e.data.target === 'LEDGER-IFRAME') {
            if(e.data.data === 'connect ledger'){
                while (_isMounted) {
                    let {connected, address} = await bridge.checkForConnection(true);
                    console.log(connected, address);
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
            }

        }
    }, false)






})()
console.log('MetaMask < = > Ledger Bridge initialized!')
