import { Address, beginCell, Cell, CellMessage, contractAddress, InternalMessage } from "ton-core";
import { SendMode } from "../client/SendMode";
import { Contract } from "../contracts/Contract";
import { ContractProvider } from "../contracts/ContractProvider";
import { Maybe } from "../utils/maybe";
import { createWalletTransferV3 } from "./signing/createWalletTransfer";

export class WalletContractV3R2 implements Contract {

    static create(args: { workchain: number, publicKey: Buffer, walletId?: Maybe<number> }) {
        return new WalletContractV3R2(args.workchain, args.publicKey, args.walletId);
    }

    readonly workchain: number;
    readonly publicKey: Buffer;
    readonly address: Address;
    readonly walletId: number;
    readonly init: { data: Cell, code: Cell };

    private constructor(workchain: number, publicKey: Buffer, walletId?: Maybe<number>) {

        // Resolve parameters
        this.workchain = workchain;
        this.publicKey = publicKey;
        if (walletId !== null && walletId !== undefined) {
            this.walletId = walletId;
        } else {
            this.walletId = 698983191 + workchain;
        }

        // Build initial code and data
        let code = Cell.fromBoc(Buffer.from('B5EE9C724101010100710000DEFF0020DD2082014C97BA218201339CBAB19F71B0ED44D0D31FD31F31D70BFFE304E0A4F2608308D71820D31FD31FD31FF82313BBF263ED44D0D31FD31FD3FFD15132BAF2A15144BAF2A204F901541055F910F2A3F8009320D74A96D307D402FB00E8D101A4C8CB1FCB1FCBFFC9ED5410BD6DAD', 'hex'))[0];
        let data = beginCell()
            .storeUint(0, 32) // Seqno
            .storeUint(this.walletId, 32)
            .storeBuffer(publicKey)
            .endCell();
        this.init = { code, data };
        this.address = contractAddress(workchain, { code, data });
    }

    async getSeqno(executor: ContractProvider) {
        let state = await executor.getState();
        if (state.state === 'active') {
            let res = await executor.callGetMethod('seqno', []);
            return res.stack.readNumber();
        } else {
            return 0;
        }
    }

    async send(executor: ContractProvider, message: Cell) {
        await executor.send(new CellMessage(message));
    }

    createTransfer(args: { seqno: number, sendMode: SendMode, secretKey: Buffer, order: InternalMessage, timeout?: Maybe<number> }) {
        return createWalletTransferV3({
            seqno: args.seqno,
            sendMode: args.sendMode,
            secretKey: args.secretKey,
            order: args.order,
            timeout: args.timeout,
            walletId: this.walletId
        });
    }
}