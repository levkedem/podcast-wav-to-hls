import "./App.css";
import { PrimeReactProvider, PrimeReactContext } from "primereact/api";
import ConvertWavPage from "./pages/ConverWavPage";
import { ToastContainer } from "react-toastify";

function App() {
  return (
    <PrimeReactProvider>
      <PrimeReactContext.Consumer>
        {() => <ConvertWavPage />}
      </PrimeReactContext.Consumer>
      <ToastContainer />
    </PrimeReactProvider>
  );
}

export default App;
