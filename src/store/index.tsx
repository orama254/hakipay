/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback} from 'react';
import { Close, Order, Rfq, TbdexHttpClient, Offering } from '@tbdex/http-client';
import { DidDht } from '@web5/dids';
import { Jwt, PresentationExchange } from '@web5/credentials';


type ProviderDid = {
  uri: string;
  name: string;
  description: string;
};

const mockProviderDids: Record<string, ProviderDid> = {
    aquafinance_capital: {
      uri: 'did:dht:3fkz5ssfxbriwks3iy5nwys3q5kyx64ettp9wfn1yfekfkiguj1y',
      name: 'AquaFinance Capital',
      description: 'Your trusted exchange partner of global transactions.',
    },
    flowback_solutions: {
      uri: 'did:dht:zkp5gbsqgzn69b3y5dtt5nnpjtdq6sxyukpzo68npsf79bmtb9zy',
      name: 'Flowback Financial',
      description: 'Your trusted exchange partner of global transactions.',
    },
    vertex_liquid_assets: {
        uri: 'did:dht:enwguxo8uzqexq14xupe4o9ymxw3nzeb9uug5ijkj9rhfbf1oy5y',
        name: 'Vertex Liquid Assets',
        description: 'Your trusted exchange partner of global transactions.',
    },
    titanium_trust: {
        uri: 'did:dht:ozn5c51ruo7z63u1h748ug7rw5p1mq3853ytrd5gatu9a8mm8f1o',
        name: 'Titanium Trust',
        description: 'Your trusted exchange partner of global transactions.',
    },
  };


const useStore = () => {
    const [state, setState] = useState<{
        balance: number;
        transactions: any[];
        transactionsLoading: boolean;
        pfiAllowlist: { pfiUri: string; pfiName: string; pfiDescription: string; }[];
        selectedTransaction: any | null;
        offering: any | null;
        payinCurrencies: string[];
        payoutCurrencies: string[];
        offerings: Offering[];
        customerDid: any | null;
        customerCredentials: any[];
      }>({
        balance: parseFloat(localStorage.getItem('walletBalance') || '0') || 100,
        transactions: [],
        transactionsLoading: true,
        pfiAllowlist: Object.keys(mockProviderDids).map((key) => ({
          pfiUri: mockProviderDids[key].uri,
          pfiName: mockProviderDids[key].name,
          pfiDescription: mockProviderDids[key].description,
        })),
        selectedTransaction: null,
        offering: null,
        payinCurrencies: [],
        payoutCurrencies: [],
        offerings: [],
        customerDid: null,
        customerCredentials: [],
      });
    
      const updateCurrencies = () => {
        const payinCurrencies = new Set();
        const payoutCurrencies = new Set();
    
        state.offerings.forEach((offering) => {
          payinCurrencies.add(offering.data.payin.currencyCode);
          payoutCurrencies.add(offering.data.payout.currencyCode);
        });
    
        setState((prevState) => ({
          ...prevState,
          payinCurrencies: Array.from(payinCurrencies),
          payoutCurrencies: Array.from(payoutCurrencies),
        }));
      };

      const fetchOfferings = useCallback(async () => {
        try {
          const allOfferings: Offering[] = [];
          for (const pfi of state.pfiAllowlist) {
            const pfiUrl = pfi.pfiUri;
            const offerings: Offering[] = await TbdexHttpClient.getOfferings({
                pfiDid: pfiUrl
            });
            allOfferings.push(...offerings);
          }
    
          setState((prevState) => ({
            ...prevState,
            offerings: allOfferings,
          }));
          updateCurrencies();
        } catch (error) {
          console.error('Failed to fetch offerings:', error);
        }
      }, [
        state.pfiAllowlist,
      ]);
    
      const createExchange = async (offering: any, amount: number | any, payoutPaymentDetails: any) => {

        const selectedCredentials = PresentationExchange.selectCredentials({
            vcJwts: state.customerCredentials,
            presentationDefinition: offering.data.requiredClaims,
        });

        const rfq = Rfq.create({
            metadata: {
              from: state.customerDid.uri,
              to: offering.metadata.from,
              protocol: '1.0'
            },
            data: {
              offeringId: offering.id,
              payin: {
                amount: amount.toString(),
                kind: offering.data.payin.methods[0].kind,
                paymentDetails: {}
              },
              payout: {
                kind: offering.data.payout.methods[0].kind,
                paymentDetails: payoutPaymentDetails
              },
              claims: selectedCredentials
            },
          })
    
        try {
            rfq.verifyOfferingRequirements(offering)
          console.log('RFQ:', rfq);
          // Submit RFQ to the PFI
        } catch (error) {
          console.error('Requirements not met:', error);
        }

        await rfq.sign(state.customerDid)
        console.log('RFQ:', rfq);

        try {
            await TbdexHttpClient.createExchange(rfq)
        } catch (error) {
            console.error('Failed to create exchange:', error);
        }

      };
    
      const fetchExchanges = async (pfiUri: string) => {
        try {
            const exchanges = await TbdexHttpClient.getExchanges({
                pfiDid: pfiUri,
                did: state.customerDid
              });
        
              const mappedExchanges = formatMessages(exchanges)
              return mappedExchanges
        } catch (error) {
          console.error('Failed to fetch exchanges:', error);
        }
      };
    
      const addClose = async (pfiUri: string, reason: string) => {
        const close = Close.create({
            metadata: {
              from: state.customerDid.uri,
              to: pfiUri,
              exchangeId,
            },
            data: {
              reason
            }
          })
      
          await close.sign(state.customerDid)
        try {
            await TbdexHttpClient.submitClose(close)
        } catch (error) {
          console.error('Failed to close exchange:', error);
        }
      };
    
      const addOrder = async (exchangeId: string, pfiUri: string) => {
        const order = Order.create({
            metadata: {
              from: state.customerDid.uri,
              to: pfiUri,
              exchangeId
            }
          })
      
          await order.sign(state.customerDid); // Create and send Order message
        try {
            return await TbdexHttpClient.submitOrder(order)
        } catch (error) {
          console.error('Failed to submit order:', error);
        }
      };
    
      const pollExchanges = () => {
        const fetchAllExchanges = async () => {
          console.log('Polling exchanges again...');
          if (!state.customerDid) return;
          const allExchanges = [];
    
          try {
            for (const pfi of state.pfiAllowlist) {
              const exchanges = await fetchExchanges(pfi.pfiUri);
              allExchanges.push(...exchanges);
            }
    
            console.log('All exchanges:', allExchanges);
            updateExchanges(allExchanges.reverse());
            setState((prevState) => ({ ...prevState, transactionsLoading: false }));
          } catch (error) {
            console.error('Failed to fetch exchanges:', error);
          }
        };
    
        fetchAllExchanges();
        setInterval(fetchAllExchanges, 5000); // Poll every 5 seconds
      };
    
      const initializeDid = async () => {
        try {
          const storedDid = localStorage.getItem('customerDid');
          let customerDid;
    
          if (storedDid) {
            customerDid = await DidDht.import({ portableDid: JSON.parse(storedDid) });
          } else {
            customerDid = await DidDht.create({ options: { publish: true } });
            const exportedDid = await customerDid.export();
            localStorage.setItem('customerDid', JSON.stringify(exportedDid));
          }
    
          setState((prevState) => ({ ...prevState, customerDid }));
        } catch (error) {
          console.error('Failed to initialize DID:', error);
        }
      };
    
      const formatMessages = (exchanges: any[]) => {
        return exchanges.map((exchange) => {
          const latestMessage = exchange[exchange.length - 1];
          const rfqMessage = exchange.find((message: any) => message.kind === 'rfq');
          const quoteMessage = exchange.find((message: any) => message.kind === 'quote');
          const status = generateExchangeStatusValues(latestMessage);
    
          return {
            id: latestMessage.metadata.exchangeId,
            payinAmount: quoteMessage.data['payin']?.['amount'],
            payoutAmount: quoteMessage?.data['payout']?.['amount'],
            status,
            createdTime: rfqMessage.createdAt,
            to: 'You',
            pfiDid: rfqMessage.metadata.to,
          };
        });
      };
    
      const loadCredentials = () => {
        const storedCredentials = localStorage.getItem('customerCredentials');
        if (storedCredentials) {
          setState((prevState) => ({
            ...prevState,
            customerCredentials: JSON.parse(storedCredentials),
          }));
        }
      };
    
      const addCredential = (credential: any) => {
        const updatedCredentials = [...state.customerCredentials, credential];
        setState((prevState) => ({ ...prevState, customerCredentials: updatedCredentials }));
        localStorage.setItem('customerCredentials', JSON.stringify(updatedCredentials));
      };
    
      const renderCredential = (credentialJwt: any) => {
        const vc = Jwt.parse({ jwt: credentialJwt }).decoded.payload['vc'];
        return {
          title: (vc as any).type[(vc as any).type.length - 1].replace(/(?<!^)(?<![A-Z])[A-Z](?=[a-z])/g, ' $&'),
          name: (vc as any).credentialSubject['name'],
          countryCode: (vc as any).credentialSubject['countryOfResidence'],
          issuanceDate: new Date((vc as any).issuanceDate).toLocaleDateString(undefined, { dateStyle: 'medium' }),
        };
      };
    
      const generateExchangeStatusValues = (exchangeMessage: any) => {
        if (exchangeMessage instanceof Close) {
          if ((exchangeMessage?.data.reason ?? '').toLowerCase().includes('complete')) return 'completed';
          if ((exchangeMessage?.data.reason ?? '').toLowerCase().includes('expired')) return 'expired';
          if ((exchangeMessage?.data.reason ?? '').toLowerCase().includes('cancelled')) return 'cancelled';
          return 'failed';
        }
        return exchangeMessage.kind;
      };
    
      const renderOrderStatus = (exchange: any) => {
        const status = generateExchangeStatusValues(exchange);
        switch (status) {
          case 'rfq':
            return 'Requested';
          case 'quote':
            return 'Quoted';
          case 'order':
            return 'Pending';
          case 'completed':
            return 'Completed';
          case 'expired':
            return 'Expired';
          case 'cancelled':
            return 'Cancelled';
          case 'failed':
            return 'Failed';
          default:
            return status;
        }
      };

      const selectTransaction = (transaction: any) => {
        setState((prevState) => ({ ...prevState, selectedTransaction: transaction }));
      };

      const setOffering = (offering: Offering) => {
        setState((prevState) => ({ ...prevState, offering }));
      };

      const deductAmount = (amount: number) => {
        const updatedBalance = state.balance - amount;
        setState((prevState) => ({ ...prevState, balance: updatedBalance }));
        localStorage.setItem('walletBalance', updatedBalance.toString());

        return updatedBalance;
      };

      const formatAmount = (amount: number) => {
        if (Math.abs(amount) >= 1) {
          return amount.toFixed(2);
        }
    
        const precision = Math.abs(amount) >= 0.01 ? 4 : 6;
        return parseFloat(amount.toFixed(precision)).toString();
      };

      const getOfferingById = (offeringId: string) => {
        const selectedOffering = state.offerings.find((offering) => offering.id === offeringId);
        console.log('Selected offering:', selectedOffering);
        if (!selectedOffering) {
          throw new Error('Offering not found');
        }
        return selectedOffering;
      };


      const filterOfferings = (payinCurrency: string, payoutCurrency: string) => {
        return state.offerings.filter((offering) => {
          return offering.data.payin.currencyCode === payinCurrency && 
                 offering.data.payout.currencyCode === payoutCurrency;
        });
      };


      const satisfiesOfferingRequirements = (offering: Offering, credentials: any[]) => {
        if(credentials.length === 0 || !offering.data.requiredClaims) {
          return false;
        }
    
        try {
          // Validate customer's VCs against the offering's presentation definition
          PresentationExchange.satisfiesPresentationDefinition({
            vcJwts: credentials,
            presentationDefinition: offering.data.requiredClaims,
          })
          return true
        } catch (e) {
          return false
        }
      }
    
      const updateExchanges = (newTransactions: any[]) => {
        const updatedExchanges = [...state.transactions];
    
        newTransactions.forEach((newTx) => {
          const existingTxIndex = updatedExchanges.findIndex((tx) => tx.id === newTx.id);
          if (existingTxIndex > -1) {
            updatedExchanges[existingTxIndex] = newTx;
          } else {
            updatedExchanges.push(newTx);
          }
        });
    
        setState((prevState) => ({ ...prevState, transactions: updatedExchanges }));
      };
    
      useEffect(() => {
        fetchOfferings();
        initializeDid();
        loadCredentials();
      }, [
        // fetchOfferings,
        initializeDid,
        loadCredentials,
      ]);
    
      return {
        state,
        createExchange,
        fetchExchanges,
        selectTransaction,
        setOffering,
        formatAmount,
        deductAmount,
        filterOfferings,
        satisfiesOfferingRequirements,
        getOfferingById,
        addClose,
        addOrder,
        pollExchanges,
        renderOrderStatus,
        addCredential,
        renderCredential,
      };
};


export default useStore;