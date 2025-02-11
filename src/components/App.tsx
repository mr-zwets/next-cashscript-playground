// Components
import React, { useEffect, useState } from 'react';
import { Artifact, MockNetworkProvider, NetworkProvider } from 'cashscript';
import Header from './Header'
import Main from './Main'
import Footer from './Footer';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import WalletInfo from './Wallets';
import { Wallet, ContractInfo } from './shared';
import NewContract from './NewContract';
import Contracts from './Contracts';
import TransactionBuilder from './TransactionBuilder';

function App() {
  const [provider, setProvider] = useState<NetworkProvider>(new MockNetworkProvider())
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [artifacts, setArtifacts] = useState<Artifact[] | undefined>(undefined);
  const [contracts, setContracts] = useState<ContractInfo[] | undefined>(undefined)
  const [code, setCode] = useState<string>(
`pragma cashscript ~0.11.0;
    
contract TransferWithTimeout(pubkey sender, pubkey recipient, int timeout) {
    // Require recipient's signature to match
    function transfer(sig recipientSig) {
        require(checkSig(recipientSig, recipient));
    }
    
    // Require timeout time to be reached and sender's signature to match
    function timeout(sig senderSig) {
        require(checkSig(senderSig, sender));
        require(tx.time >= timeout);
    }
}
`);

  useEffect(() => {
    updateAllUtxosContracts()
  }, [provider])

  async function updateUtxosContract(nameContract: string) {
    const contractIndex = contracts?.findIndex(contractInfo => contractInfo.contract.name == nameContract)
    if (contractIndex == undefined) return
    const currentContract = contracts?.[contractIndex].contract
    if (!currentContract) return
    // create a separate lists for utxos and mutate entry
    const utxosList = contracts.map(contract => contract.utxos ?? [])
    const contractUtxos = await provider.getUtxos(currentContract.address);
    utxosList[contractIndex] = contractUtxos
    // map is the best way to deep clone array of complex objects
    const newContracts: ContractInfo[] = contracts.map((contractInfo,index) => (
      { ...contractInfo, utxos:utxosList[index] }
    ))
    setContracts(newContracts)
  }

  async function updateAllUtxosContracts () {
    if(!contracts) return

    const utxosPromises = contracts.map(contractInfo => {
      const contractUtxos = provider.getUtxos(contractInfo.contract.address);
      return contractUtxos ?? []
    })
    const utxosContracts = await Promise.all(utxosPromises)
    // map is the best way to deep clone array of complex objects
    const newContracts: ContractInfo[] = contracts.map((contractInfo,index) => (
      { ...contractInfo, utxos:utxosContracts?.[index]}
    ))
    setContracts(newContracts)
  }

  return (
    <>
      <div className="App" style={{ backgroundColor: '#eee', color: '#000', padding: '0px 32px' }}>
        <Header />
        <Tabs
          defaultActiveKey="editor"
          id="uncontrolled-tab-example"
          className="mb-2 mt-4 justify-content-center"
          style={{ display: "inline-flex", marginLeft: "calc(100vw - 1100px)" }}
        >
          <Tab eventKey="editor" title="Editor">
            <Main code={code} setCode={setCode} artifacts={artifacts} setArtifacts={setArtifacts} provider={provider} setProvider={setProvider} setContracts={setContracts} updateAllUtxosContracts={updateAllUtxosContracts}/>
          </Tab>
          <Tab eventKey="newcontract" title="New Contract">
            <NewContract artifacts={artifacts} provider={provider} setProvider={setProvider} contracts={contracts} setContracts={setContracts} updateUtxosContract={updateUtxosContract} />
          </Tab>
          <Tab eventKey="contracts" title="Contracts">
            <Contracts provider={provider} contracts={contracts} setContracts={setContracts} updateUtxosContract={updateUtxosContract} />
          </Tab>
          <Tab eventKey="wallets" title="Wallets">
            <WalletInfo provider={provider} wallets={wallets} setWallets={setWallets}/>
          </Tab>
          <Tab eventKey="transactionBuilder" title="TransactionBuilder">
            <TransactionBuilder provider={provider} wallets={wallets} contracts={contracts} updateUtxosContract={updateUtxosContract}/>
          </Tab>
        </Tabs>
      </div>
      <Footer />
    </>
  );
}

export default App;
