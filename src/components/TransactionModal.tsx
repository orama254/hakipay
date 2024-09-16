
type Transaction = {
    id: string;
    amount: number;
    date: string;
    description: string;
    status: string;
    type: string;
};

interface TransactionModalProps {
    onClose: () => void;
    transaction: Transaction;
}


const TransactionModal = ({ isOpen, onClose, transaction }: TransactionModalProps) => {

    return (
        <div>Modal Open</div>
    )
};

export default TransactionModal;