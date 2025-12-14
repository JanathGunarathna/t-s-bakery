import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";  

import Welcome from './pages/welcome';
import SelectionPage from './pages/selectionPage';
import PriceManagementPage from './pages/PriceManagementPage'
import SummaryPage from './pages/summaryPage'

function App() {
  return (
    <Router> 
      <div className="App">
        <header className="App-header">
          <Routes>
            <Route path="/" element={<Welcome/>} />
            <Route path="/selection" element={<SelectionPage/>}/>
            <Route path="/addPrice" element={<PriceManagementPage/>}/>
            <Route path="/summary" element={<SummaryPage/>}/>
          </Routes>
        </header>
      </div>
    </Router>
  );
}

export default App;