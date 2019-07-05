/**
 * Created by tron on 2019/7/4.
 */
import LedgerBridge from './ledger/LedgerBridge'


(async () => {
    const bridge = new LedgerBridge();
    window.addEventListener('message', async e => {
        console.log(e);
        if (e && e.data && e.data.target === 'LEDGER-IFRAME') {
            console.log(e.data);
            if(e.data.data === 'connect ledger'){
                let {connected, address} = await bridge.checkForConnection(true);
                console.log(address);
            }
            // const { action, params } = e.data
            // const replyAction = `${action}-reply`
            // switch (action) {
            //     case 'ledger-unlock':
            //         this.unlock(replyAction, params.hdPath)
            //         break
            //     case 'ledger-sign-transaction':
            //         this.signTransaction(replyAction, params.hdPath, params.tx, params.to)
            //         break
            //     case 'ledger-sign-personal-message':
            //         this.signPersonalMessage(replyAction, params.hdPath, params.message)
            //         break
            // }
        }
    }, false)

})()
console.log('MetaMask < = > Ledger Bridge initialized!')
