/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from 'react';
import useStore from '@/store';
import Spinner from '../components/Spinner';
import TransactionModal from './TransactionModal';


const TransactionsCard = () => {
    const { state, selectTransaction, pollExchanges } = useStore(); // Assuming store hooks in React
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Derived state
  const transactions = useMemo(() => state.transactions, [state.transactions]);
  const transactionsLoading = useMemo(() => state.transactionsLoading, [state.transactionsLoading]);

  useEffect(() => {
    console.log('Polling exchanges...');
    pollExchanges();
  }, []);

  const openTransactionModal = (transaction: any) => {
    setSelectedTransaction(transaction);
    selectTransaction(transaction);
  };

  const closeTransactionModal = () => {
    setSelectedTransaction(null);
    selectTransaction(null);
  };

  const getStatusString = (exchange: any) => {
    switch (exchange.status) {
      case 'rfq':
        return `Requested ${exchange.payinAmount} ${exchange.payinCurrency}`;
      case 'quote':
        return `Quoted ${exchange.payinAmount} ${exchange.payinCurrency}`;
      case 'order':
        return `Payment for ${exchange.payinAmount} ${exchange.payinCurrency} submitted`;
      case 'orderstatus':
        return `Payment processing for ${exchange.payinAmount} ${exchange.payinCurrency}...`;
      case 'completed':
        return `Sent ${exchange.payinAmount} ${exchange.payinCurrency}`;
      case 'expired':
        return `Quote for ${exchange.payinAmount} ${exchange.payinCurrency} expired`;
      case 'cancelled':
        return `Exchange for ${exchange.payinAmount} ${exchange.payinCurrency} was cancelled`;
      case 'failed':
        return `Payment for ${exchange.payinAmount} ${exchange.payinCurrency} failed`;
      default:
        return exchange.status;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Transactions</h2>
      <div>
        {transactions.length > 0 ? (
          <ul>
            {transactions.map((transaction) => (
              <li
                key={transaction.id}
                onClick={() => openTransactionModal(transaction)}
                className="flex items-center justify-between rounded-lg bg-gray-100 dark:bg-gray-800 p-4 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer mb-2"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-full p-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-5 h-5 text-gray-500 dark:text-gray-400"
                    >
                      <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
                      <path d="M22 2L11 13"></path>
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">{getStatusString(transaction)}</div>
                    <div className="text-gray-500 dark:text-gray-400 text-sm">
                      {new Date(transaction.createdTime).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </div>
                  </div>
                </div>
                {transaction.status === 'quote' && (
                  <div className="w-1/5 flex items-center justify-end">
                    {/* Optionally you can add some action or label here */}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-gray-500">
            {transactionsLoading ? <Spinner /> : <p>No transactions available</p>}
          </div>
        )}
      </div>
      {selectedTransaction && (
        <TransactionModal
          transaction={selectedTransaction}
          onClose={closeTransactionModal}
        />
      )}
    </div>
  );
};


export default TransactionsCard;