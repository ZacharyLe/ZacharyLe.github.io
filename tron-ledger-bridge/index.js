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
                const result = await tronWeb.trx.sendTransaction(toAddress, amount, {address: fromAddress}, (error)=>{
                    console.log(error);
                }).catch(error=>({result:false,error}));
                console.log(result);
                bridge.sendMessageToExtension({success:result,error});
            }else if(e.data.action === 'send trc10'){
                const { id, toAddress, fromAddress, amount } = e.data.data;
                const { result, error = '' } = await tronWeb.trx.sendToken(toAddress, amount, id,{address: fromAddress}, false).catch(e=>({result:false}));
                bridge.sendMessageToExtension({success:result,error});
            }else if(e.data.action === 'send trc20'){
                const { id, toAddress, fromAddress, amount, decimals, TokenName} = e.data.data;
                let unSignTransaction = await tronWeb.transactionBuilder.triggerSmartContract(
                    tronWeb.address.toHex(id),
                    'transfer(address,uint256)',
                    10000000, 0,
                    [
                        { type: 'address', value: tronWeb.address.toHex(toAddress)},
                        { type: 'uint256', value: amount}
                    ],
                    tronWeb.address.toHex(fromAddress)
                );
                if (unSignTransaction.transaction !== undefined) {
                    unSignTransaction = unSignTransaction.transaction;
                    unSignTransaction.extra = {
                        to: toAddress,
                        decimals: decimals,
                        token_name: TokenName,
                        amount: amount
                    };
                    const signedTransaction = await tronWeb.trx.sign(unSignTransaction, false).catch(e => false);
                    if (signedTransaction) {
                        const broadcast = await tronWeb.trx.sendRawTransaction(signedTransaction);
                        if (broadcast.result) {
                            bridge.sendMessageToExtension({
                                success:true
                            });
                        }else{
                            bridge.sendMessageToExtension({
                                success:false
                            });
                        }
                    }
                }
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

