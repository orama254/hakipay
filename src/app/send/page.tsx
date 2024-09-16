"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Spinner from '@/components/Spinner';
import useStore from '@/store';


export default function Send() {

    const router = useRouter();
  const { state, setOffering, createExchange, formatAmount, filterOfferings, satisfiesOfferingRequirements, getOfferingById } = useStore();

  const [step, setStep] = useState(1);
  const [fromCurrency, setFromCurrency] = useState<any>();
  const [toCurrency, setToCurrency] = useState<any>();
  const [isToCurrencyEnabled, setIsToCurrencyEnabled] = useState(false);
  const [offering, setOfferingState] = useState<any>();
  const [amount, setAmount] = useState('');
  const [theyGet, setTheyGet] = useState('');
  const [paymentDetails, setPaymentDetails] = useState({});
  const [filteredOfferings, setFilteredOfferings] = useState<any[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);

  const needsCredentials = useMemo(() => !satisfiesOfferingRequirements(offering, state.customerCredentials), [offering, state.customerCredentials]);

  const isAmountValid = useMemo(() => {
    if (!offering) return true;
    const min = offering?.data?.payin?.min;
    const max = offering?.data?.payin?.max;
    return amount >= min && amount <= max;
  }, [offering, amount]);

  useEffect(() => {
    updateToCurrencies();
  }, [fromCurrency]);

  useEffect(() => {
    checkExistingSelectedOffering();
  }, [state.payinCurrencies]);

  const updateToCurrencies = () => {
    if (fromCurrency) {
      const relevantOfferings = state.offerings.filter(offering => offering.data.payin.currencyCode === fromCurrency);
      const payoutCurrencies = new Set();
      relevantOfferings.forEach(offering => payoutCurrencies.add(offering.data.payout.currencyCode));
      state.payoutCurrencies = Array.from(payoutCurrencies) as string[];
      setIsToCurrencyEnabled(true);
    } else {
      state.payoutCurrencies = [];
      setIsToCurrencyEnabled(false);
    }
  };

  const getFilteredOfferings = () => {
    if (fromCurrency && toCurrency) {
      setFilteredOfferings(filterOfferings(fromCurrency, toCurrency) as any[]);
    }
  };

  const selectOffering = (selectedOffering: any) => {
    setOfferingState(selectedOffering);
    setOffering(selectedOffering);
    verifyCredentials();
    setStep(2);
  };

  const calculateTheyGet = () => {
    if (amount && offering) {
      setTheyGet(formatAmount(amount * offering.data.payoutUnitsPerPayinUnit));
    }
  };

  const validateAndSubmit = () => {
    if (!amount) {
      alert('Please enter the amount.');
      return;
    }

    for (const key in offering.data.payout.methods[0].requiredPaymentDetails.properties) {
      if (!paymentDetails[key]) {
        alert(`Please enter ${offering.data.payout.methods[0].requiredPaymentDetails.properties[key].title}.`);
        return;
      }

      const offeringDetailsPattern = offering.data.payout.methods[0].requiredPaymentDetails.properties[key].pattern;
      if (offeringDetailsPattern && !paymentDetails[key].match(offeringDetailsPattern)) {
        alert(`Please enter a valid ${offering.data.payout.methods[0].requiredPaymentDetails.properties[key].title}.`);
        return;
      }
    }

    submitRequest();
  };

  const submitRequest = async () => {
    setSubmitLoading(true);
    await createExchange(offering, amount, paymentDetails);
    router.push('/');
  };

  const verifyCredentials = () => {
    if (needsCredentials) {
      localStorage.setItem('selectedOffering', JSON.stringify(offering));
      router.push('/credentials');
    }
  };

  const checkExistingSelectedOffering = () => {
    if (localStorage.getItem('selectedOffering')) {
      const offeringObject = JSON.parse(localStorage.getItem('selectedOffering'));
      setOfferingState(getOfferingById(offeringObject.metadata.id));
      localStorage.removeItem('selectedOffering');
      setStep(2);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-100 dark:bg-gray-800 py-8 px-6 md:px-8">
        <div className="max-w-3xl mx-auto grid gap-8">
          {/* Step 1: Select From and To Currencies, Display Offerings */}
          {step === 1 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4 dark:text-white">Send Money</h2>
              {state.payinCurrencies.length > 0 ? (
                <>
                  <div className="mb-4">
                    <label className="block text-gray-700 dark:text-gray-300 mb-2">From Currency</label>
                    <select
                      value={fromCurrency}
                      onChange={(e) => setFromCurrency(e.target.value)}
                      className="w-full p-2 border rounded"
                    >
                      <option disabled value="">
                        Select currency
                      </option>
                      {state.payinCurrencies.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 dark:text-gray-300 mb-2">To Currency</label>
                    <select
                      value={toCurrency}
                      onChange={(e) => setToCurrency(e.target.value)}
                      className="w-full p-2 border rounded"
                      disabled={!isToCurrencyEnabled}
                    >
                      <option disabled value="">
                        Select currency
                      </option>
                      {state.payoutCurrencies.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={getFilteredOfferings}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:bg-gray-800 dark:text-white border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                  >
                    Get Offerings
                  </button>
                </>
              ) : (
                <Spinner />
              )}

              {filteredOfferings.length > 0 && (
                <div className="mt-4 dark:text-white">
                  <h2 className="text-2xl font-bold mb-4">Exchange Rate Offerings</h2>
                  <ul>
                    {filteredOfferings.map((offering) => (
                      <li
                        key={offering.id}
                        onClick={() => selectOffering(offering)}
                        className="cursor-pointer p-4 border rounded mb-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        <h3 className="font-bold">{state.pfiAllowlist.find((pfi) => pfi.pfiUri === offering.metadata.from)?.pfiName}</h3>
                        <p>{offering.data.description}</p>
                        <p className="text-blue-500">
                          {offering.data.payoutUnitsPerPayinUnit} {offering.data.payout.currencyCode} for 1 {offering.data.payin.currencyCode}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Enter Transaction Details */}
          {step === 2 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4 dark:text-white">Enter Transaction Details</h2>
              <div className="mb-4">
                {!isAmountValid && amount !== '' && (
                  <p className="text-red-500 mt-2">Amount must be between {offering?.data?.payin?.min} and {offering?.data?.payin?.max}</p>
                )}
                <label className="block text-gray-700 dark:text-gray-300 mb-2">You Send ({offering?.data?.payin?.currencyCode})</label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onInput={calculateTheyGet}
                  type="number"
                  required
                  className={`w-full p-2 border rounded disabled:bg-slate-200 ${!isAmountValid && amount !== '' ? 'border-red-500' : ''}`}
                  disabled={needsCredentials}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-2">They Get ({offering?.data?.payout?.currencyCode})</label>
                <input value={theyGet} type="number" disabled className="w-full p-2 border rounded disabled:bg-slate-200" />
              </div>
              <div className="mb-4 text-gray-700 dark:text-gray-300">
                Exchange Rate: {offering?.data?.payoutUnitsPerPayinUnit} {offering?.data?.payout?.currencyCode} for 1 {offering?.data?.payin?.currencyCode}
              </div>

              {Object.entries(offering?.data?.payout?.methods[0]?.requiredPaymentDetails?.properties || {}).map(([key, detail]) => (
                <div key={key} className="mb-4">
                  <label htmlFor={key} className="block text-gray-700 dark:text-gray-300 mb-2">{detail.title}</label>
                  <input
                    value={paymentDetails[key] || ''}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, [key]: e.target.value })}
                    id={key}
                    type={detail.type}
                    pattern={detail.pattern}
                    required
                    className="w-full p-2 border rounded disabled:bg-slate-200"
                    disabled={needsCredentials}
                  />
                  <small className="block text-gray-500 dark:text-gray-400">{detail.description}</small>
                </div>
              ))}

              <p className="text-xs text-green-400 mb-2 flex">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="green" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Required credentials available.
              </p>

              {needsCredentials ? (
                <button
                  onClick={() => router.push('/credentials')}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:bg-slate-400 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 mr-2 dark:text-white"
                >
                  Verify Identity
                </button>
              ) : (
                <button
                  onClick={validateAndSubmit}
                  disabled={submitLoading}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:bg-slate-400 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 dark:text-white"
                >
                  {submitLoading ? <Spinner /> : 'Request for Quote'}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}